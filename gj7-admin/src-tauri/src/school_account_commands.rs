// src/school_account_commands.rs

use std::error::Error;
use std::fmt;
use tauri::State;
use crate::DbState;
use crate::db::school_accounts::{PaginatedSchoolAccounts, SchoolAccount, UpdateSchoolAccountRequest, AccountStatusCounts};
use crate::db::semester::Semester;
use uuid::Uuid;
use rusqlite::{Result, Error as RusqliteError};
use serde::{Serialize, Deserialize};

// Optional: Create a new struct that includes semester data
#[derive(Serialize)]
pub struct SchoolAccountWithSemester {
    #[serde(flatten)]
    account: SchoolAccount,
    last_updated_semester: Option<Semester>,
}

#[derive(Serialize)]
pub struct DashboardStats {
    active_semester: Option<Semester>,
    account_counts: AccountStatusCounts,
}

#[derive(Deserialize)]
pub struct PaginationRequest {
    page: Option<u64>,
    page_size: Option<u64>,
    semester_id: Option<String>,
}


// Custom error type that implements From<rusqlite::Error>
#[derive(Debug)]
pub struct DatabaseError(rusqlite::Error);

impl fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Database error: {}", self.0)
    }
}

impl Error for DatabaseError {}

impl From<rusqlite::Error> for DatabaseError {
    fn from(err: rusqlite::Error) -> Self {
        DatabaseError(err)
    }
}

// Trait to convert results with different error types
trait ResultExt<T, E> {
    fn map_db_error(self) -> Result<T, DatabaseError>;
}

impl<T, E: Into<DatabaseError>> ResultExt<T, E> for Result<T, E> {
    fn map_db_error(self) -> Result<T, DatabaseError> {
        self.map_err(|e| e.into())
    }
}


// Helper function to convert rusqlite::Result to a Result with String error
fn convert_rusqlite_result<T>(result: rusqlite::Result<T>) -> Result<T, String> {
    result.map_err(|e| e.to_string())
}


#[tauri::command]
pub async fn get_all_school_accounts(
    state: State<'_, DbState>
) -> Result<Vec<SchoolAccount>, String> {
    let db = state.0.clone();
    let school_accounts = db.school_accounts.clone();
    
    db.with_connection(move |conn| {
        school_accounts.get_all_school_accounts(conn)
            .map_err(|_| rusqlite::Error::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_dashboard_stats(
    state: State<'_, DbState>,
) -> Result<DashboardStats, String> {
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    let school_accounts = db.school_accounts.clone();
    
    db.with_connection(move |conn| {
        let active_semester = semester_repo.get_active_semester(conn)
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
            
        let account_counts = school_accounts.get_account_status_counts(conn)
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        Ok(DashboardStats {
            active_semester,
            account_counts,
        })
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_paginated_school_accounts(
    state: State<'_, DbState>,
    request: PaginationRequest
) -> Result<PaginatedSchoolAccounts, String> {
    let page = request.page.unwrap_or(1);
    let page_size = request.page_size.unwrap_or(30);
    
    let semester_uuid = match &request.semester_id {
        Some(id) => Uuid::parse_str(id).map_err(|e| e.to_string())?,
        None => Uuid::nil(),
    };

    let db = state.0.clone();
    let school_accounts = db.school_accounts.clone();
    
    db.with_connection(move |conn| {
        school_accounts.get_paginated_school_accounts(
            conn, 
            page, 
            page_size,
            Some(semester_uuid)
        ).map_err(|_| rusqlite::Error::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_school_account_with_semester(
    state: State<'_, DbState>,
    id: String,
) -> Result<SchoolAccountWithSemester, String> {
    let db = state.0.clone();
    let school_accounts = db.school_accounts.clone();
    let semester_repo = db.semester_repository.clone();
    
    db.with_connection(move |conn| {
        // Get the school account
        let account_id = Uuid::parse_str(&id)
            .map_err(|_| RusqliteError::InvalidQuery)?;
        
        let account = school_accounts.get_school_account(conn, account_id)
            .map_err(|_| RusqliteError::InvalidQuery)?;
        
        // Get the related semester if it exists
        let semester = match account.last_updated_semester_id {
            Some(semester_id) => {
                semester_repo.get_semester(conn, semester_id)
                    .ok()
            },
            None => None
        };

        Ok(SchoolAccountWithSemester {
            account,
            last_updated_semester: semester,
        })
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_school_account_semester(
    state: State<'_, DbState>,
    id: String,
    semester_id: String,
) -> Result<SchoolAccount, String> {
    let db = state.0.clone();
    let school_accounts = db.school_accounts.clone();
    let semester_repo = db.semester_repository.clone();
    
    db.with_connection(move |conn| {
        let account_id = Uuid::parse_str(&id)
            .map_err(|_| RusqliteError::InvalidQuery)?;
        let semester_uuid = Uuid::parse_str(&semester_id)
            .map_err(|_| RusqliteError::InvalidQuery)?;

        // Validate semester exists
        semester_repo.get_semester(conn, semester_uuid)
            .map_err(|_| RusqliteError::InvalidQuery)?;

        let update = UpdateSchoolAccountRequest {
            last_updated_semester_id: Some(semester_uuid),
            ..Default::default()
        };

        school_accounts.update_school_account(conn, account_id, update)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}