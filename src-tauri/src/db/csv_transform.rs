// src/db/csv_transform.rs

use std::convert::TryFrom;
use csv::StringRecord;
use crate::db::school_accounts::{CreateSchoolAccountRequest, Gender, Semester};
use crate::db::csv_import::{ValidationError, ValidationErrorType, SerializableStringRecord};
use log::{info, error};

#[derive(Debug)]
pub enum TransformError {
    MissingRequiredField(String),
    InvalidFieldFormat { field: String, value: String },
    UnknownHeader(String),
    ValidationError(ValidationError),
}

impl From<ValidationError> for TransformError {
    fn from(error: ValidationError) -> Self {
        TransformError::ValidationError(error)
    }
}


pub struct CsvTransformer {
    headers: StringRecord,
}

impl CsvTransformer {
    pub fn new(headers: &StringRecord) -> Self {
        CsvTransformer {
            headers: headers.clone(),
        }
    }

    pub fn transform_record(&self, record: &StringRecord) -> Result<CreateSchoolAccountRequest, String> {
        // Helper function to map header to index
        let get_index = |header: &str| -> Option<usize> {
            self.headers.iter()
                .position(|h| h.to_lowercase() == header.to_lowercase())
        };
    
        // Required Fields
        let student_id_idx = get_index("student_id").ok_or("Missing student_id header")?;
        let first_name_idx = get_index("first_name").ok_or("Missing first_name header")?;
        let middle_name_idx = get_index("middle_name").ok_or("Missing middle_name header")?;
        let last_name_idx = get_index("last_name").ok_or("Missing last_name header")?;
    
        let student_id = record.get(student_id_idx)
            .map(|s| s.trim().to_string())
            .ok_or("Invalid student_id value")?;
        let first_name = record.get(first_name_idx)
            .map(|s| Some(s.trim().to_string()))
            .unwrap_or(None);
        let middle_name = record.get(middle_name_idx)
            .map(|s| Some(s.trim().to_string()))
            .unwrap_or(None);
        let last_name = record.get(last_name_idx)
            .map(|s| Some(s.trim().to_string()))
            .unwrap_or(None);
    
        // Optional Fields
        let gender = get_index("gender")
            .and_then(|idx| record.get(idx))
            .and_then(|value| match value.to_lowercase().as_str() {
                "male" | "0" => Some(Gender::Male),
                "female" | "1" => Some(Gender::Female),
                "other" | "2" => Some(Gender::Other),
                _ => None
            });
    
        let course = get_index("course")
            .and_then(|idx| record.get(idx))
            .map(|s| s.trim().to_string());
    
        let department = get_index("department")
            .and_then(|idx| record.get(idx))
            .map(|s| s.trim().to_string());
    
        let position = get_index("position")
            .and_then(|idx| record.get(idx))
            .map(|s| s.trim().to_string());
    
        let major = get_index("major")
            .and_then(|idx| record.get(idx))
            .map(|s| s.trim().to_string());
    
        let year_level = get_index("year_level")
            .and_then(|idx| record.get(idx))
            .map(|s| s.trim().to_string());
    
        let is_active = get_index("is_active")
            .and_then(|idx| record.get(idx))
            .map(|value| match value.to_lowercase().as_str() {
                "true" | "1" => true,
                "false" | "0" => false,
                _ => true  // default to true
            });
    
        let last_updated = get_index("last_updated")
            .and_then(|idx| record.get(idx))
            .and_then(|value| match value.trim() {
                "FirstSem2024_2025" | "0" => Some(Semester::FirstSem2024_2025),
                "SecondSem2024_2025" | "1" => Some(Semester::SecondSem2024_2025),
                "FirstSem2025_2026" | "2" => Some(Semester::FirstSem2025_2026),
                _ => None  // Default to None if unrecognized
            });
        
        // Create the CreateSchoolAccountRequest with all the parsed fields
        Ok(CreateSchoolAccountRequest {
            school_id: student_id,
            first_name,
            middle_name,
            last_name,
            gender,
            course,
            department,
            position,
            major,
            year_level,
            is_active: is_active.unwrap_or(true),
            last_updated: last_updated.or(Some(Semester::None)),
        })
    }

    pub fn transform_records(&self, records: &[StringRecord]) -> Vec<Result<CreateSchoolAccountRequest, TransformError>> {
        records.iter()
            .map(|record| {
                self.transform_record(record)
                    .map_err(|e| TransformError::InvalidFieldFormat { 
                        field: "multiple".to_string(), 
                        value: e 
                    })
            })
            .collect()
    }
}



// Implement conversion from TransformError to String for error handling
impl std::fmt::Display for TransformError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransformError::MissingRequiredField(field) => {
                write!(f, "Missing required field: {}", field)
            }
            TransformError::InvalidFieldFormat { field, value } => {
                write!(f, "Invalid format for field {}: {}", field, value)
            }
            TransformError::UnknownHeader(header) => {
                write!(f, "Unknown header: {}", header)
            }
            TransformError::ValidationError(error) => {
                write!(f, "Validation error: {:?}", error)
            }
        }
    }
}

impl std::error::Error for TransformError {}

// Helper function to batch process records
pub fn batch_transform_records(
    transformer: &CsvTransformer,
    records: &[StringRecord],
    batch_size: usize
) -> Vec<Vec<Result<CreateSchoolAccountRequest, TransformError>>> {
    records.chunks(batch_size)
        .map(|chunk| transformer.transform_records(chunk))
        .collect()
}