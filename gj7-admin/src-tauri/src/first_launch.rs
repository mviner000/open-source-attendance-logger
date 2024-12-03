// src/first_launch.rs
use std::fs;
use log::info;
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::db::purpose::{PurposeRepository, SqlitePurposeRepository, CreatePurposeRequest};
use crate::config;
use crate::storage::AppStorage;

fn create_initial_purposes(conn: &Connection) -> Result<(), String> {
    let purpose_repo = SqlitePurposeRepository;
    
    let initial_purposes = vec![
        CreatePurposeRequest { label: "Research".to_string(), icon_name: "folder-search".to_string() },
        CreatePurposeRequest { label: "Clearance".to_string(), icon_name: "notebook-pen".to_string() },
        CreatePurposeRequest { label: "Meeting".to_string(), icon_name: "podcast".to_string() },
        CreatePurposeRequest { label: "Transaction".to_string(), icon_name: "hand-coins".to_string() },
        CreatePurposeRequest { label: "SilverStar".to_string(), icon_name: "sparkles".to_string() },
        CreatePurposeRequest { label: "Reading/Study/Review".to_string(), icon_name: "bookmark".to_string() },
        CreatePurposeRequest { label: "Xerox".to_string(), icon_name: "file-stack".to_string() },
        CreatePurposeRequest { label: "Print".to_string(), icon_name: "printer".to_string() },
        CreatePurposeRequest { label: "ComputerUse".to_string(), icon_name: "computer".to_string() },
    ];

    for purpose_req in initial_purposes {
        // Check if purpose already exists before creating
        match purpose_repo.get_purpose_by_label(conn, &purpose_req.label) {
            Ok(_) => {
                info!("Purpose '{}' already exists, skipping", purpose_req.label);
                continue;
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Purpose doesn't exist, so create it
                purpose_repo.create_purpose(conn, purpose_req.clone())
                    .map_err(|e| format!("Failed to create purpose {}: {}", purpose_req.label, e))?;
                info!("Created initial purpose: {}", purpose_req.label);
            }
            Err(e) => return Err(format!("Error checking purpose existence: {}", e)),
        }
    }

    Ok(())
}


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

    // Create purposes table BEFORE trying to create initial purposes
    crate::db::purpose::create_purposes_table(&conn)
        .map_err(|e| format!("Failed to create purposes table: {}", e))?;
    
    // Create initial user if not exists
    if !auth_db.user_exists(&conn)? {
        info!("Creating initial user in database");
        let auth_credentials = AuthCredentials {
            username: config.username.clone(),
            password: config.password.clone(),
        };
        
        auth_db.create_user(&conn, &auth_credentials)?;
    }

    // Create initial purposes
    create_initial_purposes(&conn)?;
    
    // Delete config file
    let config_path = storage.get_config_file_path();
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to delete config file: {}", e))?;
        info!("Successfully deleted config file after initial setup");
    }
    
    Ok(())
}