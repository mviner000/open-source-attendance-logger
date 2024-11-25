// src/config.rs
use crate::storage::AppStorage;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use quick_xml::de::from_str;

const APP_NAME: &str = "nameOftheApp";
const CONFIG_FILE: &str = "config.xml";
const DATABASE_NAME_FILE: &str = "database_name.txt";

#[derive(Debug, Deserialize)]
#[serde(rename = "config")]
pub struct Config {
    pub database: DatabaseConfig,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    #[serde(rename = "name")]
    pub database_name: String,
}

impl DatabaseConfig {
    pub fn get_database_path(&self) -> PathBuf {
        if let Some(storage) = AppStorage::new() {
            storage.get_database_path(&self.database_name)
        } else {
            PathBuf::from(".").join(format!("{}.db", self.database_name))
        }
    }
}

// Load configuration from config.xml in Documents folder
pub fn load_config() -> Result<Config, String> {
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;
    
    let config_path = storage.get_config_file_path();
    
    if !config_path.exists() {
        return Err("Config file not found".to_string());
    }

    let config_str = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    from_str(&config_str)
        .map_err(|e| format!("Failed to parse config XML: {}", e))
}

// Save the database name to safe storage
pub fn save_database_name(database_name: &str) -> Result<(), String> {
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;
    
    let path = storage.get_database_name_file_path();
    fs::write(&path, database_name)
        .map_err(|e| format!("Failed to save database name: {}", e))
}

// Load the database name from safe storage
pub fn load_database_name() -> Result<String, String> {
    let storage = AppStorage::new()
        .ok_or_else(|| "Failed to initialize app storage".to_string())?;
    
    let path = storage.get_database_name_file_path();
    fs::read_to_string(&path)
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("Failed to read database name: {}", e))
}

// Check if database_name.txt exists in safe storage
pub fn database_name_file_exists() -> bool {
    AppStorage::new()
        .map(|storage| storage.get_database_name_file_path().exists())
        .unwrap_or(false)
}

// Get the public storage directory path (Documents folder)
pub fn get_app_dir() -> PathBuf {
    AppStorage::new()
        .map(|storage| storage.get_public_storage())
        .unwrap_or_else(|| PathBuf::from(".").join(APP_NAME))
}
