// src/notes_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::notes::{Note, CreateNoteRequest, UpdateNoteRequest};
use rusqlite::{Result, Error as RusqliteError};

#[tauri::command]
pub async fn create_note(
    state: State<'_, DbState>,
    note: CreateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            notes.create_note(conn, note)
                .map_err(|e| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_all_notes(
    state: State<'_, DbState>
) -> Result<Vec<Note>, String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    
    db.with_connection(move |conn| {
        notes.get_all_notes(conn)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_note(
    state: State<'_, DbState>,
    id: i64
) -> Result<Note, String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    
    db.with_connection(move |conn| {
        notes.get_note(conn, id)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, DbState>,
    id: i64,
    note: UpdateNoteRequest,
    username: String,
    password: String
) -> Result<Note, String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            notes.update_note(conn, id, note)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn delete_note(
    state: State<'_, DbState>,
    id: i64,
    username: String,
    password: String
) -> Result<(), String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    let auth = db.auth.clone();
    
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            notes.delete_note(conn, id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn search_notes(
    state: State<'_, DbState>,
    query: String
) -> Result<Vec<Note>, String> {
    let db = state.0.clone();
    let notes = db.notes.clone(); // Clone the NotesDatabase
    
    db.with_connection(move |conn| {
        notes.search_notes(conn, &query)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}