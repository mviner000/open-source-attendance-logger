// src/purpose_commands.rs

use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::purpose::{Purpose, CreatePurposeRequest};
use rusqlite::Result;

#[tauri::command]
pub async fn create_purpose(
    state: State<'_, DbState>,
    purpose: CreatePurposeRequest,
    username: String,
    password: String
) -> Result<Purpose, String> {
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.purpose_repository.create_purpose(&conn, purpose)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_all_purposes(
    state: State<'_, DbState>,
    include_deleted: bool
) -> Result<Vec<Purpose>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.purpose_repository.get_all_purposes(&conn, include_deleted)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purpose(
    state: State<'_, DbState>,
    id: String
) -> Result<Purpose, String> {
    let purpose_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let conn = state.0.get_cloned_connection();
    state.0.purpose_repository.get_purpose(&conn, purpose_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purpose_by_label(
    state: State<'_, DbState>,
    label: String
) -> Result<Purpose, String> {
    let conn = state.0.get_cloned_connection();
    state.0.purpose_repository.get_purpose_by_label(&conn, &label)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_purpose(
    state: State<'_, DbState>,
    id: String,
    purpose: CreatePurposeRequest,
    username: String,
    password: String
) -> Result<Purpose, String> {
    let purpose_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.purpose_repository.update_purpose(&conn, purpose_id, purpose)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn soft_delete_purpose(
    state: State<'_, DbState>,
    id: String,
    username: String,
    password: String
) -> Result<(), String> {
    let purpose_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.purpose_repository.soft_delete_purpose(&conn, purpose_id)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn restore_purpose(
    state: State<'_, DbState>,
    id: String,
    username: String,
    password: String
) -> Result<(), String> {
    let purpose_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.purpose_repository.restore_purpose(&conn, purpose_id)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}