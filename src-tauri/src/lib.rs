// lib.rs
mod db;
mod network;

use tauri::Manager;
use db::{Database, Note, CreateNoteRequest, UpdateNoteRequest, Credentials};
use rusqlite::Result;
use network::{start_network_monitoring, check_network};

pub struct DbState(pub Database);

// Implement Send and Sync for DbState
unsafe impl Send for DbState {}
unsafe impl Sync for DbState {}


#[tauri::command]
async fn authenticate(
    state: tauri::State<'_, DbState>,
    username: String,
    password: String
) -> Result<bool, String> {
    state.0.authenticate(&username, &password)
}

// Create a new note with authentication
#[tauri::command]
async fn create_note(
    state: tauri::State<'_, DbState>,
    note: CreateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    if state.0.authenticate(&username, &password)? {
        state.0.create_note(note)
    } else {
        Err("Authentication failed".to_string())
    }
}

// Get all notes (no auth needed for reading)
#[tauri::command]
async fn get_all_notes(
    state: tauri::State<'_, DbState>
) -> Result<Vec<Note>, String> {
    state.0.get_all_notes()
}

// Get a single note (no auth needed for reading)
#[tauri::command]
async fn get_note(
    state: tauri::State<'_, DbState>,
    id: i64
) -> Result<Note, String> {
    state.0.get_note(id)
}

// Update a note with authentication
#[tauri::command]
async fn update_note(
    state: tauri::State<'_, DbState>,
    id: i64,
    note: UpdateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    if state.0.authenticate(&username, &password)? {
        state.0.update_note(id, note)
    } else {
        Err("Authentication failed".to_string())
    }
}

// Delete a note with authentication
#[tauri::command]
async fn delete_note(
    state: tauri::State<'_, DbState>,
    id: i64,
    username: String,
    password: String
) -> Result<(), String> {
    if state.0.authenticate(&username, &password)? {
        state.0.delete_note(id)
    } else {
        Err("Authentication failed".to_string())
    }
}

// Search notes (no auth needed for reading)
#[tauri::command]
async fn search_notes(
    state: tauri::State<'_, DbState>,
    query: String
) -> Result<Vec<Note>, String> {
    state.0.search_notes(&query)
}

// Add this new command
#[tauri::command]
async fn get_credentials(
    state: tauri::State<'_, DbState>,
) -> Result<Credentials, String> {
    state.0.get_credentials()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database
            let db = db::init_db(app.handle())
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
            get_credentials
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}