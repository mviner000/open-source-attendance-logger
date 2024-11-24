use std::fs;
use std::path::PathBuf;
use log::{info, error};
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::config::{self, Config};

pub fn handle_first_launch(app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch configuration...");
    
    // Check if database_name.txt already exists
    if let Ok(db_name) = config::load_database_name() {
        info!("Found existing database_name.txt: using database '{}'", db_name);
        let db_path = get_database_path(&db_name)
            .ok_or_else(|| "Failed to determine database path".to_string())?;
        
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        AuthDatabase::init(&conn)
            .map_err(|e| format!("Failed to initialize auth database: {}", e))?;
        
        return Ok(()); // Skip config.xml processing
    }

    // If database_name.txt doesn't exist, proceed with config.xml logic
    let config = config::load_config()?;

    // Save the database name to database_name.txt
    config::save_database_name(&config.database.database_name)?;

    let db_path = get_database_path(&config.database.database_name)
        .ok_or_else(|| "Failed to determine database path".to_string())?;

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| format!("Failed to initialize auth database: {}", e))?;

    if !auth_db.user_exists(&conn)? {
        info!("No existing users found, creating new user from config file");
        
        let auth_credentials = AuthCredentials {
            username: config.username.clone(),
            password: config.password.clone(),
        };

        auth_db.create_user(&conn, &auth_credentials)?;
        info!("Successfully created user from config file");

        if let Some(config_path) = config::get_config_file_path() {
            fs::remove_file(&config_path)
                .map_err(|e| format!("Failed to delete config file: {}", e))?;
        }
    } else {
        info!("Users already exist, skipping credential import");
        if let Some(config_path) = config::get_config_file_path() {
            fs::remove_file(&config_path)
                .map_err(|e| format!("Failed to delete unused config file: {}", e))?;
        }
    }
    Ok(())
}

// Get database path utility
fn get_database_path(db_name: &str) -> Option<PathBuf> {
    config::get_config_file_path().map(|path| path.with_file_name(format!("{}.db", db_name)))
}
