use log::{info, error};
use rusqlite::{Connection, Result, params, Row};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use tauri::Manager;
use std::sync::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub updated_at: DateTime<Utc>,
}

// Add this new struct to store credentials
#[derive(Serialize)]
pub struct Credentials {
    username: String,
    password: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNoteRequest {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNoteRequest {
    pub title: Option<String>,
    pub content: Option<String>,
}

pub struct Database {
    pub conn: RwLock<Connection>,
}

impl Database {
    // Helper function to convert DateTime to timestamp
    fn datetime_to_timestamp(dt: &DateTime<Utc>) -> i64 {
        dt.timestamp()
    }

    // Helper function to convert timestamp to DateTime
    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp_millis(timestamp * 1000)
            .expect("Invalid timestamp")
    }

    // Helper function to convert a database row to a Note
    fn row_to_note(row: &Row) -> Result<Note, rusqlite::Error> {
        let id = row.get(0)?;
        let title = row.get(1)?;
        let content = row.get(2)?;
        let created_at_ts: i64 = row.get(3)?;
        let updated_at_ts: i64 = row.get(4)?;

        Ok(Note {
            id: Some(id),
            title,
            content,
            created_at: Self::timestamp_to_datetime(created_at_ts),
            updated_at: Self::timestamp_to_datetime(updated_at_ts),
        })
    }

    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        info!("Initializing database...");
        let app_dir = app_handle.path().app_data_dir()
            .expect("Failed to get app data dir");
        
        info!("Creating app directory at {:?}", app_dir);
        std::fs::create_dir_all(&app_dir).expect("Failed to create app directory");
        
        let db_path = app_dir.join("notes.db");
        info!("Opening database at {:?}", db_path);
        let conn = Connection::open(db_path)?;
        
        // Create notes table
        info!("Creating notes table if it doesn't exist");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create users table
        info!("Creating users table if it doesn't exist");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )",
            [],
        )?;

        // Insert default admin user if it doesn't exist
        conn.execute(
            "INSERT OR IGNORE INTO users (username, password) VALUES (?1, ?2)",
            params!["admin22", "password21"],
        )?;

        info!("Database initialization completed successfully");
        Ok(Database {
            conn: RwLock::new(conn)
        })
    }

    pub fn authenticate(&self, username: &str, password: &str) -> Result<bool, String> {
        info!("Authenticating user: {}", username);
        let conn = self.conn.read().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;

        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE username = ? AND password = ?"
        ).map_err(|e| {
            error!("Failed to prepare authentication statement: {}", e);
            e.to_string()
        })?;

        let count: i64 = stmt.query_row(params![username, password], |row| row.get(0))
            .map_err(|e| {
                error!("Failed to execute authentication query: {}", e);
                e.to_string()
            })?;

        Ok(count > 0)
    }

    // Add this in the Database impl block
    pub fn get_credentials(&self) -> Result<Credentials, String> {
        info!("Fetching credentials");
        let conn = self.conn.read().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;

        let mut stmt = conn.prepare(
            "SELECT username, password FROM users LIMIT 1"
        ).map_err(|e| {
            error!("Failed to prepare get credentials statement: {}", e);
            e.to_string()
        })?;

        let result = stmt.query_row([], |row| {
            Ok(Credentials {
                username: row.get(0)?,
                password: row.get(1)?,
            })
        }).map_err(|e| {
            error!("Failed to fetch credentials: {}", e);
            e.to_string()
        })?;

        Ok(result)
    }


    pub fn get_note(&self, id: i64) -> Result<Note, String> {
        info!("Fetching note with id: {}", id);
        let conn = self.conn.read().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;

        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?"
        ).map_err(|e| {
            error!("Failed to prepare get note statement: {}", e);
            e.to_string()
        })?;

        let note = stmt.query_row(params![id], Self::row_to_note).map_err(|e| {
            error!("Failed to fetch note with id {}: {}", id, e);
            e.to_string()
        })?;

        info!("Successfully fetched note with id: {}", id);
        Ok(note)
    }

    pub fn create_note(&self, note: CreateNoteRequest) -> Result<Note, String> {
        info!("Creating new note with title: {}", note.title);
        let conn = self.conn.write().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;
        
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        
        let mut stmt = conn.prepare(
            "INSERT INTO notes (title, content, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4) 
             RETURNING id, title, content, created_at, updated_at"
        ).map_err(|e| {
            error!("Failed to prepare create note statement: {}", e);
            e.to_string()
        })?;

        let result = stmt.query_row(
            params![note.title, note.content, timestamp, timestamp],
            Self::row_to_note
        ).map_err(|e| {
            error!("Failed to execute create note query: {}", e);
            e.to_string()
        })?;
        
        info!("Successfully created note with id: {:?}", result.id);
        Ok(result)
    }

    pub fn get_all_notes(&self) -> Result<Vec<Note>, String> {
        info!("Fetching all notes");
        let conn = self.conn.read().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;
        
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
        ).map_err(|e| {
            error!("Failed to prepare get all notes statement: {}", e);
            e.to_string()
        })?;

        let notes = stmt.query_map(
            [],
            Self::row_to_note
        ).map_err(|e| {
            error!("Failed to execute get all notes query: {}", e);
            e.to_string()
        })?;

        let results = notes.collect::<Result<Vec<Note>>>().map_err(|e| {
            error!("Failed to collect notes: {}", e);
            e.to_string()
        })?;
        
        info!("Successfully fetched {} notes", results.len());
        Ok(results)
    }

    pub fn update_note(&self, id: i64, note: UpdateNoteRequest) -> Result<Note, String> {
        info!("Updating note with id: {}", id);
        let conn = self.conn.write().map_err(|e| {
            error!("Failed to acquire database lock for update: {}", e);
            e.to_string()
        })?;
        
        let existing = self.get_note(id)?;
        info!("Found existing note: {:?}", existing);
        
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        let title = note.title.unwrap_or(existing.title);
        let content = note.content.unwrap_or(existing.content);

        let mut stmt = conn.prepare(
            "UPDATE notes 
             SET title = ?1, content = ?2, updated_at = ?3 
             WHERE id = ?4
             RETURNING id, title, content, created_at, updated_at"
        ).map_err(|e| {
            error!("Failed to prepare update statement: {}", e);
            e.to_string()
        })?;

        let result = stmt.query_row(
            params![title, content, timestamp, id],
            Self::row_to_note
        ).map_err(|e| {
            error!("Failed to execute update query: {}", e);
            e.to_string()
        })?;

        info!("Successfully updated note with id: {}", id);
        Ok(result)
    }

    pub fn search_notes(&self, query: &str) -> Result<Vec<Note>, String> {
        info!("Searching notes with query: {}", query);
        let conn = self.conn.read().map_err(|e| {
            error!("Failed to acquire database lock: {}", e);
            e.to_string()
        })?;
        
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at 
             FROM notes 
             WHERE title LIKE ?1 OR content LIKE ?1 
             ORDER BY updated_at DESC"
        ).map_err(|e| {
            error!("Failed to prepare search statement: {}", e);
            e.to_string()
        })?;

        let notes = stmt.query_map(
            params![search_pattern],
            Self::row_to_note
        ).map_err(|e| {
            error!("Failed to execute search query: {}", e);
            e.to_string()
        })?;

        let results = notes.collect::<Result<Vec<Note>>>().map_err(|e| {
            error!("Failed to collect search results: {}", e);
            e.to_string()
        })?;
        
        info!("Search complete. Found {} matching notes", results.len());
        Ok(results)
    }

    pub fn delete_note(&self, id: i64) -> Result<(), String> {
        info!("Deleting note with id: {}", id);
        let conn = self.conn.write().map_err(|e| {
            error!("Failed to acquire database lock for deletion: {}", e);
            e.to_string()
        })?;

        conn.execute("DELETE FROM notes WHERE id = ?", params![id])
            .map_err(|e| {
                error!("Failed to delete note with id {}: {}", id, e);
                e.to_string()
            })?;

        info!("Successfully deleted note with id: {}", id);
        Ok(())
    }
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Database> {
    Database::new(app_handle)
}