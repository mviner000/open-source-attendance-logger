// db.rs
use log::info;
use rusqlite::{Connection, Result};
use std::sync::RwLock;
use tauri::AppHandle;  // Removed unused Manager import
use serde::Serialize;
use std::path::PathBuf;
use directories::UserDirs;

pub mod notes;
pub mod auth;
use notes::NotesDatabase;
use auth::AuthDatabase;

const APP_NAME: &str = "nameOftheApp";
const DB_FILENAME: &str = "notes.db";

#[derive(Debug, Serialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
}

pub struct Database {
    conn: RwLock<Connection>,
    pub notes: NotesDatabase,
    pub auth: AuthDatabase,
    db_path: PathBuf,
}

impl Database {
    pub fn new(_app_handle: &AppHandle) -> Result<Self> {  // Added underscore to unused parameter
        info!("Initializing database...");
        
        // Get the database directory path based on the platform
        let db_dir = get_database_dir()
            .expect("Failed to determine database directory");
            
        info!("Creating database directory at {:?}", db_dir);
        std::fs::create_dir_all(&db_dir)
            .expect("Failed to create database directory");

        let db_path = db_dir.join(DB_FILENAME);
        info!("Opening database at {:?}", db_path);
        
        let conn = Connection::open(&db_path)?;

        // Initialize database tables
        let notes_db = NotesDatabase::init(&conn)?;
        let auth_db = AuthDatabase::init(&conn)?;

        info!("Database initialization completed successfully");
        
        Ok(Database {
            conn: RwLock::new(conn),
            notes: notes_db,
            auth: auth_db,
            db_path,
        })
    }

    pub fn get_connection(&self) -> &RwLock<Connection> {
        &self.conn
    }

    pub fn get_database_info(&self) -> Result<DatabaseInfo, rusqlite::Error> {
        let name = self.db_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let path = self.db_path
            .to_str()
            .unwrap_or("unknown")
            .to_string();

        Ok(DatabaseInfo { name, path })
    }
}

fn get_database_dir() -> Option<PathBuf> {
    if let Some(user_dirs) = UserDirs::new() {
        let documents_dir = user_dirs.document_dir()?;
        let app_dir = documents_dir.join(APP_NAME);
        
        // Platform-specific handling
        #[cfg(target_os = "macos")]
        return Some(app_dir);
        
        #[cfg(target_os = "linux")]
        return Some(app_dir);
        
        #[cfg(target_os = "windows")]
        return Some(app_dir);
        
        // Fallback for any other platform
        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        return Some(app_dir);
    }
    None
}

pub fn init_db(app_handle: &AppHandle) -> Result<Database> {
    Database::new(app_handle)
}