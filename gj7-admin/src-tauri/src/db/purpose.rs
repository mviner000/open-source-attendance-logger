// src/db/purpose.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use log::info;
use rusqlite::Result as SqlResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Purpose {
    pub id: Uuid,
    pub label: String,
    pub icon_name: String,
    pub is_deleted: bool,  // New field for soft delete
}

#[derive(Debug, Deserialize, Clone)]
pub struct CreatePurposeRequest {
    pub label: String,
    pub icon_name: String,
}

pub trait PurposeRepository {
    fn create_purpose(&self, conn: &Connection, purpose: CreatePurposeRequest) -> Result<Purpose>;
    fn get_purpose(&self, conn: &Connection, id: Uuid) -> Result<Purpose>;
    fn get_purpose_by_label(&self, conn: &Connection, label: &str) -> Result<Purpose>;
    fn update_purpose(&self, conn: &Connection, id: Uuid, purpose: CreatePurposeRequest) -> Result<Purpose>;
    fn soft_delete_purpose(&self, conn: &Connection, id: Uuid) -> Result<()>;  // New method
    fn restore_purpose(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_purposes(&self, conn: &Connection, include_deleted: bool) -> Result<Vec<Purpose>>;  // Modified
}

pub struct SqlitePurposeRepository;

impl PurposeRepository for SqlitePurposeRepository {
    fn create_purpose(&self, conn: &Connection, purpose: CreatePurposeRequest) -> Result<Purpose> {
        let id = Uuid::new_v4();

        if purpose.label.is_empty() {
            return Err(rusqlite::Error::InvalidParameterName("Purpose label cannot be empty".to_string()));
        }

        conn.execute(
            "INSERT INTO purposes (id, label, icon_name, is_deleted) VALUES (?1, ?2, ?3, ?4)",
            params![id.to_string(), purpose.label, purpose.icon_name, false],
        )?;

        let created_purpose = Purpose {
            id,
            label: purpose.label,
            icon_name: purpose.icon_name,
            is_deleted: false,
        };

        info!("Created purpose: {}", created_purpose.label);
        Ok(created_purpose)
    }

    fn get_purpose(&self, conn: &Connection, id: Uuid) -> Result<Purpose> {
        let purpose = conn.query_row(
            "SELECT id, label, icon_name, is_deleted FROM purposes WHERE id = ?1",
            params![id.to_string()],
            |row| {
                Ok(Purpose {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    label: row.get(1)?,
                    icon_name: row.get(2)?,
                    is_deleted: row.get(3)?,
                })
            },
        )?;

        Ok(purpose)
    }

    fn get_purpose_by_label(&self, conn: &Connection, label: &str) -> Result<Purpose> {
        let purpose = conn.query_row(
            "SELECT id, label, icon_name, is_deleted FROM purposes WHERE label = ?1 AND is_deleted = FALSE",
            params![label],
            |row| {
                Ok(Purpose {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    label: row.get(1)?,
                    icon_name: row.get(2)?,
                    is_deleted: row.get(3)?,
                })
            },
        )?;

        Ok(purpose)
    }

    fn update_purpose(&self, conn: &Connection, id: Uuid, purpose: CreatePurposeRequest) -> Result<Purpose> {
        conn.execute(
            "UPDATE purposes SET label = ?1, icon_name = ?2 WHERE id = ?3 AND is_deleted = FALSE",
            params![purpose.label, purpose.icon_name, id.to_string()],
        )?;

        self.get_purpose(conn, id)
    }

    fn restore_purpose(&self, conn: &Connection, id: Uuid) -> Result<()> {
        // Check if a purpose with the same label exists and is not deleted
        let purpose = self.get_purpose(conn, id)?;
        
        // Check if another active purpose exists with the same label
        let existing = conn.query_row(
            "SELECT id FROM purposes WHERE label = ?1 AND is_deleted = FALSE AND id != ?2",
            params![purpose.label, id.to_string()],
            |row| row.get::<_, String>(0)
        );

        match existing {
            Ok(_) => {
                return Err(rusqlite::Error::InvalidParameterName(
                    format!("An active purpose with label '{}' already exists", purpose.label)
                ));
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // No conflict found, proceed with restore
                conn.execute(
                    "UPDATE purposes SET is_deleted = FALSE WHERE id = ?1",
                    params![id.to_string()],
                )?;

                info!("Restored purpose with id: {}", id);
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    fn soft_delete_purpose(&self, conn: &Connection, id: Uuid) -> Result<()> {
        conn.execute(
            "UPDATE purposes SET is_deleted = TRUE WHERE id = ?1",
            params![id.to_string()],
        )?;

        info!("Soft deleted purpose with id: {}", id);
        Ok(())
    }

    fn get_all_purposes(&self, conn: &Connection, include_deleted: bool) -> Result<Vec<Purpose>> {
        let sql = if include_deleted {
            "SELECT id, label, icon_name, is_deleted FROM purposes"
        } else {
            "SELECT id, label, icon_name, is_deleted FROM purposes WHERE is_deleted = FALSE"
        };
        
        let mut stmt = conn.prepare(sql)?;
        
        let purpose_iter = stmt.query_map([], |row| {
            Ok(Purpose {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                label: row.get(1)?,
                icon_name: row.get(2)?,
                is_deleted: row.get(3)?,
            })
        })?;

        let mut purposes = Vec::new();
        for purpose in purpose_iter {
            purposes.push(purpose?);
        }

        Ok(purposes)
    }
}

pub fn create_purposes_table(conn: &Connection) -> SqlResult<()> {
    // First create the table without the filtered unique constraint
    conn.execute(
        "CREATE TABLE IF NOT EXISTS purposes (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            icon_name TEXT NOT NULL,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )",
        [],
    )?;

    // Then create a unique index with the WHERE clause
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_purposes_label 
         ON purposes(label) 
         WHERE is_deleted = FALSE",
        [],
    )?;

    Ok(())
}