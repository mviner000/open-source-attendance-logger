use tauri::State;
use crate::DbState;
use uuid::Uuid;
use rusqlite::Result;
use crate::db::school_accounts::{
    SchoolAccount, 
    CreateSchoolAccountRequest, 
    UpdateSchoolAccountRequest
};

#[tauri::command]
pub async fn create_school_account(
    state: State<'_, DbState>,
    account: CreateSchoolAccountRequest,
    username: String,
    password: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.school_accounts.create_school_account(&conn, account)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_school_account(
    state: State<'_, DbState>,
    id: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().read().map_err(|e| e.to_string())?;
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    
    state.0.school_accounts.get_school_account(&conn, uuid)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_school_account_by_school_id(
    state: State<'_, DbState>,
    school_id: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().read().map_err(|e| e.to_string())?;
    
    state.0.school_accounts.get_school_account_by_school_id(&conn, &school_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_school_account(
    state: State<'_, DbState>,
    id: String,
    account: UpdateSchoolAccountRequest,
    username: String,
    password: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.school_accounts.update_school_account(&conn, uuid, account)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn delete_school_account(
    state: State<'_, DbState>,
    id: String,
    username: String,
    password: String
) -> Result<(), String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.school_accounts.delete_school_account(&conn, uuid)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_all_school_accounts(
    state: State<'_, DbState>
) -> Result<Vec<SchoolAccount>, String> {
    let conn = state.0.get_connection().read().map_err(|e| e.to_string())?;
    
    state.0.school_accounts.get_all_school_accounts(&conn)
        .map_err(|e| e.to_string())
}