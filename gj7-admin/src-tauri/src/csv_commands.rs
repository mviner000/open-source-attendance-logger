// src/csv_commands.rs
use uuid::Uuid;
use std::path::Path;
use tauri::{State, command};
use crate::DbState;
use crate::db::csv_import::CsvValidationResult;
use crate::db::csv_transform::{CsvTransformer, batch_transform_records};
use crate::db::school_accounts::SchoolAccount;
use crate::redis_csv_processor::RedisCsvProcessor;
use crate::db::csv_import::ValidationErrorType;
use crate::logger::{emit_log, LogMessage};
use std::sync::Arc;
use csv::StringRecord;
use log::{info, error};

#[derive(serde::Serialize, Debug)]
pub struct AccountStatusCounts {
    pub total_accounts: usize,
    pub activated_accounts: usize,
    pub deactivated_accounts: usize,

}


#[derive(serde::Serialize, Debug, Clone)] 
pub struct ExistingAccountInfo {
    pub existing_accounts: Vec<SchoolAccount>,
    pub new_accounts_count: usize,
    pub existing_accounts_count: usize,
}

#[derive(serde::Serialize)]

pub struct CsvImportResponse {
    validation_result: CsvValidationResult,
    total_processed: usize,
    successful_imports: usize,
    failed_imports: usize,
    error_details: Vec<String>,
    existing_account_info: Option<ExistingAccountInfo>,
    account_status_counts: Option<AccountStatusCounts>, // New field

}

#[derive(serde::Serialize, Debug)]
pub struct ValidationErrorDetails {
    row_number: usize,
    field: Option<String>,
    error_type: ValidationErrorType,
    error_message: String,
}

#[command]
pub async fn check_existing_accounts(
    state: State<'_, DbState>,
    file_path: String
) -> Result<ExistingAccountInfo, String> {
    let path = Path::new(&file_path);
    
    // Prepare CSV reader
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    
    // Get headers for transformer
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?;
    
    // Create transformer with connection and headers
    let transformer = CsvTransformer::new(&headers, Arc::new(DbState(state.0.clone())));
    
    // Collect records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Prepare to track existing and new accounts
    let mut existing_accounts = Vec::new();
    let mut new_accounts_count = 0;
    
    // Process records in batches
    let batch_size = 100;
    let batched_records = batch_transform_records(&transformer, &records, batch_size);
    
    for batch in batched_records {
        // Use with_connection for each batch
        state.0.with_connection(|conn| {
            for result in batch {
                match result {
                    Ok(account_request) => {
                        // Check if account exists
                        match state.0.school_accounts.get_school_account_by_school_id(conn, &account_request.school_id) {
                            Ok(existing_account) => {
                                existing_accounts.push(existing_account);
                            },
                            Err(_) => {
                                new_accounts_count += 1;
                            }
                        }
                    },
                    Err(_) => continue,
                }
            }
            Ok(())
        }).await.map_err(|e| format!("Database error: {}", e))?;
    }
    
    Ok(ExistingAccountInfo {
        existing_accounts: existing_accounts.clone(),
        new_accounts_count,
        existing_accounts_count: existing_accounts.len(),
    })
}

#[command]
pub async fn validate_csv_file(
    state: State<'_, DbState>,
    file_path: String
) -> Result<CsvValidationResult, Vec<ValidationErrorDetails>> {
    let path = Path::new(&file_path);
    
    // Option 1: Use serial validator
    // let validator = state.0.create_csv_validator();
    
    // Option 2: Use parallel validator
    let validator = state.0.create_parallel_csv_validator();
    
    match validator.validate_file(path) {
        Ok(validation_result) => Ok(validation_result),
        Err(validation_errors) => Err(
            validation_errors.into_iter()
                .map(|error| ValidationErrorDetails {
                    row_number: error.row_number,
                    field: error.field,
                    error_type: error.error_type,
                    error_message: error.error_message,
                })
                .collect()
        )
    }
}


