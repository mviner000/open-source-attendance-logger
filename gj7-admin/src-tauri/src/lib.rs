// src/lib.rs server pc codes

pub mod db;
mod network;
mod first_launch;
mod config;
mod storage;
mod notes_commands;
mod school_account_commands;
mod csv_commands;
mod semester_commands;
mod purpose_commands;
mod attendance_commands;
mod network_server;
mod websocket;

use tauri::Manager;
use tauri::Emitter;
use tokio;
use db::{Database, init_db, DatabaseInfo};
use db::auth::Credentials;
use rusqlite::Result;
use network::{start_network_monitoring, check_network};
use first_launch::handle_first_launch;
use network_server::start_network_server;
use log::error;
use storage::AppStorage;
use std::time::Duration;

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
    let conn = state.0.get_cloned_connection();
    state.0.auth.authenticate(&conn, &username, &password)
}

#[tauri::command]
async fn get_credentials(
    state: tauri::State<'_, DbState>,
) -> Result<Credentials, String> {
    let conn = state.0.get_cloned_connection();
    state.0.auth.get_credentials(&conn)
}

#[tauri::command]
async fn get_database_info(
    state: tauri::State<'_, DbState>
) -> Result<DatabaseInfo, String> {
    state.0.get_database_info().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    // Use Tauri's async runtime to run the application
    tauri::async_runtime::block_on(async {
        tauri::Builder::default()
            // Initialize Tauri plugins
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            
            // Setup function for application initialization
            .setup(|app| {
                // Get window references
                let splashscreen_window = app.get_webview_window("splashscreen").unwrap();
                let main_window = app.get_webview_window("main").unwrap();

                // Clone app handle for async operations
                let app_handle = app.handle().clone();

                // Spawn splashscreen and window management task
                tauri::async_runtime::spawn(async move {
                    // Simulate initial setup time
                    tokio::time::sleep(Duration::from_secs(3)).await;
                
                    // Close splashscreen and show main window
                    app_handle.emit("close-splashscreen", ()).unwrap();
                    app_handle.get_webview_window("splashscreen").unwrap().close().unwrap();
                    app_handle.get_webview_window("main").unwrap().show().unwrap();
                });

                // Initialize application storage
                if let Some(storage) = AppStorage::new() {
                    if let Err(e) = storage.initialize() {
                        error!("Failed to initialize storage directories: {}", e);
                        return Ok(());
                    }
                } else {
                    error!("Failed to create storage instance");
                    return Ok(());
                }

                // Handle first launch processes
                match handle_first_launch(&app.handle()) {
                    Ok(_) => (),
                    Err(e) => {
                        error!("Failed to handle first launch: {}", e);
                        return Ok(());
                    }
                }

                // Spawn database and network server initialization
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // Initialize database
                    let db = match init_db(&app_handle) {
                        Ok(db) => db,
                        Err(e) => {
                            error!("Failed to initialize database: {}", e);
                            return;
                        }
                    };
                    
                    // Manage database state
                    app_handle.manage(DbState(db.clone()));

                    // Start network server
                    if let Err(e) = start_network_server(db).await {
                        error!("Failed to start network server: {}", e);
                        app_handle.emit("network-server-error", e.to_string()).unwrap();
                    }
                });

                Ok(())
            })
            
            // Define invoke handlers for various commands
            .invoke_handler(tauri::generate_handler![
                // Authentication
                authenticate,
                get_credentials,
                get_database_info,

                // Notes commands
                notes_commands::create_note,
                notes_commands::get_all_notes,
                notes_commands::get_note,
                notes_commands::update_note,
                notes_commands::delete_note,
                notes_commands::search_notes,

                // School account commands
                school_account_commands::get_all_school_accounts,
                school_account_commands::get_paginated_school_accounts,
                school_account_commands::get_school_account_with_semester,
                school_account_commands::update_school_account_semester,
                school_account_commands::get_dashboard_stats,

                // CSV commands
                csv_commands::validate_csv_file,
                csv_commands::import_csv_file,
                csv_commands::check_existing_accounts,

                // Semester commands
                semester_commands::create_semester,
                semester_commands::get_all_semesters,
                semester_commands::get_semester,
                semester_commands::get_semester_by_label,
                semester_commands::update_semester,
                semester_commands::delete_semester,
                semester_commands::set_active_semester,

                // Purpose commands
                purpose_commands::create_purpose,
                purpose_commands::get_all_purposes,
                purpose_commands::get_purpose,
                purpose_commands::get_purpose_by_label,
                purpose_commands::update_purpose,
                purpose_commands::soft_delete_purpose,
                purpose_commands::restore_purpose,

                // Attendance commands
                attendance_commands::create_attendance,
                attendance_commands::get_all_attendances,
                attendance_commands::get_attendance,
                attendance_commands::update_attendance,
                attendance_commands::delete_attendance,
                attendance_commands::get_attendances_by_semester,
                attendance_commands::get_attendances_by_school_account,

                // Network check
                check_network
            ])
            
            // Run the Tauri application
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}