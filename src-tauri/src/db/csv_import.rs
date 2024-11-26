// src/db/csv_import.rs

use std::path::Path;
use csv::{Reader, StringRecord};
use rusqlite::Connection;
use log::{info, error};
use super::school_accounts::{CreateSchoolAccountRequest, SchoolAccountRepository, SqliteSchoolAccountRepository};
use serde::{Deserialize, Serialize};
use parking_lot::RwLockWriteGuard;

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvImportResult {
    pub total_records: usize,
    pub successful_imports: usize,
    pub failed_imports: usize,
    pub errors: Vec<String>,
}

pub struct CsvValidator {
    required_headers: Vec<String>,
}

impl CsvValidator {
    pub fn new() -> Self {
        CsvValidator {
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

    pub fn validate_headers(&self, headers: &StringRecord) -> Result<(), String> {
        let header_names: Vec<String> = headers.iter().map(|h| h.to_lowercase()).collect();
        
        let missing_headers: Vec<String> = self.required_headers
            .iter()
            .filter(|&required| !header_names.contains(&required.to_lowercase()))
            .cloned()
            .collect();

        if !missing_headers.is_empty() {
            return Err(format!(
                "Missing required headers: {}",
                missing_headers.join(", ")
            ));
        }

        Ok(())
    }

    fn parse_gender(gender: &str) -> Option<crate::db::school_accounts::Gender> {
        match gender.to_uppercase().as_str() {
            "MALE" => Some(crate::db::school_accounts::Gender::Male),
            "FEMALE" => Some(crate::db::school_accounts::Gender::Female),
            _ => Some(crate::db::school_accounts::Gender::Other),
        }
    }

    fn create_account_request(&self, record: &StringRecord, headers: &StringRecord) -> Result<CreateSchoolAccountRequest, String> {
        let get_field = |field: &str| -> Option<String> {
            headers.iter()
                .position(|h| h.to_lowercase() == field.to_lowercase())
                .map(|i| record.get(i))
                .flatten()
                .map(|s| s.to_string())
        };

        let school_id = get_field("student_id")
            .ok_or_else(|| "Missing student_id".to_string())?;

        Ok(CreateSchoolAccountRequest {
            school_id,
            first_name: get_field("first_name"),
            middle_name: get_field("middle_name"),
            last_name: get_field("last_name"),
            gender: get_field("gender").and_then(|g| Self::parse_gender(&g)),
            course: get_field("course"),
            department: None,
            position: None,
            major: get_field("major"),
            year_level: get_field("year_level"),
            is_active: true,
            last_updated: None,
        })
    }
}

pub fn import_csv(
    mut conn: RwLockWriteGuard<'_, rusqlite::Connection>,
    csv_path: &Path
) -> Result<CsvImportResult, String> {
    println!("Starting CSV import from: {:?}", csv_path);
    let mut rdr = Reader::from_path(csv_path)
        .map_err(|e| format!("Failed to open CSV file: {}", e))?;
    
    let validator = CsvValidator::new();
    
    let headers = rdr.headers()
        .map_err(|e| format!("Failed to read CSV headers: {}", e))?
        .clone();

    validator.validate_headers(&headers)?;

    let repository = SqliteSchoolAccountRepository;
    let mut result = CsvImportResult {
        total_records: 0,
        successful_imports: 0,
        failed_imports: 0,
        errors: Vec::new(),
    };

    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let records: Vec<Result<StringRecord, csv::Error>> = rdr.records().collect();

    for record in records {
        result.total_records += 1;
        
        match record {
            Ok(record) => {
                match validator.create_account_request(&record, &headers) {
                    Ok(account_request) => {
                        match repository.create_school_account(&tx, account_request) {
                            Ok(_) => {
                                result.successful_imports += 1;
                            },
                            Err(e) => {
                                result.failed_imports += 1;
                                result.errors.push(format!(
                                    "Failed to import record {}: {}",
                                    result.total_records,
                                    e
                                ));
                            }
                        }
                    },
                    Err(e) => {
                        result.failed_imports += 1;
                        result.errors.push(format!(
                            "Failed to create account request for record {}: {}",
                            result.total_records,
                            e
                        ));
                    }
                }
            },
            Err(e) => {
                result.failed_imports += 1;
                result.errors.push(format!(
                    "Failed to read record {}: {}",
                    result.total_records,
                    e
                ));
            }
        }
    }

    if result.failed_imports == 0 {
        tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
        info!("Successfully imported {} records", result.successful_imports);
    } else {
        tx.rollback().map_err(|e| format!("Failed to rollback transaction: {}", e))?;
        error!(
            "Import failed: {} successful, {} failed", 
            result.successful_imports,
            result.failed_imports
        );
    }

    Ok(result)
}