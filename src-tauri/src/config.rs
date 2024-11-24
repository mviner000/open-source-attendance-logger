// src/config.rs

use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use directories::UserDirs;
use quick_xml::de::from_str;

const APP_NAME: &str = "nameOftheApp";
const CONFIG_FILE: &str = "config.xml";

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
    // Helper method to get the full database path with extension
    pub fn get_database_path(&self) -> PathBuf {
        if let Some(user_dirs) = UserDirs::new() {
            if let Some(docs_dir) = user_dirs.document_dir() {
                return docs_dir
                    .join(APP_NAME)
                    .join(format!("{}.db", self.database_name));
            }
        }
        // Fallback to local directory if we can't get the documents directory
        PathBuf::from(".").join(format!("{}.db", self.database_name))
    }
}

pub fn load_config() -> Result<Config, String> {
    let config_path = get_config_file_path()
        .ok_or_else(|| "Failed to determine config file path".to_string())?;

    if !config_path.exists() {
        return Err("Config file not found".to_string());
    }

    let config_str = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    from_str(&config_str)
        .map_err(|e| format!("Failed to parse config XML: {}", e))
}

pub fn get_config_file_path() -> Option<PathBuf> {
    UserDirs::new().and_then(|user_dirs| {
        user_dirs.document_dir().map(|documents_dir| {
            documents_dir.join(APP_NAME).join(CONFIG_FILE)
        })
    })
}