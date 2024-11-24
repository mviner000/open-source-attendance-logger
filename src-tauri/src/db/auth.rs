// src/db/auth.rs
use log::{info, error};
use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

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

    pub fn authenticate(&self, conn: &Connection, username: &str, password: &str) -> Result<bool, String> {
        info!("Authenticating user: {}", username);
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE username = ? AND password = ?"
        ).map_err(|e| e.to_string())?;

        let count: i64 = stmt.query_row(params![username, password], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        Ok(count > 0)
    }

    pub fn get_credentials(&self, conn: &Connection) -> Result<Credentials, String> {
        info!("Fetching credentials");
        let mut stmt = conn.prepare(
            "SELECT username, password FROM users LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row([], |row| {
            Ok(Credentials {
                username: row.get(0)?,
                password: row.get(1)?,
            })
        }).map_err(|e| e.to_string())?;

        Ok(result)
    }

    pub fn create_user(&self, conn: &Connection, credentials: &Credentials) -> Result<(), String> {
        info!("Creating new user: {}", credentials.username);
        
        // Log the current users before insertion
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count users: {}", e))?;
        info!("Current user count before insertion: {}", count);
        
        match conn.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            params![credentials.username, credentials.password],
        ) {
            Ok(_) => {
                info!("Successfully created user in database");
                Ok(())
            },
            Err(e) => {
                error!("Failed to create user: {}", e);
                Err(format!("Failed to create user: {}", e))
            }
        }
    }

    pub fn user_exists(&self, conn: &Connection) -> Result<bool, String> {
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM users")
            .map_err(|e| e.to_string())?;
        
        let count: i64 = stmt.query_row([], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        Ok(count > 0)
    }
}