// src/db/notes.rs

use chrono::{DateTime, Utc};
use log::info;
use rusqlite::{Connection, Result as SqliteResult, params, Row};
use serde::{Serialize, Deserialize};

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

#[derive(Clone)]
pub struct NotesDatabase;

impl NotesDatabase {
    pub fn init(conn: &Connection) -> SqliteResult<Self> {
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
        Ok(NotesDatabase)
    }

    fn datetime_to_timestamp(dt: &DateTime<Utc>) -> i64 {
        dt.timestamp()
    }

    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp_millis(timestamp * 1000)
            .expect("Invalid timestamp")
    }

    fn row_to_note(row: &Row) -> SqliteResult<Note> {
        Ok(Note {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: Self::timestamp_to_datetime(row.get(3)?),
            updated_at: Self::timestamp_to_datetime(row.get(4)?),
        })
    }

    pub fn get_note(&self, conn: &Connection, id: i64) -> Result<Note, String> {
        info!("Fetching note with id: {}", id);
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?"
        ).map_err(|e| e.to_string())?;

        let note = stmt.query_row(params![id], Self::row_to_note)
            .map_err(|e| e.to_string())?;

        info!("Successfully fetched note with id: {}", id);
        Ok(note)
    }

    pub fn create_note(&self, conn: &Connection, note: CreateNoteRequest) -> Result<Note, String> {
        info!("Creating new note with title: {}", note.title);
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        
        let mut stmt = conn.prepare(
            "INSERT INTO notes (title, content, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4) 
             RETURNING id, title, content, created_at, updated_at"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(
            params![note.title, note.content, timestamp, timestamp],
            Self::row_to_note
        ).map_err(|e| e.to_string())?;
        
        info!("Successfully created note with id: {:?}", result.id);
        Ok(result)
    }

    pub fn get_all_notes(&self, conn: &Connection) -> Result<Vec<Note>, String> {
        info!("Fetching all notes");
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let notes = stmt.query_map(
            [],
            Self::row_to_note
        ).map_err(|e| e.to_string())?;

        let results = notes.collect::<SqliteResult<Vec<Note>>>()
            .map_err(|e| e.to_string())?;
        
        info!("Successfully fetched {} notes", results.len());
        Ok(results)
    }

    pub fn update_note(&self, conn: &Connection, id: i64, note: UpdateNoteRequest) -> Result<Note, String> {
        info!("Updating note with id: {}", id);
        let existing = self.get_note(conn, id)?;
        
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        let title = note.title.unwrap_or(existing.title);
        let content = note.content.unwrap_or(existing.content);

        let mut stmt = conn.prepare(
            "UPDATE notes 
             SET title = ?1, content = ?2, updated_at = ?3 
             WHERE id = ?4
             RETURNING id, title, content, created_at, updated_at"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(
            params![title, content, timestamp, id],
            Self::row_to_note
        ).map_err(|e| e.to_string())?;

        info!("Successfully updated note with id: {}", id);
        Ok(result)
    }

    pub fn search_notes(&self, conn: &Connection, query: &str) -> Result<Vec<Note>, String> {
        info!("Searching notes with query: {}", query);
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at 
             FROM notes 
             WHERE title LIKE ?1 OR content LIKE ?1 
             ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let notes = stmt.query_map(
            params![search_pattern],
            Self::row_to_note
        ).map_err(|e| e.to_string())?;

        let results = notes.collect::<SqliteResult<Vec<Note>>>()
            .map_err(|e| e.to_string())?;
        
        info!("Search complete. Found {} matching notes", results.len());
        Ok(results)
    }

    pub fn delete_note(&self, conn: &Connection, id: i64) -> Result<(), String> {
        info!("Deleting note with id: {}", id);
        conn.execute("DELETE FROM notes WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;

        info!("Successfully deleted note with id: {}", id);
        Ok(())
    }
}