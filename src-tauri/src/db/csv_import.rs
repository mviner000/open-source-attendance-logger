use std::path::Path;
use std::fs::File;
use std::io::{Read, Seek, BufReader};
use csv::{Reader, StringRecord};
use rusqlite::Connection;
use log::{info, error};
use super::school_accounts::{CreateSchoolAccountRequest, SchoolAccountRepository, SqliteSchoolAccountRepository};
use serde::{Serialize, Deserialize, ser::{SerializeStruct, Serializer}};
use parking_lot::RwLockWriteGuard;

// Custom Serializable StringRecord
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializableStringRecord {
    pub values: Vec<String>
}

impl From<StringRecord> for SerializableStringRecord {
    fn from(record: StringRecord) -> Self {
        SerializableStringRecord {
            values: record.iter().map(|s| s.to_string()).collect()
        }
    }
}

impl From<SerializableStringRecord> for StringRecord {
    fn from(record: SerializableStringRecord) -> Self {
        StringRecord::from(record.values)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvValidationResult {
    pub is_valid: bool,  // Add this field for frontend compatibility
    pub file_name: String,
    pub file_size: usize,
    pub total_rows: usize,  // Rename for frontend consistency
    pub validated_rows: usize,  // Rename for frontend consistency
    pub invalid_rows: usize,  // Rename for frontend consistency
    pub encoding: String,
    pub preview_rows: Vec<SerializableStringRecord>,
    pub validation_errors: Vec<ValidationError>,  // Keep this for backwards compatibility
    pub errors: Vec<ValidationError>,  // Add this to match existing code
}

#[derive(Debug, Clone, Serialize, Deserialize)]  // Added Clone derive
pub struct ValidationError {
    pub row_number: usize,
    pub field: Option<String>,
    pub error_type: ValidationErrorType,
    pub error_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]  // Added Clone derive
pub enum ValidationErrorType {
    FileSize,
    FileType,
    Encoding,
    HeaderMissing,
    DataIntegrity,
    TypeMismatch,
}

pub struct CsvValidator {
    max_file_size: usize,  // bytes
    required_headers: Vec<String>,
}

impl CsvValidator {
    pub fn new() -> Self {
        CsvValidator {
            max_file_size: 10 * 1024 * 1024, 
            required_headers: vec![
                "student_id".to_string(),
                "last_name".to_string(),
                "first_name".to_string(),
                "middle_name".to_string(),
                "gender".to_string(),
                "course".to_string(),
                "major".to_string(),
                "year_level".to_string(),
            ],
        }
    }

    pub fn validate_file(&self, file_path: &Path) -> Result<CsvValidationResult, Vec<ValidationError>> {
        let mut errors = Vec::new();

        // File Size Validation
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

        // File Type Validation
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

        // File Opening and Initial Validation
        let file = File::open(file_path)
            .map_err(|_| vec![ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::Encoding,
                error_message: "Unable to open file".to_string(),
            }])?;

        let mut reader = BufReader::new(file);
        let mut buffer = Vec::new();
        
        // Try to detect potential encoding issues
        reader.read_to_end(&mut buffer)
            .map_err(|_| vec![ValidationError {
                row_number: 0,
                field: None,
                error_type: ValidationErrorType::Encoding,
                error_message: "Failed to read file contents".to_string(),
            }])?;

        // Validate UTF-8 encoding
        if let Err(_) = std::str::from_utf8(&buffer) {
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

        let header_validation = self.validate_headers(&headers);
        if let Err(header_errors) = header_validation {
            errors.extend(header_errors);
        }

        // Detailed Row Validation and Preview
        let mut preview_rows = Vec::new();
        let mut total_records = 0;
        let mut valid_records = 0;
        let mut invalid_records = 0;

        for (idx, result) in rdr.records().enumerate() {
            total_records += 1;
            match result {
                Ok(record) => {
                    if idx < 5 {
                        preview_rows.push(SerializableStringRecord {
                            values: record.iter().map(|s| s.to_string()).collect()
                        });
                    }
                    
                    match self.validate_record(&record, &headers) {
                        Ok(_) => valid_records += 1,
                        Err(record_errors) => {
                            invalid_records += 1;
                            errors.extend(record_errors);
                        }
                    }
                },
                Err(_) => {
                    invalid_records += 1;
                    errors.push(ValidationError {
                        row_number: total_records,
                        field: None,
                        error_type: ValidationErrorType::DataIntegrity,
                        error_message: "Invalid CSV record".to_string(),
                    });
                }
            }
        }

        let validation_result = CsvValidationResult {
            is_valid: errors.is_empty(),  // Add is_valid flag
            file_name: file_path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string(),
            file_size: file_metadata.len() as usize,
            total_rows: total_records,
            validated_rows: valid_records,
            invalid_rows: invalid_records,
            encoding: "UTF-8".to_string(),
            preview_rows,
            validation_errors: errors.clone(),  // Maintain backwards compatibility
            errors,  // New errors field
        };

        if validation_result.is_valid {
            Ok(validation_result)
        } else {
            Err(validation_result.errors.clone())
        }
    }

    fn validate_headers(&self, headers: &StringRecord) -> Result<(), Vec<ValidationError>> {
        let header_names: Vec<String> = headers.iter().map(|h| h.to_lowercase()).collect();
        
        let missing_headers: Vec<String> = self.required_headers
            .iter()
            .filter(|&required| !header_names.contains(&required.to_lowercase()))
            .cloned()
            .collect();

        if !missing_headers.is_empty() {
            Err(missing_headers.into_iter().map(|header| ValidationError {
                row_number: 0,
                field: Some(header.clone()),
                error_type: ValidationErrorType::HeaderMissing,
                error_message: format!("Missing required header: {}", header),
            }).collect())
        } else {
            Ok(())
        }
    }

    fn validate_record(&self, record: &StringRecord, headers: &StringRecord) -> Result<(), Vec<ValidationError>> {
        let mut record_errors = Vec::new();

        // Example of detailed record-level validation
        let student_id_index = headers.iter()
            .position(|h| h.to_lowercase() == "student_id")
            .unwrap_or(0);

        let student_id = record.get(student_id_index)
            .map(|id| id.trim())
            .unwrap_or("");

        if student_id.is_empty() {
            record_errors.push(ValidationError {
                row_number: 0,  // You'd pass actual row number from caller
                field: Some("student_id".to_string()),
                error_type: ValidationErrorType::DataIntegrity,
                error_message: "Student ID cannot be empty".to_string(),
            });
        }

        // Add more specific validations here

        if record_errors.is_empty() {
            Ok(())
        } else {
            Err(record_errors)
        }
    }
}