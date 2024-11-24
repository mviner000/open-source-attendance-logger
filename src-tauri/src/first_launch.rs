// src/first_launch.rs
use std::fs;
use log::{info, error};
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::config::{self, Config};
use crate::storage::AppStorage;

pub fn handle_first_launch(app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch configuration...");
    
    // Get storage instance
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;

    // Initialize storage directories
    storage.initialize()
        .map_err(|e| format!("Failed to initialize storage directories: {}", e))?;

    // Load config first since we'll need it in both cases
    let config = config::load_config()?;

    // Check if database_name.txt already exists
    if let Ok(db_name) = config::load_database_name() {
        info!("Found existing database_name.txt: using database '{}'", db_name);
        let db_path = storage.get_database_path(&db_name);
        
        // Open a new connection specifically for initialization
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        // Initialize auth database
        let auth_db = AuthDatabase::init(&conn)
            .map_err(|e| format!("Failed to initialize auth database: {}", e))?;

        // Check if users exist and create if they don't
        if !auth_db.user_exists(&conn)? {
            info!("No existing users found in existing database, creating new user from config file");
            let auth_credentials = AuthCredentials {
                username: config.username.clone(),
                password: config.password.clone(),
            };
            
            auth_db.create_user(&conn, &auth_credentials)?;
            info!("Successfully created user in existing database");
        }
        
        return Ok(());
    }

    // If database_name.txt doesn't exist, proceed with new database setup
    info!("No database_name.txt found, creating new database setup");
    
    // Save the database name to database_name.txt
    config::save_database_name(&config.database.database_name)?;
    
    // Get database path
    let db_path = storage.get_database_path(&config.database.database_name);
    
    // Open a new connection specifically for setup
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Initialize auth database
    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| format!("Failed to initialize auth database: {}", e))?;

    // Create the initial user
    info!("Creating initial user in new database");
    let auth_credentials = AuthCredentials {
        username: config.username.clone(),
        password: config.password.clone(),
    };
    
    // Create user with the same connection
    auth_db.create_user(&conn, &auth_credentials)?;
    info!("Successfully created initial user");
    
    // Delete config file if present
    if let Some(config_path) = config::get_config_file_path() {
        if config_path.exists() {
            fs::remove_file(&config_path)
                .map_err(|e| format!("Failed to delete config file: {}", e))?;
        }
    }

    Ok(())
}