#[command]
pub async fn import_csv_file(
    app_handle: tauri::AppHandle,
    state: State<'_, DbState>,
    file_path: String,
    last_updated_semester_id: Uuid,
    force_update: bool
) -> Result<CsvImportResponse, String> {
    let path = Path::new(&file_path);
    
    // First validate the file using the parallel validator
    let validation_result = state.0.create_parallel_csv_validator()
        .validate_file(path)
        .map_err(|errors| format!("Validation failed: {:?}", errors))?;
    
    // Prepare CSV reader and headers
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?;
    
    // Create transformer
    let transformer = CsvTransformer::new(&headers, Arc::new(DbState(state.0.clone())));
    
    // Collect records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Get counts before deactivation
    let (total_accounts_before, active_accounts_before) = state.0.with_connection(|conn| {
        let total = conn.query_row(
            "SELECT COUNT(*) FROM school_accounts",
            [],
            |row| row.get::<_, usize>(0)
        )?;
        let active = conn.query_row(
            "SELECT COUNT(*) FROM school_accounts WHERE is_active = 1",
            [],
            |row| row.get::<_, usize>(0)
        )?;
        Ok((total, active))
    }).await.map_err(|e| format!("Failed to get account counts: {}", e))?;
    
    // Deactivate all accounts
    state.0.with_connection(|conn| {
        conn.execute("UPDATE school_accounts SET is_active = 0", [])
    }).await.map_err(|e| format!("Failed to deactivate accounts: {}", e))?;
    
    // Process records
    let mut total_processed = 0;
    let mut successful_imports = 0;
    let mut failed_imports = 0;
    let mut error_details = Vec::new();
    let mut existing_accounts = Vec::new();
    let mut school_ids_to_activate = Vec::new();
    
    // Process in batches
    let batch_size = 100;
    let batched_records = batch_transform_records(&transformer, &records, batch_size);
    
    for batch in batched_records {
        state.0.with_connection(|conn| {
            for result in batch {
                total_processed += 1;
                
                match result {
                    Ok(mut account_request) => {
                        school_ids_to_activate.push(account_request.school_id.clone());
                        account_request.last_updated_semester_id = Some(last_updated_semester_id);
                        
                        match state.0.school_accounts.get_school_account_by_school_id(conn, &account_request.school_id) {
                            Ok(existing_account) => {
                                if force_update {
                                    match state.0.school_accounts.update_school_account(
                                        conn,
                                        existing_account.id,
                                        account_request.clone().into()
                                    ) {
                                        Ok(updated_account) => {
                                            successful_imports += 1;
                                            existing_accounts.push(updated_account);
                                        },
                                        Err(e) => {
                                            failed_imports += 1;
                                            error_details.push(format!("Update failed for {}: {}", account_request.school_id, e));
                                        }
                                    }
                                } else {
                                    failed_imports += 1;
                                    error_details.push(format!("Account with school_id {} already exists", account_request.school_id));
                                }
                            },
                            Err(_) => {
                                match state.0.school_accounts.create_school_account(conn, account_request.clone()) {
                                    Ok(_) => successful_imports += 1,
                                    Err(e) => {
                                        failed_imports += 1;
                                        error_details.push(format!("Import failed: {}", e));
                                    }
                                }
                            }
                        }
                    },
                    Err(e) => {
                        failed_imports += 1;
                        error_details.push(format!("Transform error: {}", e));
                    }
                }
            }
            Ok(())
        }).await.map_err(|e| format!("Database error: {}", e))?;
    }
    
    // Activate imported accounts
    if !school_ids_to_activate.is_empty() {
        state.0.with_connection(|conn| {
            let placeholders = school_ids_to_activate.iter().map(|_| "?").collect::<Vec<&str>>().join(",");
            let activate_query = format!(
                "UPDATE school_accounts SET is_active = 1 WHERE school_id IN ({})",
                placeholders
            );
            
            let params: Vec<&dyn rusqlite::ToSql> = school_ids_to_activate.iter()
                .map(|id| id as &dyn rusqlite::ToSql)
                .collect();
            
            conn.execute(&activate_query, params.as_slice())
        }).await.map_err(|e| format!("Failed to activate accounts: {}", e))?;
    }
    
    // Get final counts
    let (total_accounts_after, activated_accounts) = state.0.with_connection(|conn| {
        let total = conn.query_row(
            "SELECT COUNT(*) FROM school_accounts",
            [],
            |row| row.get::<_, usize>(0)
        )?;
        let active = conn.query_row(
            "SELECT COUNT(*) FROM school_accounts WHERE is_active = 1",
            [],
            |row| row.get::<_, usize>(0)
        )?;
        Ok((total, active))
    }).await.map_err(|e| format!("Failed to get final counts: {}", e))?;
    
    let deactivated_accounts = total_accounts_after - activated_accounts;
    
    Ok(CsvImportResponse {
        validation_result: validation_result,
        total_processed,
        successful_imports,
        failed_imports,
        error_details,
        existing_account_info: Some(ExistingAccountInfo {
            existing_accounts: existing_accounts.clone(), // Clone the vector
            new_accounts_count: total_processed - existing_accounts.len(),
            existing_accounts_count: existing_accounts.len(),
        }),
        account_status_counts: Some(AccountStatusCounts {
            total_accounts: total_accounts_after,
            activated_accounts,
            deactivated_accounts,
        }),
    })
}

