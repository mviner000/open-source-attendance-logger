// src/db/auth.rs
use log::info;
use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

#[derive(Clone)]
pub struct AuthDatabase;

impl AuthDatabase {
    pub fn init(conn: &Connection) -> SqliteResult<Self> {
        // Create users table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             username TEXT NOT NULL UNIQUE,
             password TEXT NOT NULL
             )",
             [],
        )?;
        Ok(AuthDatabase)
    }

    pub fn authenticate(&self, conn: &Connection, username: &str, password: &str) -> SqliteResult<bool> {
        info!("Authenticating user: {}", username);
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE username = ? AND password = ?"
        )?;
        
        let count: i64 = stmt.query_row(params![username, password], |row| row.get(0))?;
        Ok(count > 0)
    }

    pub fn get_credentials(&self, conn: &Connection) -> SqliteResult<Credentials> {
        info!("Fetching credentials");
        let mut stmt = conn.prepare(
            "SELECT username, password FROM users LIMIT 1"
        )?;
        
        stmt.query_row([], |row| {
            Ok(Credentials {
                username: row.get(0)?,
                password: row.get(1)?,
            })
        })
    }

    pub fn create_user(&self, conn: &Connection, credentials: &Credentials) -> SqliteResult<()> {
        info!("Creating new user: {}", credentials.username);
        
        // Log the current users before insertion
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
        info!("Current user count before insertion: {}", count);
        
        conn.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            params![credentials.username, credentials.password],
        )?;
        
        info!("Successfully created user in database");
        Ok(())
    }

    pub fn user_exists(&self, conn: &Connection) -> SqliteResult<bool> {
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM users")?;
        let count: i64 = stmt.query_row([], |row| row.get(0))?;
        Ok(count > 0)
    }
}