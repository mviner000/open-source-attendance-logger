// src/csv_commands.rs
use uuid::Uuid;
use std::path::Path;
use tauri::{State, command};
use crate::DbState;
use crate::db::csv_import::{CsvValidator, CsvValidationResult};
use crate::db::csv_transform::{CsvTransformer, batch_transform_records};
use crate::db::school_accounts::{SchoolAccount, CreateSchoolAccountRequest};
use crate::parallel_csv_processor::process_csv_with_progress;
use crate::db::csv_import::ExistingAccountInfo;
use crate::parallel_csv_processor::ParallelCsvProcessor;
use crate::logger::{emit_log, LogMessage};
use csv::StringRecord;
use log::{info, error};

#[derive(serde::Serialize, Debug)]
pub struct AccountStatusCounts {
    pub total_accounts: usize,
    pub activated_accounts: usize,
    pub deactivated_accounts: usize,

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
    let transformer = CsvTransformer::new(&headers, conn_transform);
    
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
        existing_id: "".to_string(),
        school_id: "".to_string(),
        first_name: None,
        middle_name: None,
        last_name: None,
        gender: None,
        course: None,
        department: None,
        position: None,
        major: None,
        year_level: None,
        is_active: None,
        last_updated_semester_id: None,
        row_number: 0,
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
    semester_id: Uuid,
    force_update: bool
) -> Result<CsvImportResponse, String> {
    let path = Path::new(&file_path);
    
    // Get a connection for validation
    let conn = state.0.get_cloned_connection();
    
    // Pass the connection to CsvValidator
    let validator = CsvValidator::new(conn);
    
    // First, validate the file
    let validation_result = validator.validate_file(path)
        .map_err(|errors| format!("Validation failed: {:?}", errors))?;
    
    // Read the entire file contents
    let file_contents = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Create a new CSV reader from the file contents
    let mut rdr = csv::Reader::from_reader(file_contents.as_bytes());
    
    // Get headers 
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?
        .clone();
    
    // Collect all records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Get existing accounts info before processing
    let conn = state.0.get_cloned_connection();
    let existing_accounts = match check_existing_accounts(state.clone(), file_path.clone()).await {
        Ok(info) => info,
        Err(e) => return Err(format!("Failed to check existing accounts: {}", e)),
    };

    // First, count total accounts before deactivation
    let total_accounts_before: usize = conn.query_row(
        "SELECT COUNT(*) FROM school_accounts",
        [],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to count total accounts: {}", e))?;
    
    // Deactivate all accounts
    conn.execute(
        "UPDATE school_accounts SET is_active = 0",
        []
    ).map_err(|e| format!("Failed to deactivate existing accounts: {}", e))?;

    // Initialize parallel processor
    let processor = ParallelCsvProcessor::new(&conn, None);
    
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
    );

    // Collect school_ids from the CSV to be set as active
    let school_ids: Vec<String> = records.iter()
        .filter_map(|record| record.get(0))
        .map(String::from)
        .collect();

    // Activate the imported accounts
    let activated_accounts = if !school_ids.is_empty() {
        let placeholders = school_ids.iter().map(|_| "?").collect::<Vec<&str>>().join(",");
        let activate_query = format!(
            "UPDATE school_accounts SET is_active = 1 WHERE school_id IN ({})",
            placeholders
        );
        
        let conn = state.0.get_cloned_connection();
        let params: Vec<&dyn rusqlite::ToSql> = school_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        
        conn.execute(
            &activate_query, 
            params.as_slice()
        ).map_err(|e| format!("Failed to activate imported accounts: {}", e))?;
        
        // Count activated accounts
        conn.query_row(
            "SELECT COUNT(*) FROM school_accounts WHERE is_active = 1",
            [],
            |row| row.get(0)
        ).map_err(|e| format!("Failed to count activated accounts: {}", e))?
    } else {
        0
    };

    // Count final account statistics
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
    
    info!("CSV import completed: {} total, {} successful, {} failed, Semester={}", 
        records.len(), processing_result.successful, processing_result.failed, semester_id);
    
    info!("Account Status Counts:");
    info!("  Total Accounts: {}", total_accounts_after);
    info!("  Activated Accounts: {}", activated_accounts);
    info!("  Deactivated Accounts: {}", deactivated_accounts);
    
    Ok(import_response)
}