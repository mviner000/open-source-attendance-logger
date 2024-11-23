// lib.rs
mod db;
mod network;

use tauri::Manager;
use db::{Database, Note, CreateNoteRequest, UpdateNoteRequest};
use rusqlite::Result;
use network::{start_network_monitoring, check_network};

pub struct DbState(pub Database);

// Implement Send and Sync for DbState
unsafe impl Send for DbState {}
unsafe impl Sync for DbState {}

// Create a new note
#[tauri::command]
async fn create_note(
    state: tauri::State<'_, DbState>,
    note: CreateNoteRequest
) -> Result<Note, String> {
    state.0.create_note(note)
}

// Get all notes
#[tauri::command]
async fn get_all_notes(
    state: tauri::State<'_, DbState>
) -> Result<Vec<Note>, String> {
    state.0.get_all_notes()
}

// Get a single note
#[tauri::command]
async fn get_note(
    state: tauri::State<'_, DbState>,
    id: i64
) -> Result<Note, String> {
    state.0.get_note(id)
}

// Update a note
#[tauri::command]
async fn update_note(
    state: tauri::State<'_, DbState>,
    id: i64,
    note: UpdateNoteRequest
) -> Result<Note, String> {
    state.0.update_note(id, note)
}

// Delete a note
#[tauri::command]
async fn delete_note(
    state: tauri::State<'_, DbState>,
    id: i64
) -> Result<(), String> {
    state.0.delete_note(id)
}

// Search notes
#[tauri::command]
async fn search_notes(
    state: tauri::State<'_, DbState>,
    query: String
) -> Result<Vec<Note>, String> {
    state.0.search_notes(&query)
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
            
            // Start network monitoring - Fixed: Clone the app_handle
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_network_monitoring(app_handle).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_note,
            get_all_notes,
            get_note,
            update_note,
            delete_note,
            search_notes,
            check_network
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}