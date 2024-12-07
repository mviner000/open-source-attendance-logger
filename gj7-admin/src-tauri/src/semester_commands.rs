// src/semester_commands.rs
use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::semester::{Semester, CreateSemesterRequest};
use rusqlite::{Result, Error as RusqliteError};

#[tauri::command]
pub async fn create_semester(
    state: State<'_, DbState>,
    semester: CreateSemesterRequest,
    username: String,
    password: String
) -> Result<Semester, String> {
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            semester_repo.create_semester(conn, semester)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_all_semesters(
    state: State<'_, DbState>
) -> Result<Vec<Semester>, String> {
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    
    db.with_connection(move |conn| {
        semester_repo.get_all_semesters(conn)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_semester(
    state: State<'_, DbState>,
    id: String
) -> Result<Semester, String> {
    let semester_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    
    db.with_connection(move |conn| {
        semester_repo.get_semester(conn, semester_id)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_semester_by_label(
    state: State<'_, DbState>,
    label: String
) -> Result<Semester, String> {
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    
    db.with_connection(move |conn| {
        semester_repo.get_semester_by_label(conn, &label)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_semester(
    state: State<'_, DbState>,
    id: String,
    semester: CreateSemesterRequest,
    username: String,
    password: String
) -> Result<Semester, String> {
    let semester_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            semester_repo.update_semester(conn, semester_id, semester)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn delete_semester(
    state: State<'_, DbState>,
    id: String,
    username: String,
    password: String
) -> Result<(), String> {
    let semester_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            semester_repo.delete_semester(conn, semester_id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn set_active_semester(
    state: State<'_, DbState>,
    id: String,
    username: String,
    password: String
) -> Result<Semester, String> {
    let semester_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    
    let db = state.0.clone();
    let semester_repo = db.semester_repository.clone();
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            semester_repo.set_active_semester(conn, semester_id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}