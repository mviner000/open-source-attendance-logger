// src/csv_commands.rs
use uuid::Uuid;
use std::path::Path;
use tauri::{State, command};
use crate::DbState;
use crate::db::csv_import::{CsvValidator, CsvValidationResult};
use crate::db::csv_transform::{CsvTransformer, batch_transform_records};
use csv::StringRecord;
use log::{info, error};

#[derive(serde::Serialize)]
pub struct CsvImportResponse {
    validation_result: CsvValidationResult,
    total_processed: usize,
    successful_imports: usize,
    failed_imports: usize,
    error_details: Vec<String>,
}

// #[derive(serde::Deserialize)]
// pub struct CsvImportRequest {
//     pub file_path: String,
//     pub semester_id: Uuid,
// }

#[derive(serde::Serialize, Debug)]
pub struct ValidationErrorDetails {
    row_number: usize,
    field: Option<String>,
    error_type: String,
    error_message: String,
}

#[command]
pub async fn validate_csv_file(
    file_path: String
) -> Result<CsvValidationResult, Vec<ValidationErrorDetails>> {
    let path = Path::new(&file_path);
    let validator = CsvValidator::new();
    
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
    state: State<'_, DbState>,
    file_path: String,
    semester_id: Uuid // Add semester_id parameter
) -> Result<CsvImportResponse, String> {
    let path = Path::new(&file_path);
    let validator = CsvValidator::new();
    
    // First, validate the file
    let validation_result = validator.validate_file(path)
        .map_err(|errors| format!("Validation failed: {:?}", errors))?;
    
    // Prepare CSV reader
    let mut rdr = csv::Reader::from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;
    
    // Get headers for transformer
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?;
    
    // Get a cloned connection using the provided method
    let conn = state.0.get_cloned_connection();
    
    // Create transformer with headers and connection
    let transformer = CsvTransformer::new(&headers, conn);
    
    // Collect records
    let records: Vec<StringRecord> = rdr.records()
        .filter_map(Result::ok)
        .collect();
    
    // Batch transform records
    let batch_size = 100; // Configurable batch size
    let batched_records = batch_transform_records(&transformer, &records, batch_size);
    
    // Prepare to track import results
    let mut total_processed = 0;
    let mut successful_imports = 0;
    let mut failed_imports = 0;
    let mut error_details = Vec::new();
    
    // Perform import for each batch
    for batch in batched_records {
        let conn = state.0.get_connection().write();
        
        for result in batch {
            total_processed += 1;
            
            match result {
                Ok(mut account_request) => {
                    // Set the last_updated_semester_id for each account
                    account_request.last_updated_semester_id = Some(semester_id);
                    
                    match state.0.school_accounts.create_school_account(&conn, account_request) {
                        Ok(_) => successful_imports += 1,
                        Err(e) => {
                            failed_imports += 1;
                            error_details.push(format!("Import failed: {}", e));
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
    
    // Prepare response
    let import_response = CsvImportResponse {
        validation_result,
        total_processed,
        successful_imports,
        failed_imports,
        error_details,
    };
    
    info!("CSV import completed: {} total, {} successful, {} failed, Semester={}", 
        total_processed, successful_imports, failed_imports, semester_id);
    
    Ok(import_response)
}