#[command]
pub async fn import_csv_file_parallel(
    app_handle: tauri::AppHandle,
    state: State<'_, DbState>,
    file_path: String,
    last_updated_semester_id: Uuid,
    force_update: bool,
) -> Result<CsvImportResponse, String> {
    // Get multiple connections from the pool
    let validator_conn = state.0.pool.get()
        .map_err(|e| format!("Failed to get validator connection: {}", e))?;
    let deactivate_conn = state.0.pool.get()
        .map_err(|e| format!("Failed to get deactivate connection: {}", e))?;
    let main_conn = state.0.pool.get()
        .map_err(|e| format!("Failed to get main connection: {}", e))?;
    let check_conn = state.0.pool.get()
        .map_err(|e| format!("Failed to get check connection: {}", e))?;
    
    // Create validator with the connection
    let validator = state.0.create_parallel_csv_validator();
    let validation_result = validator.validate_file(Path::new(&file_path))
        .map_err(|errors| format!("Validation failed: {:?}", errors))?;
    
    // Read CSV file
    let mut rdr = csv::Reader::from_path(&file_path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?
        .clone();
    let records: Vec<StringRecord> = rdr.records()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error reading CSV records: {}", e))?;
    
    // Collect school_ids from the CSV
    let school_ids: Vec<String> = records.iter()
        .filter_map(|record| record.get(0))
        .map(String::from)
        .collect();
    
    // Deactivate accounts not in CSV
    if !school_ids.is_empty() {
        let placeholders = school_ids.iter().map(|_| "?").collect::<Vec<&str>>().join(",");
        let deactivate_query = format!(
            "UPDATE school_accounts SET is_active = 0 WHERE school_id NOT IN ({})",
            placeholders
        );

        deactivate_conn.execute(
            &deactivate_query, 
            school_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect::<Vec<_>>().as_slice(),
        ).map_err(|e| format!("Failed to deactivate accounts not in CSV: {}", e))?;
    }

    // Get existing accounts info
    let existing_accounts = check_existing_accounts(state.clone(), file_path.clone())
        .await
        .map_err(|e| format!("Failed to check existing accounts: {}", e))?;

    // Redis setup
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());

    log::info!("REDIS is starting... URL: {}", redis_url);
        
    let redis_processor = RedisCsvProcessor::new(&redis_url, Some(1000), Some(50)).await
    .map_err(|e| format!("Failed to create Redis processor: {}", e))?;

    // Set up progress callback
    let app_handle_clone = app_handle.clone();
    let progress_callback = move |progress: f32| {
        emit_log(&app_handle_clone, LogMessage {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: "INFO".to_string(),
            message: format!("Processing progress: {:.1}%", progress * 100.0),
            target: "csv_import".to_string(),
        });
    };

    // Process the CSV data asynchronously with Redis using the new retry mechanism
    let processing_result = redis_processor.process_large_csv_in_chunks(&records, &headers, Some(2000))
    .await
    .map_err(|e| {
        log::debug!("CSV processing encountered an error: {}", e);
        e
    })?;
    
    // Use a new transaction for account activation/update
    let mut main_conn = state.0.pool.get()
        .map_err(|e| format!("Failed to get connection: {}", e))?;

    // Start a transaction
    let mut tx = main_conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut activated_accounts = 0;
    
    for record in &records {
        let school_id = record.get(0)
            .ok_or_else(|| "Invalid record: missing school_id".to_string())?;
        
        let transformer = CsvTransformer::new(&headers, Arc::new(DbState(state.0.clone())));
        
        match transformer.transform_record(record) {
            Ok(mut create_request) => {
                create_request.last_updated_semester_id = Some(last_updated_semester_id);
                
                match state.0.school_accounts.get_school_account_by_school_id(&check_conn, school_id) {
                    Ok(existing_account) => {
                        // Update existing account
                        state.0.school_accounts.update_school_account(
                            &tx, 
                            existing_account.id, 
                            create_request.clone().into(),
                        ).map_err(|e| format!("Failed to update account {}: {}", school_id, e))?;
                        
                        // Activate account
                        tx.execute(
                            "UPDATE school_accounts SET is_active = 1 WHERE id = ?1",
                            [&existing_account.id.to_string()],
                        ).map_err(|e| format!("Failed to activate account: {}", e))?;
                        
                        activated_accounts += 1;
                    },
                    Err(_) => {
                        // Create new account
                        state.0.school_accounts.create_school_account(&tx, create_request.clone())
                            .map_err(|e| format!("Failed to create account {}: {}", school_id, e))?;
                        
                        activated_accounts += 1;
                    }
                }
            },
            Err(e) => {
                return Err(format!("Transform error for {}: {}", school_id, e));
            }
        }
    }

    // Commit transaction
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // Count total accounts
    let total_accounts_after: usize = main_conn.query_row(
        "SELECT COUNT(*) FROM school_accounts",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to count total accounts: {}", e))?;
    
    let deactivated_accounts = total_accounts_after - activated_accounts;

    // Prepare response
    let import_response = CsvImportResponse {
        validation_result,
        total_processed: records.len(),
        successful_imports: processing_result.successful,
        failed_imports: processing_result.failed,
        error_details: processing_result.errors,
        existing_account_info: Some(existing_accounts),
        account_status_counts: Some(AccountStatusCounts {
            total_accounts: total_accounts_after,
            activated_accounts,
            deactivated_accounts,
        }),
    };
    
    info!("CSV import completed: {} total, {} successful, {} failed, Semester={}, Force Update={}", 
        records.len(), processing_result.successful, processing_result.failed, last_updated_semester_id, force_update);
    
    info!("Account Status Counts:");
    info!("  Total Accounts: {}", total_accounts_after);
    info!("  Activated Accounts: {}", activated_accounts);
    info!("  Deactivated Accounts: {}", deactivated_accounts);
    
    Ok(import_response)
}
