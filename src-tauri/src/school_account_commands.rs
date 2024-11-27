// src/school_account_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::school_accounts::{SchoolAccount, UpdateSchoolAccountRequest};
use crate::db::semester::{Semester,};
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
    let db_state = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        db_state.with_connection_blocking(|conn| {
            // Use Arc's deref method to access the repository methods
            db_state.school_accounts.get_all_school_accounts(conn)
        })
        .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_school_account_with_semester(
    state: State<'_, DbState>,
    id: String,
) -> Result<SchoolAccountWithSemester, String> {
    let db_state = state.0.clone(); // Use clone if available
    
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db_state.get_connection_blocking();
        
        // Get the school account
        let account = db_state.school_accounts.get_school_account(&conn, 
            Uuid::parse_str(&id).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        
        // Get the related semester if it exists
        let semester = match account.last_updated_semester_id {
            Some(semester_id) => {
                db_state.semester_repository.get_semester(&conn, semester_id)
                    .ok()
            },
            None => None
        };

        Ok(SchoolAccountWithSemester {
            account,
            last_updated_semester: semester,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}


#[tauri::command]
pub async fn update_school_account_semester(
    state: State<'_, DbState>,
    id: String,
    semester_id: String,
) -> Result<SchoolAccount, String> {
    let db_state = state.0.clone(); // Use clone if available
    
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db_state.get_connection_blocking();
        
        let account_id = Uuid::parse_str(&id)
            .map_err(|e| e.to_string())?;
        let semester_uuid = Uuid::parse_str(&semester_id)
            .map_err(|e| e.to_string())?;

        // Validate semester exists
        db_state.semester_repository.get_semester(&conn, semester_uuid)
            .map_err(|e| format!("Semester validation error: {}", e))?;

        let update = UpdateSchoolAccountRequest {
            last_updated_semester_id: Some(semester_uuid),
            ..Default::default()
        };

        db_state.school_accounts.update_school_account(&conn, account_id, update)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}