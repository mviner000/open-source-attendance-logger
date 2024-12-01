// src/attendance_commands.rs
use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::attendance::{Attendance, CreateAttendanceRequest, UpdateAttendanceRequest};
use rusqlite::Result;

#[tauri::command]
pub async fn create_attendance(
    state: State<'_, DbState>,
    attendance: CreateAttendanceRequest,
    username: String,
    password: String
) -> Result<Attendance, String> {
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.attendance_repository.create_attendance(&conn, attendance)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_all_attendances(
    state: State<'_, DbState>
) -> Result<Vec<Attendance>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.attendance_repository.get_all_attendances(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_attendance(
    state: State<'_, DbState>,
    id: Uuid
) -> Result<Attendance, String> {
    let conn = state.0.get_cloned_connection();
    state.0.attendance_repository.get_attendance(&conn, id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_attendance(
    state: State<'_, DbState>,
    id: Uuid,
    attendance: UpdateAttendanceRequest,
    username: String,
    password: String
) -> Result<Attendance, String> {
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.attendance_repository.update_attendance(&conn, id, attendance)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn delete_attendance(
    state: State<'_, DbState>,
    id: Uuid,
    username: String,
    password: String
) -> Result<(), String> {
    let conn = state.0.get_cloned_connection();
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.attendance_repository.delete_attendance(&conn, id)
            .map_err(|e| e.to_string())
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_attendances_by_semester(
    state: State<'_, DbState>,
    semester_id: Uuid
) -> Result<Vec<Attendance>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.attendance_repository.get_attendances_by_semester(&conn, semester_id)
        .map_err(|e| e.to_string())
}


#[tauri::command]
pub async fn get_attendances_by_school_account(
    state: State<'_, DbState>,
    school_account_id: Uuid
) -> Result<Vec<Attendance>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.attendance_repository.get_attendances_by_school_account(&conn, school_account_id)
        .map_err(|e| e.to_string())
}