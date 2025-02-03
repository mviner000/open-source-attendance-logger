// src/attendance_commands.rs
use tauri::State;
use uuid::Uuid;
use crate::DbState;
use crate::db::attendance::{Attendance, CreateAttendanceRequest, UpdateAttendanceRequest, AttendanceExportError};
use rusqlite::Result;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use std::env;

#[tauri::command]
pub async fn export_attendances_to_csv(
    state: State<'_, DbState>,
    course: Option<String>,
    date: Option<DateTime<Utc>>,
) -> Result<String, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);

    db.with_connection(move |conn| {
        // Get the attendances based on filters
        let attendances = attendance_repo.get_filtered_attendances(conn, course.clone(), date)?;
        
        // Generate filename with timestamp
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let filename = match (course.clone(), date) {
            (Some(c), Some(d)) => format!("attendance_{}_{}_{}.csv", c, d.format("%Y%m%d"), timestamp),
            (Some(c), None) => format!("attendance_{}_{}.csv", c, timestamp),
            (None, Some(d)) => format!("attendance_{}_{}.csv", d.format("%Y%m%d"), timestamp),
            (None, None) => format!("attendance_{}.csv", timestamp),
        };

        // Get downloads directory
        let downloads_dir = if cfg!(target_os = "windows") {
            if let Some(home) = env::var_os("USERPROFILE") {
                PathBuf::from(home).join("Downloads")
            } else {
                return Err(rusqlite::Error::InvalidParameterName("Could not find Downloads directory".to_string()));
            }
        } else {
            if let Some(home) = env::var_os("HOME") {
                PathBuf::from(home).join("Downloads")
            } else {
                return Err(rusqlite::Error::InvalidParameterName("Could not find Downloads directory".to_string()));
            }
        };
        
        // Ensure Downloads directory exists
        if !downloads_dir.exists() {
            return Err(rusqlite::Error::InvalidParameterName("Downloads directory does not exist".to_string()));
        }
            
        let file_path = downloads_dir.join(filename);

        // Export to CSV
        attendance_repo.export_attendances_to_csv(conn, file_path.clone(), attendances)
            .map_err(|e| match e {
                AttendanceExportError::Csv(err) => rusqlite::Error::InvalidParameterName(format!("CSV Error: {}", err)),
                AttendanceExportError::Sqlite(err) => err,
                AttendanceExportError::Io(err) => rusqlite::Error::InvalidParameterName(format!("IO Error: {}", err)),
            })?;

        Ok(file_path.to_string_lossy().to_string())
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_filtered_attendances(
    state: State<'_, DbState>,
    course: Option<String>,
    date: Option<DateTime<Utc>>
) -> Result<Vec<Attendance>, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    db.with_connection(move |conn| {
        attendance_repo.get_filtered_attendances(conn, course, date)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_courses(
    state: State<'_, DbState>
) -> Result<Vec<String>, String> {
    let db = state.0.clone();
    let attendance_repo = Arc::clone(&db.attendance_repository);
    
    db.with_connection(move |conn| {
        attendance_repo.get_all_courses(conn)
    }).await.map_err(|e| e.to_string())
}

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