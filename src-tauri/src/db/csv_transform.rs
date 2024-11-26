// src/db/csv_transform.rs

use std::convert::TryFrom;
use csv::StringRecord;
use crate::db::school_accounts::{CreateSchoolAccountRequest, Gender, Semester};
use crate::db::csv_import::{ValidationError, ValidationErrorType, SerializableStringRecord};
use log::{info, error};

#[derive(Debug)]
pub struct CsvTransformer {
    header_mappings: std::collections::HashMap<String, usize>,
}

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

impl CsvTransformer {
    pub fn new(headers: &StringRecord) -> Self {
        let mut mappings = std::collections::HashMap::new();
        for (index, header) in headers.iter().enumerate() {
            mappings.insert(header.to_lowercase(), index);
        }
        
        CsvTransformer {
            header_mappings: mappings,
        }
    }

    pub fn transform_record(&self, record: &StringRecord) -> Result<CreateSchoolAccountRequest, TransformError> {
        // Helper closure to get field value
        let get_field = |field: &str| -> Result<String, TransformError> {
            let index = self.header_mappings.get(&field.to_lowercase())
                .ok_or_else(|| TransformError::UnknownHeader(field.to_string()))?;
            Ok(record.get(*index)
                .map(|s| s.trim().to_string())
                .unwrap_or_default())
        };

        // Get required field - student_id
        let school_id = get_field("student_id")?;
        if school_id.is_empty() {
            return Err(TransformError::MissingRequiredField("student_id".to_string()));
        }

        // Transform gender field
        let gender = match get_field("gender")?.to_lowercase().as_str() {
            "male" | "m" => Some(Gender::Male),
            "female" | "f" => Some(Gender::Female),
            _ => Some(Gender::Other),
        };

        // Create the account request
        let account_request = CreateSchoolAccountRequest {
            school_id,
            first_name: Some(get_field("first_name")?),
            middle_name: Some(get_field("middle_name")?),
            last_name: Some(get_field("last_name")?),
            gender,
            course: Some(get_field("course")?),
            department: None, // Not in CSV
            position: None,   // Not in CSV
            major: Some(get_field("major")?),
            year_level: Some(get_field("year_level")?),
            is_active: true,  // Default to true for new accounts
            last_updated: Some(Semester::None), // Default to None for new accounts
        };

        Ok(account_request)
    }

    pub fn transform_records(&self, records: &[StringRecord]) -> Vec<Result<CreateSchoolAccountRequest, TransformError>> {
        records.iter()
            .map(|record| self.transform_record(record))
            .collect()
    }

    // Helper method to validate transformed data
    fn validate_transformed_data(&self, request: &CreateSchoolAccountRequest) -> Result<(), TransformError> {
        // Validate school_id format (example: should match a specific pattern)
        if !self.is_valid_school_id(&request.school_id) {
            return Err(TransformError::InvalidFieldFormat {
                field: "school_id".to_string(),
                value: request.school_id.clone(),
            });
        }

        // Add more specific validation rules as needed
        Ok(())
    }

    // Example validation method - customize based on your requirements
    fn is_valid_school_id(&self, school_id: &str) -> bool {
        // Example: Validate if school_id matches your institution's format
        // This is a placeholder implementation
        !school_id.is_empty() && school_id.len() <= 20 && school_id.chars().all(|c| c.is_alphanumeric() || c == '-')
    }

    // Helper method to clean and standardize data
    fn clean_string(&self, value: &str) -> String {
        value.trim()
            .replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), "")
            .split_whitespace()
            .collect::<Vec<&str>>()
            .join(" ")
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