// src/first_launch.rs

use std::fs;
use std::path::PathBuf;
use log::{info, error};
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::config::{self, Config};
use directories::UserDirs;

const APP_NAME: &str = "nameOftheApp";

pub fn handle_first_launch(app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch configuration...");
    
    // Load configuration
    let config = match config::load_config() {
        Ok(config) => config,
        Err(e) => {
            info!("No config file found or error loading: {}", e);
            return Ok(());
        }
    };

    info!("Found config file, attempting to process...");

    // Get database connection
    let db_path = get_database_path(&config.database.database_name)
        .ok_or_else(|| "Failed to determine database path".to_string())?;

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| format!("Failed to initialize auth database: {}", e))?;

    // Check if any users exist
    if !auth_db.user_exists(&conn)? {
        info!("No existing users found, creating new user from config file");
        
        // Convert config credentials to AuthCredentials
        let auth_credentials = convert_credentials(&config);
        
        // Create the new user
        auth_db.create_user(&conn, &auth_credentials)?;
        info!("Successfully created user from config file");

        // Delete the config file
        if let Some(config_path) = config::get_config_file_path() {
            if let Err(e) = fs::remove_file(&config_path) {
                error!("Failed to delete config file: {}", e);
            } else {
                info!("Config file deleted successfully");
            }
        }
    } else {
        info!("Users already exist, skipping credential import");
        // Delete the config file even if we didn't use it
        if let Some(config_path) = config::get_config_file_path() {
            if let Err(e) = fs::remove_file(&config_path) {
                error!("Failed to delete unused config file: {}", e);
            }
        }
    }

    Ok(())
}

// Helper function to convert between credential types
fn convert_credentials(config: &Config) -> AuthCredentials {
    AuthCredentials {
        username: config.username.clone(),
        password: config.password.clone(),
    }
}

fn get_database_path(db_name: &str) -> Option<PathBuf> {
    UserDirs::new().and_then(|user_dirs| {
        user_dirs.document_dir().map(|documents_dir| {
            let db_path = documents_dir
                .join(APP_NAME)
                .join(format!("{}.db", db_name));
            
            // Ensure the directory exists
            if let Some(parent) = db_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            
            db_path
        })
    })
}