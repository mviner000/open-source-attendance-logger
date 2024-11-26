// src/school_account_commands.rs

use tauri::State;
use crate::DbState;
use uuid::Uuid;
use rusqlite::Result;
use crate::db::school_accounts::{
    SchoolAccount, 
    CreateSchoolAccountRequest, 
    UpdateSchoolAccountRequest
};
use std::path::Path;
use crate::db::csv_import::{import_csv, CsvImportResult};

#[tauri::command]

pub async fn import_school_accounts_csv(

    state: State<'_, DbState>,

    csv_path: String

) -> Result<CsvImportResult, String> {

    println!("Received CSV import request for path: {}", csv_path); // Add this line

    

    let conn = state.0.get_connection();

    let write_guard = conn.write();

    let path = Path::new(&csv_path);

    

    if !path.exists() {

        println!("CSV file does not exist: {}", csv_path); // Add this line

        return Err("CSV file does not exist".to_string());

    }


    match import_csv(write_guard, path) {

        Ok(result) => {

            println!("CSV import result: {:?}", result); // Add this line

            Ok(result)

        },

        Err(e) => {

            println!("CSV import error: {}", e); // Add this line

            Err(e)

        }

    }

}

#[tauri::command]
pub async fn create_school_account(
    state: State<'_, DbState>,
    account: CreateSchoolAccountRequest
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().write();
    state.0.school_accounts.create_school_account(&conn, account)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_school_account(
    state: State<'_, DbState>,
    id: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().read();
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    state.0.school_accounts.get_school_account(&conn, uuid)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_school_account_by_school_id(
    state: State<'_, DbState>,
    school_id: String
) -> Result<SchoolAccount, String> {
    let conn = state.0.get_connection().read();
    state.0.school_accounts.get_school_account_by_school_id(&conn, &school_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_school_account(
    state: State<'_, DbState>,
    id: String,
    account: serde_json::Value
) -> Result<SchoolAccount, String> {
    // Debug print the raw input
    println!("Received account update: {:?}", account);

    // Extract the actual account data
    let update_request: UpdateSchoolAccountRequest = serde_json::from_value(account)
        .map_err(|e| format!("Failed to deserialize account: {}", e))?;

    let conn = state.0.get_connection().write();
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    state.0.school_accounts.update_school_account(&conn, uuid, update_request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_school_account(
    state: State<'_, DbState>,
    id: String
) -> Result<(), String> {
    let conn = state.0.get_connection().write();
    let uuid = Uuid::parse_str(&id).map_err(|_| "Invalid UUID".to_string())?;
    state.0.school_accounts.delete_school_account(&conn, uuid)
        .map_err(|e| e.to_string())
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
pub async fn search_school_accounts(
    state: State<'_, DbState>,
    query: String
) -> Result<Vec<SchoolAccount>, String> {
    let conn = state.0.get_connection().read();
    
    state.0.school_accounts.search_school_accounts(&conn, &query)
        .map_err(|e| e.to_string())
}