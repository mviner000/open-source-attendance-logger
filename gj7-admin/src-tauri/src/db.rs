// src/db.rs

use log::{info, warn};
use rusqlite::{Connection, Result};
use tauri::AppHandle;
use serde::Serialize;
use std::path::PathBuf;
use r2d2::Pool;
use std::time::Duration;
use r2d2_sqlite::SqliteConnectionManager;

use crate::config;
use crate::storage::AppStorage;
pub mod notes;
pub mod auth;
pub mod school_accounts;
pub mod csv_import;
pub mod csv_transform;
pub mod semester;
pub mod attendance;
pub mod purpose;

use notes::NotesDatabase;
use auth::AuthDatabase;
use school_accounts::{SchoolAccountRepository, SqliteSchoolAccountRepository};
use semester::{SemesterRepository, SqliteSemesterRepository};
use attendance::{AttendanceRepository, SqliteAttendanceRepository};
use purpose::{PurposeRepository, SqlitePurposeRepository};
use std::sync::Arc;
use crate::parallel_csv_validator::ParallelCsvValidator;

#[derive(Debug, Serialize, Clone)]
pub struct DatabaseInfo {
    pub name: String,
    pub path: String,
}

pub struct Database {
    pub pool: Pool<SqliteConnectionManager>,
    pub notes: NotesDatabase,
    pub auth: AuthDatabase,
    pub school_accounts: Arc<dyn SchoolAccountRepository + Send + Sync>,
    pub semester_repository: Box<dyn SemesterRepository + Send + Sync>,
    pub attendance_repository: Arc<dyn AttendanceRepository + Send + Sync>,
    pub purpose_repository: Arc<dyn PurposeRepository + Send + Sync>,
    db_path: PathBuf,
}

impl Clone for Database {
    fn clone(&self) -> Self {
        let manager = SqliteConnectionManager::file(self.db_path.clone());
        let pool = Pool::new(manager).expect("Failed to create connection pool");

        Database {
            pool,
            notes: self.notes.clone(),
            auth: self.auth.clone(),
            school_accounts: Arc::clone(&self.school_accounts),
            semester_repository: Box::new(SqliteSemesterRepository),
            attendance_repository: Arc::new(SqliteAttendanceRepository),
            purpose_repository: Arc::new(SqlitePurposeRepository),
            db_path: self.db_path.clone(),
        }
    }
}

impl Database {
    pub fn create_parallel_csv_validator(&self) -> ParallelCsvValidator {
        let connection = self.pool.get()
            .expect("Failed to get database connection");
        
        ParallelCsvValidator::new(&self.pool)
    }

    pub fn get_db_path(&self) -> &PathBuf {
        &self.db_path
    }

    pub fn get_database_info(&self) -> Result<DatabaseInfo, Box<dyn std::error::Error>> {
        Ok(DatabaseInfo {
            name: self.db_path.file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "unknown".to_string()),
            path: self.db_path.to_string_lossy().into_owned(),
        })
    }

    pub fn new(_app_handle: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
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
                return Err(format!("Could not determine database path: {}", e).into());
            }
        };
        
        info!("Opening database pool at {:?}", db_path);
        let manager = SqliteConnectionManager::file(db_path.clone())
            .with_init(|conn| {
                conn.execute_batch("
                    PRAGMA journal_mode=WAL;
                    PRAGMA synchronous=FULL;
                    PRAGMA cache_size=-2000000;
                    PRAGMA busy_timeout=300000;
                    PRAGMA temp_store=MEMORY;
                    PRAGMA max_page_count=2097152;
                    PRAGMA page_size=65536;
                    PRAGMA encoding='UTF-8';
                    PRAGMA foreign_keys=ON;
                    PRAGMA read_uncommitted=1;
                    PRAGMA threads=16;
                    PRAGMA max_pending_statements=1000;
                    PRAGMA query_only=0;
                    PRAGMA optimize;
                ")?;
                Ok(())
            });

        let pool = Pool::builder()
            .max_size(250)  // Maximum concurrent connections
            .min_idle(Some(50))  // Minimum idle connections
            .connection_timeout(Duration::from_secs(600))  // 10-minute connection timeout
            .idle_timeout(Some(Duration::from_secs(3600)))  // 1-hour idle timeout
            .max_lifetime(Some(Duration::from_secs(7200)))  // 2-hour max connection life
            .test_on_check_out(true)
            .build(manager)?;
        
        // Use pool's connection for initial setup
        let conn = pool.get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;
        
        // Initialize all tables
        info!("Creating database tables...");
        school_accounts::create_school_accounts_table(&conn)?;
        semester::create_semesters_table(&conn)?;
        purpose::create_purposes_table(&conn)?;
        attendance::create_attendance_table(&conn)?;
        
        let notes_db = NotesDatabase::init(&conn)?;
        let auth_db = AuthDatabase::init(&conn)?;
        
        info!("Database initialization completed successfully");
        Ok(Database {
            pool,
            notes: notes_db,
            auth: auth_db,
            school_accounts: Arc::new(SqliteSchoolAccountRepository),
            semester_repository: Box::new(SqliteSemesterRepository),
            attendance_repository: Arc::new(SqliteAttendanceRepository),
            purpose_repository: Arc::new(SqlitePurposeRepository),
            db_path,
        })
    }

    pub async fn with_connection<F, T>(&self, f: F) -> Result<T, Box<dyn std::error::Error>>
    where
        F: FnOnce(&Connection) -> Result<T>
    {
        let conn = self.pool.get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;
        
        f(&conn).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
    }
}

fn get_database_path(db_dir: &PathBuf) -> Result<PathBuf, String> {
    let db_name = config::load_database_name()
        .map_err(|e| format!("Failed to load database name: {}", e))?;
    Ok(db_dir.join(format!("{}.db", db_name)))
}

pub fn init_db(app_handle: &AppHandle) -> Result<Database, Box<dyn std::error::Error>> {
    Database::new(app_handle)
}