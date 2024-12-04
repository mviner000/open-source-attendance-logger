// src/semester_commands.rs
use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::semester::{Semester, CreateSemesterRequest};
use rusqlite::Result;

#[tauri::command]
pub async fn create_semester(
    state: State<'_, DbState>,
    semester: CreateSemesterRequest,
    username: String,
    password: String
) -> Result<Semester, String> {
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.semester_repository.create_semester(&conn, semester)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_all_semesters(
    state: State<'_, DbState>
) -> Result<Vec<Semester>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.semester_repository.get_all_semesters(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_semester(
    state: State<'_, DbState>,
    id: String
) -> Result<Semester, String> {
    let semester_id = Uuid::parse_str(&id)
        .map_err(|e| format!("Invalid UUID format: {}", e))?;
    let conn = state.0.get_cloned_connection();
    state.0.semester_repository.get_semester(&conn, semester_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_semester_by_label(
    state: State<'_, DbState>,
    label: String
) -> Result<Semester, String> {
    let conn = state.0.get_cloned_connection();
    state.0.semester_repository.get_semester_by_label(&conn, &label)
        .map_err(|e| e.to_string())
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
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.semester_repository.update_semester(&conn, semester_id, semester)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
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
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.semester_repository.delete_semester(&conn, semester_id)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
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
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.semester_repository.set_active_semester(&conn, semester_id)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}