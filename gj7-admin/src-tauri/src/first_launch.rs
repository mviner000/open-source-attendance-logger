// src/first_launch.rs

use std::fs;
use log::info;
use rusqlite::Connection;
use tauri::AppHandle;
use crate::db::auth::{AuthDatabase, Credentials as AuthCredentials};
use crate::db::purpose::{PurposeRepository, SqlitePurposeRepository, CreatePurposeRequest};
use crate::db::settings_styles::{SettingsStylesDatabase, CreateSettingsStyleRequest};
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
        match purpose_repo.get_purpose_by_label(conn, &purpose_req.label) {
            Ok(_) => {
                info!("Purpose '{}' already exists, skipping", purpose_req.label);
                continue;
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                purpose_repo.create_purpose(conn, purpose_req.clone())
                    .map_err(|e| format!("Failed to create purpose {}: {}", purpose_req.label, e.to_string()))?;
                info!("Created initial purpose: {}", purpose_req.label);
            }
            Err(e) => return Err(format!("Error checking purpose existence: {}", e.to_string())),
        }
    }

    Ok(())
}

fn create_initial_settings_styles(conn: &Connection) -> Result<(), String> {
    let settings_styles_db = SettingsStylesDatabase;
    
    let initial_styles = vec![
        CreateSettingsStyleRequest {
            component_name: "navbar-color".to_string(),
            tailwind_classes: "bg-[#0D2F16]".to_string(),
            label: None,
        },
        CreateSettingsStyleRequest {
            component_name: "brand-name".to_string(),
            tailwind_classes: "bg-[#00dd4a]".to_string(),
            label: Some("GJC Attendance Server".to_string()),
        },
    ];

    for style_req in initial_styles {
        match settings_styles_db.get_settings_style_by_component_name(conn, &style_req.component_name) {
            Ok(_) => {
                info!("Settings style '{}' already exists, skipping", style_req.component_name);
                continue;
            }
            Err(_) => {
                settings_styles_db.create_settings_style(conn, style_req.clone())
                    .map_err(|e| format!("Failed to create settings style {}: {}", style_req.component_name, e))?;
                info!("Created initial settings style: {}", style_req.component_name);
            }
        }
    }

    Ok(())
}

pub fn handle_first_launch(_app_handle: &AppHandle) -> Result<(), String> {
    info!("Checking for first launch configuration...");
    
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;
    
    storage.initialize()
        .map_err(|e| format!("Failed to initialize storage directories: {}", e.to_string()))?;
    
    if let Ok(existing_db_name) = config::load_database_name() {
        info!("Database name already exists: {}", existing_db_name);
        return Ok(());
    }
    
    let config = config::load_config()
        .map_err(|_| "No existing database and config file not found".to_string())?;
    
    config::save_database_name(&config.database.database_name)
        .map_err(|e| e.to_string())?;
    
    let db_path = storage.get_database_path(&config.database.database_name);
    
    let conn = Connection::open(&db_path)
        .map_err(|e| e.to_string())?;
    
    let auth_db = AuthDatabase::init(&conn)
        .map_err(|e| e.to_string())?;

    // Initialize settings styles database
    SettingsStylesDatabase::init(&conn)
        .map_err(|e| e.to_string())?;

    // Initialize purposes table
    crate::db::purpose::create_purposes_table(&conn)
        .map_err(|e| e.to_string())?;
    
    if !auth_db.user_exists(&conn)
        .map_err(|e| e.to_string())? 
    {
        info!("Creating initial user in database");
        let auth_credentials = AuthCredentials {
            username: config.username.clone(),
            password: config.password.clone(),
        };
        
        auth_db.create_user(&conn, &auth_credentials)
            .map_err(|e| e.to_string())?;
    }

    // Create initial purposes and settings styles
    create_initial_purposes(&conn)?;
    create_initial_settings_styles(&conn)?;
    
    let config_path = storage.get_config_file_path();
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to delete config file: {}", e.to_string()))?;
        info!("Successfully deleted config file after initial setup");
    }
    
    Ok(())
}