use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use directories::UserDirs;
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
        if let Some(user_dirs) = UserDirs::new() {
            if let Some(docs_dir) = user_dirs.document_dir() {
                return docs_dir
                    .join(APP_NAME)
                    .join(format!("{}.db", self.database_name));
            }
        }
        PathBuf::from(".").join(format!("{}.db", self.database_name))
    }
}

// Load configuration from config.xml
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

// Get the path of config.xml
pub fn get_config_file_path() -> Option<PathBuf> {
    UserDirs::new().and_then(|user_dirs| {
        user_dirs.document_dir().map(|documents_dir| {
            documents_dir.join(APP_NAME).join(CONFIG_FILE)
        })
    })
}

// Save the database name to a text file
pub fn save_database_name(database_name: &str) -> Result<(), String> {
    let path = get_app_dir().join(DATABASE_NAME_FILE);
    fs::write(&path, database_name)
        .map_err(|e| format!("Failed to save database name: {}", e))
}

// Load the database name from a text file
pub fn load_database_name() -> Result<String, String> {
    let path = get_app_dir().join(DATABASE_NAME_FILE);
    fs::read_to_string(&path)
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("Failed to read database name: {}", e))
}

// Check if database_name.txt exists
pub fn database_name_file_exists() -> bool {
    get_app_dir().join(DATABASE_NAME_FILE).exists()
}

// Utility to get the application directory path
pub fn get_app_dir() -> PathBuf {
    UserDirs::new()
        .and_then(|dirs| dirs.document_dir().map(|d| d.join(APP_NAME)))
        .unwrap_or_else(|| PathBuf::from(".").join(APP_NAME))
}
