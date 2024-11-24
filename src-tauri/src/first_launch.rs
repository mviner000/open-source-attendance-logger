// src/first_launch.rs
use std::fs;
use std::path::PathBuf;
use quick_xml::de::from_str;
use log::{info, error};
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials};
use directories::UserDirs;

const CREDENTIALS_FILE: &str = "credentials.xml";
const APP_NAME: &str = "nameOftheApp";

pub fn handle_first_launch(app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch credentials...");
    
    // Get credentials file path
    let credentials_path = get_credentials_file_path()
        .ok_or_else(|| "Failed to determine credentials file path".to_string())?;

    // If credentials file doesn't exist, return early
    if !credentials_path.exists() {
        info!("No credentials file found");
        return Ok(());
    }

    info!("Found credentials file, attempting to process...");

    // Read and parse credentials
    let credentials_str = fs::read_to_string(&credentials_path)
        .map_err(|e| format!("Failed to read credentials file: {}", e))?;

    let credentials: Credentials = from_str(&credentials_str)
        .map_err(|e| format!("Failed to parse credentials XML: {}", e))?;

    // Get database connection
    let db_path = get_database_path()
        .ok_or_else(|| "Failed to determine database path".to_string())?;

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| format!("Failed to initialize auth database: {}", e))?;

    // Check if any users exist
    if !auth_db.user_exists(&conn)? {
        info!("No existing users found, creating new user from credentials file");
        
        // Create the new user
        auth_db.create_user(&conn, &credentials)?;
        info!("Successfully created user from credentials file");

        // Delete the credentials file
        fs::remove_file(&credentials_path)
            .map_err(|e| format!("Failed to delete credentials file: {}", e))?;

        info!("Credentials file deleted");
    } else {
        info!("Users already exist, skipping credential import");
        // Delete the credentials file even if we didn't use it
        if let Err(e) = fs::remove_file(&credentials_path) {
            error!("Failed to delete unused credentials file: {}", e);
        }
    }

    Ok(())
}

fn get_credentials_file_path() -> Option<PathBuf> {
    UserDirs::new().and_then(|user_dirs| {
        user_dirs.document_dir().map(|documents_dir| {
            documents_dir.join(APP_NAME).join(CREDENTIALS_FILE)
        })
    })
}

fn get_database_path() -> Option<PathBuf> {
    UserDirs::new().and_then(|user_dirs| {
        user_dirs.document_dir().map(|documents_dir| {
            documents_dir.join(APP_NAME).join("notes.db")
        })
    })
}