// src/db/csv_transform.rs

use crate::DbState;
use std::sync::Arc;
use csv::StringRecord;
use crate::db::school_accounts::{CreateSchoolAccountRequest, Gender};
use crate::db::semester::{SemesterRepository, SqliteSemesterRepository};
use crate::db::csv_import::ValidationError;
use rusqlite::Connection;

#[derive(Debug)]
pub enum TransformError {
    MissingRequiredField(String),
    InvalidFieldFormat { field: String, value: String },
    UnknownHeader(String),
    ValidationError(ValidationError),
    SemesterNotFound(String),
    DatabaseError(String),
}

impl From<ValidationError> for TransformError {
    fn from(error: ValidationError) -> Self {
        TransformError::ValidationError(error)
    }
}

pub struct CsvTransformer {
    headers: StringRecord,
    db_state: Arc<DbState>,
}

impl CsvTransformer {
    pub fn new(headers: &StringRecord, db_state: Arc<DbState>) -> Self {
        CsvTransformer {
            headers: headers.clone(),
            db_state: db_state,
        }
    }

    pub fn transform_record(&self, record: &StringRecord) -> Result<CreateSchoolAccountRequest, TransformError> {
        // Get a connection from the pool
        let conn = self.db_state.0.pool.get()
            .map_err(|e| TransformError::DatabaseError(e.to_string()))?;
        
        // Helper function to map header to index
        let get_index = |header: &str| -> Option<usize> {
            self.headers.iter()
                .position(|h| h.to_lowercase() == header.to_lowercase())
        };
    
        // Rest of the implementation remains the same...
        let student_id_idx = get_index("student_id")
            .ok_or(TransformError::MissingRequiredField("student_id".to_string()))?;
        let first_name_idx = get_index("first_name")
            .ok_or(TransformError::MissingRequiredField("first_name".to_string()))?;
        let middle_name_idx = get_index("middle_name")
            .ok_or(TransformError::MissingRequiredField("middle_name".to_string()))?;
        let last_name_idx = get_index("last_name")
            .ok_or(TransformError::MissingRequiredField("last_name".to_string()))?;
    
        let student_id = record.get(student_id_idx)
            .map(|s| s.trim().to_string())
            .ok_or(TransformError::InvalidFieldFormat { 
                field: "student_id".to_string(), 
                value: "Empty or invalid".to_string() 
            })?;
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
    
        // Use SemesterRepository to find semester by label
        let last_updated_semester_id = get_index("last_updated")
            .and_then(|idx| record.get(idx))
            .and_then(|value| {
                let semester_repo = SqliteSemesterRepository;
                match semester_repo.get_semester_by_label(&conn, value.trim()) {
                    Ok(semester) => Some(semester.id),
                    Err(_) => None
                }
            });
        
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
            last_updated_semester_id,
        })
    }

    pub fn transform_records(&self, records: &[StringRecord]) -> Vec<Result<CreateSchoolAccountRequest, TransformError>> {
        records.iter()
            .map(|record| {
                self.transform_record(record)
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
            TransformError::SemesterNotFound(label) => {
                write!(f, "Semester not found: {}", label)
            }
            TransformError::DatabaseError(msg) => {
                write!(f, "Database error: {}", msg)
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