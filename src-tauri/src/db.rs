// src/db.rs
use log::{info, warn};
use rusqlite::{Connection, Result};
use std::sync::RwLock;
use tauri::AppHandle;
use serde::Serialize;
use std::path::PathBuf;
use crate::config::{self, Config};
use crate::storage::AppStorage;

pub mod notes;
pub mod auth;
pub mod school_accounts;
use notes::NotesDatabase;
use auth::AuthDatabase;
use school_accounts::{SchoolAccountRepository, SqliteSchoolAccountRepository};

const APP_NAME: &str = "nameOftheApp";

#[derive(Debug, Serialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
}

pub struct Database {
    conn: RwLock<Connection>,
    pub notes: NotesDatabase,
    pub auth: AuthDatabase,
    pub school_accounts: Box<dyn SchoolAccountRepository>,
    db_path: PathBuf,
}

impl Database {
    pub fn new(_app_handle: &AppHandle) -> Result<Self> {
        info!("Initializing database...");
        
        let storage = AppStorage::new()
            .expect("Failed to initialize app storage");
        
        let db_dir = storage.get_database_dir();
        info!("Creating database directory at {:?}", db_dir);
        
        std::fs::create_dir_all(&db_dir)
            .expect("Failed to create database directory");

        let db_path = match get_database_path(&db_dir) {
            Ok(path) => path,
            Err(e) => {
                warn!("Database path error: {}. Retrying config load...", e);
                return Err(rusqlite::Error::InvalidParameterName(
                    format!("Could not determine database path: {}", e)
                ));
            }
        };

        info!("Opening database at {:?}", db_path);
        let conn = Connection::open(&db_path)?;
        
        // Create tables if they don't exist
        school_accounts::create_school_accounts_table(&conn)?;
        
        let notes_db = NotesDatabase::init(&conn)?;
        let auth_db = AuthDatabase::init(&conn)?;
        
        // Use the concrete implementation directly
        let school_accounts_db = Box::new(SqliteSchoolAccountRepository);
        
        info!("Database initialization completed successfully");
        Ok(Database {
            conn: RwLock::new(conn),
            notes: notes_db,
            auth: auth_db,
            school_accounts: school_accounts_db,
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


// Helper function to get the database path
fn get_database_path(db_dir: &PathBuf) -> Result<PathBuf, String> {
    // First, try to load database name from database_name.txt
    let db_name = config::load_database_name()
        .map_err(|e| format!("Failed to load database name: {}", e))?;
    
    Ok(db_dir.join(format!("{}.db", db_name)))
}

pub fn init_db(app_handle: &AppHandle) -> Result<Database> {
    Database::new(app_handle)
}