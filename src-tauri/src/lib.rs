mod db;
mod network;
mod first_launch;
mod config;
mod storage;
mod notes_commands;
mod school_account_commands; // New module for school account-related commands

use tauri::Manager;
use db::{Database, init_db, DatabaseInfo};
use db::auth::Credentials;
use rusqlite::Result;
use network::{start_network_monitoring, check_network};
use first_launch::handle_first_launch;
use log::error;
use storage::AppStorage;
use uuid::Uuid;

pub use crate::config::{Config, DatabaseConfig}; 

pub struct DbState(pub Database);

unsafe impl Send for DbState {}
unsafe impl Sync for DbState {}

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
async fn get_credentials(
    state: tauri::State<'_, DbState>,
) -> Result<Credentials, String> {
    state.0.get_connection()
        .read()
        .map_err(|e| e.to_string())
        .and_then(|conn| state.0.auth.get_credentials(&conn))
}

#[tauri::command]
async fn get_database_info(
    state: tauri::State<'_, DbState>
) -> Result<DatabaseInfo, String> {
    state.0.get_database_info().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Some(storage) = AppStorage::new() {
                if let Err(e) = storage.initialize() {
                    error!("Failed to initialize storage directories: {}", e);
                    return Ok(());
                }
            } else {
                error!("Failed to create storage instance");
                return Ok(());
            }

            match handle_first_launch(&app.handle()) {
                Ok(_) => (),
                Err(e) => {
                    error!("Failed to handle first launch: {}", e);
                    return Ok(());
                }
            }

            let db = match init_db(&app.handle()) {
                Ok(db) => db,
                Err(e) => {
                    error!("Failed to initialize database: {}", e);
                    return Ok(());
                }
            };
            
            app.manage(DbState(db));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_network_monitoring(app_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            authenticate,
            notes_commands::create_note,
            notes_commands::get_all_notes,
            notes_commands::get_note,
            notes_commands::update_note,
            notes_commands::delete_note,
            notes_commands::search_notes,
            school_account_commands::create_school_account,
            school_account_commands::get_school_account,
            school_account_commands::get_school_account_by_school_id,
            school_account_commands::update_school_account,
            school_account_commands::delete_school_account,
            school_account_commands::get_all_school_accounts,
            school_account_commands::search_school_accounts,
            check_network,
            get_credentials,
            get_database_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}