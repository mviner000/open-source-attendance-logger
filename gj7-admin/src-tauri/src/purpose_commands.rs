// src/purpose_commands.rs

use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::purpose::{Purpose, CreatePurposeRequest};
use rusqlite::{Result, Error as RusqliteError};

#[tauri::command]
pub async fn create_purpose(
    state: State<'_, DbState>,
    purpose: CreatePurposeRequest,
    username: String,
    password: String
) -> Result<Purpose, String> {
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            purpose_repo.create_purpose(conn, purpose)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_all_purposes(
    state: State<'_, DbState>,
    include_deleted: bool
) -> Result<Vec<Purpose>, String> {
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    
    db.with_connection(move |conn| {
        purpose_repo.get_all_purposes(conn, include_deleted)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purpose(
    state: State<'_, DbState>,
    id: String
) -> Result<Purpose, String> {
    let purpose_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    
    db.with_connection(move |conn| {
        purpose_repo.get_purpose(conn, purpose_id)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_purpose_by_label(
    state: State<'_, DbState>,
    label: String
) -> Result<Purpose, String> {
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    
    db.with_connection(move |conn| {
        purpose_repo.get_purpose_by_label(conn, &label)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
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
    
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            purpose_repo.update_purpose(conn, purpose_id, purpose)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
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
    
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            purpose_repo.soft_delete_purpose(conn, purpose_id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
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
    
    let db = state.0.clone();
    let purpose_repo = db.purpose_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            purpose_repo.restore_purpose(conn, purpose_id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}