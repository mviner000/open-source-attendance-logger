// src/parallel_csv_validator.rs

use std::path::Path;
use std::path::PathBuf;
use std::fs::File;
use std::io::{Read, BufReader};
use std::sync::{Arc, Mutex};
use csv::{Reader, StringRecord};
use rayon::prelude::*;
use r2d2::Pool;
use rusqlite::Connection;
use r2d2_sqlite::SqliteConnectionManager;
use crate::db::csv_import::{
    CsvValidator, 
    CsvValidationResult, 
    ValidationError, 
    ValidationErrorType,
    SerializableStringRecord
};

pub struct ParallelCsvValidator {
    connection_string: String,
    max_file_size: usize,
}

fn path_to_string(path: &Path) -> String {
    path.to_str()
        .map(|s| s.to_string())
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

impl ParallelCsvValidator {
    pub fn new(connection_pool: &Pool<SqliteConnectionManager>) -> Self {
        // Get a pooled connection
        let connection_string = connection_pool
            .get()
            .map(|conn| {
                // Get the path as an Option<&str>
                let path_option = conn.path(); // This returns Option<&str>
                
                // Convert Option<&str> to String
                path_option
                    .map(PathBuf::from) // Convert &str to PathBuf
                    .map(|path_buf| path_to_string(path_buf.as_path())) // Convert PathBuf to &Path and then to String
                    .unwrap_or_else(|| String::from(":memory:")) // Default to ":memory:" if None
            })
            .unwrap_or_else(|_| String::from(":memory:"));

        Self {
            connection_string,
            max_file_size: 300 * 1024 * 1024,
        }
    }

    pub fn validate_file(&self, file_path: &Path) -> Result<CsvValidationResult, Vec<ValidationError>> {
        // Open a new connection using the stored connection string
        let conn = Connection::open(&self.connection_string)
            .expect("Failed to open database connection");
    
        let mut errors = Vec::new();
    
        // File Size and Type Validation
        let file_metadata = std::fs::metadata(file_path)
            .map_err(|_| vec![ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::FileSize,
                error_message: "Unable to read file metadata".to_string(),
            }])?;
    
        if file_metadata.len() > self.max_file_size as u64 {
            errors.push(ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::FileSize,
                error_message: format!("File exceeds maximum size of {} bytes", self.max_file_size),
            });
        }
    
        let extension = file_path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");
        
        if extension.to_lowercase() != "csv" {
            errors.push(ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::FileType,
                error_message: "Invalid file type. Only .csv files are allowed".to_string(),
            });
        }
    
        // File Reading and Encoding
        let file = File::open(file_path)
            .map_err(|_| vec![ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::Encoding,
                error_message: "Unable to open file".to_string(),
            }])?;
    
        let mut reader = BufReader::new(file);
        let mut buffer = Vec::new();
        
        reader.read_to_end(&mut buffer)
            .map_err(|_| vec![ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::Encoding,
                error_message: "Failed to read file contents".to_string(),
            }])?;
    
        if std::str::from_utf8(&buffer).is_err() {
            errors.push(ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::Encoding,
                error_message: "File is not valid UTF-8".to_string(),
            });
        }
    
        // Create CSV reader
        let mut rdr = Reader::from_reader(std::io::Cursor::new(buffer.clone()));
    
        // Header Validation
        let headers = match rdr.headers() {
            Ok(headers) => headers.clone(),
            Err(_) => {
                errors.push(ValidationError {
                    row_number: 0,
                    field: None,
                    error_type: ValidationErrorType::HeaderMissing,
                    error_message: "Unable to read CSV headers".to_string(),
                });
                StringRecord::new()
            }
        };
    
        // Prepare validator for header validation
        let csv_validator = CsvValidator::new(conn);
    
        // Validate Headers
        if let Err(header_errors) = csv_validator.validate_headers(&headers) {
            errors.extend(header_errors);
        }
    
        // Parallel Row Validation
        let shared_errors = Arc::new(Mutex::new(Vec::new()));
        let shared_preview_rows = Arc::new(Mutex::new(Vec::new()));
        let total_records = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let valid_records = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let invalid_records = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    
        let records: Vec<StringRecord> = rdr.records()
            .filter_map(Result::ok)
            .collect();
    
        records.par_iter().enumerate().for_each(|(idx, record)| {
            // Create a new connection for each thread
            let thread_conn = Connection::open(&self.connection_string) // Use connection_string here
                .expect("Failed to open database connection");
            let csv_validator = CsvValidator::new(thread_conn);
    
            // Increment total records atomically
            total_records.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            
            // Capture first 5 rows for preview
            if idx < 5 {
                let mut preview_guard = shared_preview_rows.lock().unwrap();
                preview_guard.push(SerializableStringRecord {
                    values: record.iter().map(|s| s.to_string()).collect()
                });
            }
    
            // Validate individual record
            match csv_validator.validate_record(record, &headers) {
                Ok(_) => { 
                    // Increment valid records atomically
                    valid_records.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                },
                Err(record_errors) => {
                    // Add record errors to shared error collection
                    let mut guard = shared_errors.lock().unwrap();
                    invalid_records.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    
                    // Augment errors with row number
                    let augmented_errors = record_errors.into_iter().map(|mut error| {
                        error.row_number = idx + 2; // +2 to account for 1-based indexing and header
                        error
                    }).collect::<Vec<_>>();
                    
                    guard.extend(augmented_errors);
                }
            }
        });
    
        // Collect final errors from parallel processing
        let mut validation_errors = shared_errors.lock().unwrap().clone();
        errors.append(&mut validation_errors);
    
        // Check for existing accounts (only if no validation errors)
        let existing_accounts = if errors.is_empty() {
            csv_validator.check_existing_school_accounts(&headers, &records)
        } else {
            Vec::new()
        };
    
        // Prepare validation result
        let validation_result = CsvValidationResult {
            is_valid: errors.is_empty(),
            file_name: file_path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string(),
            file_size: file_metadata.len() as usize,
            total_rows: total_records.load(std::sync::atomic::Ordering::Relaxed),
            validated_rows: valid_records.load(std::sync::atomic::Ordering::Relaxed),
            invalid_rows: invalid_records.load(std::sync::atomic::Ordering::Relaxed),
            encoding: "UTF-8".to_string(),
            preview_rows: shared_preview_rows.lock().unwrap().clone(),
            validation_errors: errors.clone(),
            errors: errors.clone(),
        };
    
        // Determine final validation result
        if validation_result.is_valid {
            Ok(validation_result)
        } else {
            Err(validation_result.errors.clone())
        }
    }
}