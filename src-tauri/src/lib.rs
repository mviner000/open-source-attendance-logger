// src/lib.rs

mod db;
mod network;
mod first_launch;
mod config;

use tauri::Manager;
use db::{Database, init_db, DatabaseInfo};
use db::notes::{Note, CreateNoteRequest, UpdateNoteRequest};
use db::auth::Credentials;
use rusqlite::Result;
use network::{start_network_monitoring, check_network};
use first_launch::handle_first_launch;

// Re-export config items that need to be public
pub use crate::config::{Config, DatabaseConfig}; 

pub struct DbState(pub Database);

// Implement Send and Sync for DbState
unsafe impl Send for DbState {}
unsafe impl Sync for DbState {}

#[tauri::command]
async fn get_database_info(
    state: tauri::State<'_, DbState>
) -> Result<DatabaseInfo, String> {
    state.0.get_database_info().map_err(|e| e.to_string())
}

#[tauri::command]
async fn authenticate(
    state: tauri::State<'_, DbState>,
    username: String,
    password: String
) -> Result<bool, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.auth.authenticate(&conn, &username, &password))
}

#[tauri::command]
async fn create_note(
    state: tauri::State<'_, DbState>,
    note: CreateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.create_note(&conn, note)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
async fn get_all_notes(
    state: tauri::State<'_, DbState>
) -> Result<Vec<Note>, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.notes.get_all_notes(&conn))
}

#[tauri::command]
async fn get_note(
    state: tauri::State<'_, DbState>,
    id: i64
) -> Result<Note, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.notes.get_note(&conn, id))
}

#[tauri::command]
async fn update_note(
    state: tauri::State<'_, DbState>,
    id: i64,
    note: UpdateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.update_note(&conn, id, note)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
async fn delete_note(
    state: tauri::State<'_, DbState>,
    id: i64,
    username: String,
    password: String
) -> Result<(), String> {
    let conn = state.0.get_connection().write().map_err(|e| e.to_string())?;
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.delete_note(&conn, id)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
async fn search_notes(
    state: tauri::State<'_, DbState>,
    query: String
) -> Result<Vec<Note>, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.notes.search_notes(&conn, &query))
}

#[tauri::command]
async fn get_credentials(
    state: tauri::State<'_, DbState>,
) -> Result<Credentials, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.auth.get_credentials(&conn))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Handle first launch (installer credentials)
            handle_first_launch(&app.handle())
                .expect("Failed to handle first launch");

            // Initialize database
            let db = init_db(app.handle())
                .expect("Failed to initialize database");
            app.manage(DbState(db));

            // Start network monitoring
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_network_monitoring(app_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            authenticate,
            create_note,
            get_all_notes,
            get_note,
            update_note,
            delete_note,
            search_notes,
            check_network,
            get_credentials,
            get_database_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}