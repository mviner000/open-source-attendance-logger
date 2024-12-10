// src/settings_styles_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::settings_styles::{SettingsStyle, CreateSettingsStyleRequest, UpdateSettingsStyleRequest};
use rusqlite::{Result, Error as RusqliteError};

#[tauri::command]
pub async fn create_settings_style(
    state: State<'_, DbState>,
    settings_style: CreateSettingsStyleRequest,
    username: String,
    password: String
) -> Result<SettingsStyle, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    let auth = db.auth.clone();
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            settings_styles.create_settings_style(conn, settings_style)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn get_settings_style_by_component_name(
    state: State<'_, DbState>,
    component_name: String
) -> Result<SettingsStyle, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    db.with_connection(move |conn| {
        settings_styles.get_settings_style_by_component_name(conn, &component_name)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_settings_styles(
    state: State<'_, DbState>
) -> Result<Vec<SettingsStyle>, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    db.with_connection(move |conn| {
        settings_styles.get_all_settings_styles(conn)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings_style(
    state: State<'_, DbState>,
    id: i64
) -> Result<SettingsStyle, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    db.with_connection(move |conn| {
        settings_styles.get_settings_style(conn, id)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_settings_style(
    state: State<'_, DbState>,
    id: i64,
    settings_style: UpdateSettingsStyleRequest,
    username: String,
    password: String
) -> Result<SettingsStyle, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    let auth = db.auth.clone();
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            settings_styles.update_settings_style(conn, id, settings_style)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn delete_settings_style(
    state: State<'_, DbState>,
    id: i64,
    username: String,
    password: String
) -> Result<(), String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    let auth = db.auth.clone();
    db.with_connection(move |conn| {
        if auth.authenticate(conn, &username, &password)? {
            settings_styles.delete_settings_style(conn, id)
                .map_err(|_| RusqliteError::InvalidQuery)
        } else {
            Err(RusqliteError::QueryReturnedNoRows)
        }
    }).await.map_err(|e| format!("Authentication failed: {}", e.to_string()))
}

#[tauri::command]
pub async fn search_settings_styles(
    state: State<'_, DbState>,
    query: String
) -> Result<Vec<SettingsStyle>, String> {
    let db = state.0.clone();
    let settings_styles = db.settings_styles.clone();
    db.with_connection(move |conn| {
        settings_styles.search_settings_styles(conn, &query)
            .map_err(|_| RusqliteError::InvalidQuery)
    }).await.map_err(|e| e.to_string())
}