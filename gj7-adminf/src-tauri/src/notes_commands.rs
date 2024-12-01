// src/notes_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::notes::{Note, CreateNoteRequest, UpdateNoteRequest};
use rusqlite::Result;

#[tauri::command]
pub async fn create_note(
    state: State<'_, DbState>,
    note: CreateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.create_note(&conn, note)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn get_all_notes(
    state: State<'_, DbState>
) -> Result<Vec<Note>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.notes.get_all_notes(&conn)
}

#[tauri::command]
pub async fn get_note(
    state: State<'_, DbState>,
    id: i64
) -> Result<Note, String> {
    let conn = state.0.get_cloned_connection();
    state.0.notes.get_note(&conn, id)
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, DbState>,
    id: i64,
    note: UpdateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.update_note(&conn, id, note)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn delete_note(
    state: State<'_, DbState>,
    id: i64,
    username: String,
    password: String
) -> Result<(), String> {
    let conn = state.0.get_cloned_connection();
    
    if state.0.auth.authenticate(&conn, &username, &password)? {
        state.0.notes.delete_note(&conn, id)
    } else {
        Err("Authentication failed".to_string())
    }
}

#[tauri::command]
pub async fn search_notes(
    state: State<'_, DbState>,
    query: String
) -> Result<Vec<Note>, String> {
    let conn = state.0.get_cloned_connection();
    state.0.notes.search_notes(&conn, &query)
}