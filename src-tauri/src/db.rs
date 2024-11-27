use log::{info, warn};
use rusqlite::{Connection, Result};
use tauri::AppHandle;
use serde::Serialize;
use std::path::PathBuf;
use crate::config;
use crate::storage::AppStorage;
pub mod notes;
pub mod auth;
pub mod school_accounts;
pub mod csv_import;
pub mod csv_transform;
pub mod semester;
use notes::NotesDatabase;
use auth::AuthDatabase;
use school_accounts::{SchoolAccountRepository, SqliteSchoolAccountRepository};
use semester::{SemesterRepository, SqliteSemesterRepository};
use tokio::sync::RwLock;
use std::sync::Arc;

#[derive(Debug, Serialize, Clone)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
}

pub struct Database {
    conn: RwLock<Connection>,
    pub notes: NotesDatabase,
    pub auth: AuthDatabase,
    pub school_accounts: Arc<dyn SchoolAccountRepository + Send + Sync>,
    pub semester_repository: Box<dyn SemesterRepository + Send + Sync>,
    db_path: PathBuf,
}

// Implement Clone manually to allow cloning with Arc
impl Clone for Database {
    fn clone(&self) -> Self {
        let new_conn = Connection::open(&self.db_path)
            .expect("Failed to open a new database connection");

        Database {
            conn: RwLock::new(new_conn),
            notes: self.notes.clone(),
            auth: self.auth.clone(),
            school_accounts: Arc::clone(&self.school_accounts),
            semester_repository: Box::new(SqliteSemesterRepository) as Box<dyn SemesterRepository + Send + Sync>,
            db_path: self.db_path.clone(),
        }
    }
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
        
        // Initialize all tables
        info!("Creating database tables...");
        school_accounts::create_school_accounts_table(&conn)?;
        semester::create_semesters_table(&conn)?;
        
        let notes_db = NotesDatabase::init(&conn)?;
        let auth_db = AuthDatabase::init(&conn)?;
        
        // Initialize repositories
        let school_accounts_db: Arc<dyn SchoolAccountRepository + Send + Sync> = 
            Arc::new(SqliteSchoolAccountRepository);
        let semester_repository = Box::new(SqliteSemesterRepository) as Box<dyn SemesterRepository + Send + Sync>;
        
        info!("Database initialization completed successfully");
        Ok(Database {
            conn: RwLock::new(conn),
            notes: notes_db,
            auth: auth_db,
            school_accounts: school_accounts_db,
            semester_repository,
            db_path,
        })
    }

    // Add this method for blocking connection retrieval
    pub fn get_connection_blocking(&self) -> Connection {
        Connection::open(&self.db_path)
            .expect("Failed to open a new database connection")
    }

    // Modify this method to use blocking connection
    pub fn with_connection_blocking<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&Connection) -> Result<T>
    {
        let conn = self.get_connection_blocking();
        f(&conn)
    }

    // Existing methods remain the same...
    pub async fn with_connection<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&Connection) -> Result<T>
    {
        let new_conn = Connection::open(&self.db_path)?;
        f(&new_conn)
    }

    pub fn get_cloned_connection(&self) -> Connection {
        Connection::open(self.db_path.as_path())
            .expect("Failed to open a new database connection")
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
    let db_name = config::load_database_name()
        .map_err(|e| format!("Failed to load database name: {}", e))?;
    Ok(db_dir.join(format!("{}.db", db_name)))
}

pub fn init_db(app_handle: &AppHandle) -> Result<Database> {
    Database::new(app_handle)
}