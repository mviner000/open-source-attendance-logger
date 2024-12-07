// src/attendance_commands.rs
use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::attendance::{Attendance, CreateAttendanceRequest, UpdateAttendanceRequest};
use rusqlite::Result;
use std::sync::Arc;

#[tauri::command]
pub async fn create_attendance(
    state: State<'_, DbState>,
    attendance: CreateAttendanceRequest,
    username: String,
    password: String
) -> Result<Attendance, String> {
    let db = state.0.clone();
    let auth = db.auth.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            attendance_repo.create_attendance(conn, attendance)
        } else {
            Err(rusqlite::Error::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_all_attendances(
    state: State<'_, DbState>
) -> Result<Vec<Attendance>, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        attendance_repo.get_all_attendances(conn)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attendance(
    state: State<'_, DbState>,
    id: Uuid
) -> Result<Attendance, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        attendance_repo.get_attendance(conn, id)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_attendance(
    state: State<'_, DbState>,
    id: Uuid,
    attendance: UpdateAttendanceRequest,
    username: String,
    password: String
) -> Result<Attendance, String> {
    let db = state.0.clone();
    let auth = db.auth.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            attendance_repo.update_attendance(conn, id, attendance)
        } else {
            Err(rusqlite::Error::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn delete_attendance(
    state: State<'_, DbState>,
    id: Uuid,
    username: String,
    password: String
) -> Result<(), String> {
    let db = state.0.clone();
    let auth = db.auth.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            attendance_repo.delete_attendance(conn, id)
        } else {
            Err(rusqlite::Error::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_attendances_by_semester(
    state: State<'_, DbState>,
    semester_id: Uuid
) -> Result<Vec<Attendance>, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        attendance_repo.get_attendances_by_semester(conn, semester_id)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attendances_by_school_account(
    state: State<'_, DbState>,
    school_account_id: Uuid
) -> Result<Vec<Attendance>, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        attendance_repo.get_attendances_by_school_account(conn, school_account_id)
    }).await.map_err(|e| e.to_string())
}