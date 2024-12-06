// src/csv_commands.rs
use uuid::Uuid;
use std::path::Path;
use tauri::{State, command};
use crate::DbState;
use crate::db::csv_import::{CsvValidator, CsvValidationResult};
use crate::db::csv_transform::{CsvTransformer, batch_transform_records};
use crate::db::school_accounts::{SchoolAccount, CreateSchoolAccountRequest};
use crate::parallel_csv_processor::process_csv_with_progress;
use crate::parallel_csv_processor::ParallelCsvProcessor;
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
    error_type: String,
    error_message: String,
}

#[command]
pub async fn check_existing_accounts(
    state: State<'_, DbState>,
    file_path: String
) -> Result<ExistingAccountInfo, String> {
    let path = Path::new(&file_path);
    
    // Get a connection
    let conn = state.0.get_cloned_connection();
    
    // Prepare CSV reader
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    
    // Get headers for transformer
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?;
    
    // Get another connection for the transformer
    let conn_transform = state.0.get_cloned_connection();
    
    // Create transformer with headers and connection
    let transformer = CsvTransformer::new(&headers, Arc::new(DbState(state.0.clone())));
    
    // Collect records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Batch transform records
    let batch_size = 100; // Configurable batch size
    let batched_records = batch_transform_records(&transformer, &records, batch_size);
    
    // Prepare to track existing and new accounts
    let mut existing_accounts = Vec::new();
    let mut new_accounts_count = 0;
    
    // Check each record
    for batch in batched_records {
        let conn = state.0.get_cloned_connection();
        
        for result in batch {
            match result {
                Ok(account_request) => {
                    // Check if account already exists
                    match state.0.school_accounts.get_school_account_by_school_id(&conn, &account_request.school_id) {
                        Ok(existing_account) => {
                            existing_accounts.push(existing_account);
                        },
                        Err(_) => {
                            // Account doesn't exist
                            new_accounts_count += 1;
                        }
                    }
                },
                Err(_) => {
                    // Skip transform errors for this check
                    continue;
                }
            }
        }
    }
    
    Ok(ExistingAccountInfo {
        existing_accounts: existing_accounts.clone(), // Create a clone to avoid move
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
    
    // Get a cloned connection
    let conn = state.0.get_cloned_connection();
    
    // Create validator with the connection
    let validator = CsvValidator::new(conn);
    
    info!("Attempting to validate CSV file: {}", file_path);
    
    match validator.validate_file(path) {
        Ok(result) => {
            info!("CSV file validation successful");
            Ok(result)
        },
        Err(errors) => {
            let serializable_errors: Vec<ValidationErrorDetails> = errors.into_iter().map(|error| {
                ValidationErrorDetails {
                    row_number: error.row_number,
                    field: error.field,
                    error_type: format!("{:?}", error.error_type),
                    error_message: error.error_message,
                }
            }).collect();
            
            error!("CSV file validation failed: {:?}", serializable_errors);
            Err(serializable_errors)
        }
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
    
    // Get a connection using get_connection_blocking or get_cloned_connection
    let conn = state.0.get_cloned_connection();
    
    // Pass the connection to CsvValidator
    let validator = CsvValidator::new(conn);
    
    // First, validate the file
    let validation_result = validator.validate_file(path)
        .map_err(|errors| format!("Validation failed: {:?}", errors))?;
    
    // Prepare CSV reader
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    
    // Get headers for transformer
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?;
    
    // Get another connection for the transformer
    let conn = state.0.get_cloned_connection();
    
    // Create transformer with headers and connection
    let transformer = CsvTransformer::new(&headers, Arc::new(DbState(state.0.clone())));
    
    // Collect records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Batch transform records
    let batch_size = 100; // Configurable batch size
    let batched_records = batch_transform_records(&transformer, &records, batch_size);
    
    // First, count total accounts before deactivation
    let conn = state.0.get_cloned_connection();
    let total_accounts_before: usize = conn.query_row(
        "SELECT COUNT(*) FROM school_accounts",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to count total accounts: {}", e))?;
    
    // Count active accounts before deactivation
    let active_accounts_before: usize = conn.query_row(
        "SELECT COUNT(*) FROM school_accounts WHERE is_active = 1",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to count active accounts: {}", e))?;
    
    // Deactivate all accounts
    conn.execute(
        "UPDATE school_accounts SET is_active = 0",
        []
    ).map_err(|e| format!("Failed to deactivate existing accounts: {}", e))?;
    
    // Collect school_ids from the CSV to be set as active
    let mut school_ids_to_activate = Vec::new();
    
    // Prepare to track import results
    let mut total_processed = 0;
    let mut successful_imports = 0;
    let mut failed_imports = 0;
    let mut error_details = Vec::new();
    let mut existing_accounts = Vec::new();

    // new implementation for reference
    emit_log(&app_handle, LogMessage {
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: "INFO".to_string(),
        message: format!("Importing CSV file: {}", file_path),
        target: "csv_import".to_string(),
    });
    
    // Perform import for each batch
    for batch in batched_records {
        let conn = state.0.get_cloned_connection();
        
        for result in batch {
            total_processed += 1;
            
            match result {
                Ok(mut account_request) => {
                    // Collect school_id for activation
                    school_ids_to_activate.push(account_request.school_id.clone());
                    
                    // Set the last_updated_last_updated_semester_id for each account
                    account_request.last_updated_semester_id = Some(last_updated_semester_id);
                    
                    // Check if account exists
                    match state.0.school_accounts.get_school_account_by_school_id(&conn, &account_request.school_id) {
                        Ok(existing_account) => {
                            // Account exists
                            if force_update {
                                // Update existing account
                                match state.0.school_accounts.update_school_account(
                                    &conn, 
                                    existing_account.id, 
                                    account_request.clone().into()
                                ) {
                                    Ok(updated_account) => {
                                        // Emit a log message for successful update
                                        emit_log(&app_handle, LogMessage {
                                            timestamp: chrono::Utc::now().to_rfc3339(),
                                            level: "INFO".to_string(),
                                            message: format!(
                                                "Successfully updated school account: ID={}, SchoolID={}",
                                                updated_account.id,
                                                updated_account.school_id
                                            ),
                                            target: "csv_import".to_string(),
                                        });
                                        
                                        successful_imports += 1;
                                        existing_accounts.push(updated_account);
                                    },
                                    Err(e) => {
                                        // Emit a log message for update failure
                                        emit_log(&app_handle, LogMessage {
                                            timestamp: chrono::Utc::now().to_rfc3339(),
                                            level: "ERROR".to_string(),
                                            message: format!(
                                                "Failed to update school account: SchoolID={}, Error={}",
                                                account_request.school_id,
                                                e
                                            ),
                                            target: "csv_import".to_string(),
                                        });
                                        
                                        failed_imports += 1;
                                        error_details.push(format!("Update failed for {}: {}", account_request.school_id, e));
                                    }
                                }
                            } else {
                                // Emit a log message for skipped update
                                emit_log(&app_handle, LogMessage {
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                    level: "WARN".to_string(),
                                    message: format!(
                                        "Skipped updating existing account: SchoolID={}",
                                        account_request.school_id
                                    ),
                                    target: "csv_import".to_string(),
                                });
                                
                                // Skip if not forced to update
                                failed_imports += 1;
                                error_details.push(format!("Account with school_id {} already exists", account_request.school_id));
                            }
                        },
                        Err(_) => {
                            // Account doesn't exist, create new
                            match state.0.school_accounts.create_school_account(&conn, account_request.clone()) {
                                Ok(new_account) => {
                                    // Emit a log message for successful account creation
                                    emit_log(&app_handle, LogMessage {
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                        level: "INFO".to_string(),
                                        message: format!(
                                            "Successfully created school account: ID={}, SchoolID={}",
                                            new_account.id,
                                            new_account.school_id
                                        ),
                                        target: "csv_import".to_string(),
                                    });
                                    
                                    successful_imports += 1;
                                },
                                Err(e) => {
                                    // Emit a log message for failed account creation
                                    emit_log(&app_handle, LogMessage {
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                        level: "ERROR".to_string(),
                                        message: format!(
                                            "Failed to create school account: SchoolID={}, Error={}",
                                            account_request.school_id,
                                            e
                                        ),
                                        target: "csv_import".to_string(),
                                    });
                                    
                                    failed_imports += 1;
                                    error_details.push(format!("Import failed: {}", e));
                                }
                            }
                        }
                    }
                },
                Err(transform_error) => {
                    failed_imports += 1;
                    error_details.push(format!("Transform error: {}", transform_error));
                }
            }
        }
    }
    
    // Activate the imported accounts
    let activated_accounts = if !school_ids_to_activate.is_empty() {
        let placeholders = school_ids_to_activate.iter().map(|_| "?").collect::<Vec<&str>>().join(",");
        let activate_query = format!(
            "UPDATE school_accounts SET is_active = 1 WHERE school_id IN ({})",
            placeholders
        );
        
        let conn = state.0.get_cloned_connection();
        let params: Vec<&dyn rusqlite::ToSql> = school_ids_to_activate.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        
        conn.execute(
            &activate_query, 
            params.as_slice()
        ).map_err(|e| format!("Failed to activate imported accounts: {}", e))?;
        
        // Count activated accounts
        let activated_count: usize = conn.query_row(
            "SELECT COUNT(*) FROM school_accounts WHERE is_active = 1",
            [],
            |row| row.get(0)
        ).map_err(|e| format!("Failed to count activated accounts: {}", e))?;
        
        activated_count
    } else {
        0
    };
    
    // Count total accounts and deactivated accounts
    let conn = state.0.get_cloned_connection();
    let total_accounts_after: usize = conn.query_row(
        "SELECT COUNT(*) FROM school_accounts",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to count total accounts: {}", e))?;
    
    let deactivated_accounts = total_accounts_after - activated_accounts;

    // Prepare response
    let import_response = CsvImportResponse {
        validation_result,
        total_processed,
        successful_imports,
        failed_imports,
        error_details,
        existing_account_info: Some(ExistingAccountInfo {
            existing_accounts: existing_accounts.clone(), 
            new_accounts_count: total_processed - existing_accounts.len(),
            existing_accounts_count: existing_accounts.len(),
        }),
        account_status_counts: Some(AccountStatusCounts {
            total_accounts: total_accounts_after,
            activated_accounts,
            deactivated_accounts,
        }),
    };
    
    info!("CSV import completed: {} total, {} successful, {} failed, Semester={}", 
        total_processed, successful_imports, failed_imports, last_updated_semester_id);
    
    info!("Account Status Counts:");
    info!("  Total Accounts: {}", total_accounts_after);
    info!("  Activated Accounts: {}", activated_accounts);
    info!("  Deactivated Accounts: {}", deactivated_accounts);
    
    Ok(import_response)
}

#[command]
pub async fn import_csv_file_parallel(
    app_handle: tauri::AppHandle,
    state: State<'_, DbState>,
    file_path: String,
    last_updated_semester_id: Uuid,
    force_update: bool
) -> Result<CsvImportResponse, String> {
    // Get multiple connections instead of relying on a single connection
    let validator_conn = state.0.get_cloned_connection();
    let mut deactivate_conn = state.0.get_cloned_connection();
    let mut processor_conn = state.0.get_cloned_connection();
    let mut main_conn = state.0.get_cloned_connection();
    let mut check_conn = state.0.get_cloned_connection();
    
    // Create validator with the connection
    let validator = CsvValidator::new(validator_conn);
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
            school_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect::<Vec<_>>().as_slice()
        ).map_err(|e| format!("Failed to deactivate accounts not in CSV: {}", e))?;
    }

    // Get existing accounts info
    let existing_accounts = match check_existing_accounts(state.clone(), file_path.clone()).await {
        Ok(info) => info,
        Err(e) => return Err(format!("Failed to check existing accounts: {}", e)),
    };

    // Initialize parallel processor with a new connection
    let processor = ParallelCsvProcessor::new(&processor_conn, None, &state);
    
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

    // Process the CSV data with parallel processor
    let processing_result = process_csv_with_progress(
        &processor,
        records.clone(),
        headers.clone(),
        vec![existing_accounts.clone()],
        progress_callback,
        Some(last_updated_semester_id),
        &state
    );

    // Use a new transaction for account activation/update
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
                            create_request.clone().into()
                        ).map_err(|e| format!("Failed to update account {}: {}", school_id, e))?;
                        
                        // Activate account
                        tx.execute(
                            "UPDATE school_accounts SET is_active = 1 WHERE id = ?1",
                            [&existing_account.id.to_string()]
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
        |row| row.get(0)
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