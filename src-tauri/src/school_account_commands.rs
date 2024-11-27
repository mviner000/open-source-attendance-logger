// src/school_account_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::school_accounts::{SchoolAccount, UpdateSchoolAccountRequest};
use crate::db::semester::{Semester, SemesterRepository};
use rusqlite::Result;
use uuid::Uuid;
use serde::Serialize;

// Optional: Create a new struct that includes semester data
#[derive(Serialize)]
pub struct SchoolAccountWithSemester {
    #[serde(flatten)]
    account: SchoolAccount,
    last_updated_semester: Option<Semester>,
}

#[tauri::command]
pub async fn get_all_school_accounts(
    state: State<'_, DbState>
) -> Result<Vec<SchoolAccount>, String> {
    let conn = state.0.get_connection().read();
    state.0.school_accounts.get_all_school_accounts(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_school_account_with_semester(
    state: State<'_, DbState>,
    id: String,
) -> Result<SchoolAccountWithSemester, String> {
    let conn = state.0.get_connection().read();
    
    // Get the school account
    let account = state.0.school_accounts.get_school_account(&conn, Uuid::parse_str(&id)
        .map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    
    // Get the related semester if it exists
    let semester = match account.last_updated_semester_id {
        Some(semester_id) => {
            state.0.semester_repository.get_semester(&conn, semester_id)
                .ok()
        },
        None => None
    };

    Ok(SchoolAccountWithSemester {
        account,
        last_updated_semester: semester,
    })
}

#[tauri::command]
pub async fn update_school_account_semester(
    state: State<'_, DbState>,
    id: String,
    semester_id: String,
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().write();
    
    // Parse UUIDs
    let account_id = Uuid::parse_str(&id)
        .map_err(|e| e.to_string())?;
    let semester_uuid = Uuid::parse_str(&semester_id)
        .map_err(|e| e.to_string())?;
    
    // Verify semester exists
    state.0.semester_repository.get_semester(&conn, semester_uuid)
        .map_err(|_| "Semester not found".to_string())?;
    
    // Create update request with just the semester ID
    let update = UpdateSchoolAccountRequest {
        last_updated_semester_id: Some(semester_uuid),
        ..Default::default()
    };
    
    // Update the account
    state.0.school_accounts.update_school_account(&conn, account_id, update)
        .map_err(|e| e.to_string())
}