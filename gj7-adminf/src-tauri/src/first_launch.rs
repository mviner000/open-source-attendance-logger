// src/first_launch.rs
use std::fs;
use log::info;
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::config;
use crate::storage::AppStorage;

pub fn handle_first_launch(_app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch configuration...");
    
    // Get storage instance
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;
    
    // Initialize storage directories
    storage.initialize()
        .map_err(|e| format!("Failed to initialize storage directories: {}", e))?;
    
    // Check if database_name.txt already exists
    if let Ok(existing_db_name) = config::load_database_name() {
        info!("Database name already exists: {}", existing_db_name);
        return Ok(());
    }
    
    // If no database_name.txt, try to load config
    let config = config::load_config()
        .map_err(|_| "No existing database and config file not found".to_string())?;
    
    // Save database name to database_name.txt
    config::save_database_name(&config.database.database_name)?;
    
    // Get database path
    let db_path = storage.get_database_path(&config.database.database_name);
    
    // Open database connection
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Initialize auth database
    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| format!("Failed to initialize auth database: {}", e))?;
    
    // Create initial user if not exists
    if !auth_db.user_exists(&conn)? {
        info!("Creating initial user in database");
        let auth_credentials = AuthCredentials {
            username: config.username.clone(),
            password: config.password.clone(),
        };
        
        auth_db.create_user(&conn, &auth_credentials)?;
    }
    
    // Delete config file
    let config_path = storage.get_config_file_path();
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to delete config file: {}", e))?;
        info!("Successfully deleted config file after initial setup");
    }
    
    Ok(())
}