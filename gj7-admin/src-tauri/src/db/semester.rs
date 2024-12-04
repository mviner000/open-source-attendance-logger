// src/db/semester.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use log::{info};
use rusqlite::Result as SqlResult;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Semester {
    pub id: Uuid,
    pub label: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CreateSemesterRequest {
    pub label: String,
    pub is_active: Option<bool>,
}

pub trait SemesterRepository {
    fn create_semester(&self, conn: &Connection, semester: CreateSemesterRequest) -> Result<Semester>;
    fn get_semester(&self, conn: &Connection, id: Uuid) -> Result<Semester>;
    fn get_semester_by_label(&self, conn: &Connection, label: &str) -> Result<Semester>;
    fn update_semester(&self, conn: &Connection, id: Uuid, semester: CreateSemesterRequest) -> Result<Semester>;
    fn delete_semester(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_semesters(&self, conn: &Connection) -> Result<Vec<Semester>>;
    fn set_active_semester(&self, conn: &Connection, id: Uuid) -> Result<Semester>;
    fn get_active_semester(&self, conn: &Connection) -> Result<Option<Semester>>;
}

pub struct SqliteSemesterRepository;

impl SemesterRepository for SqliteSemesterRepository {
    fn get_active_semester(&self, conn: &Connection) -> Result<Option<Semester>> {
        let result = conn.query_row(
            "SELECT * FROM semesters WHERE is_active = 1",
            [],
            |row| {
                Ok(Semester {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    label: row.get(1)?,
                    is_active: row.get(2)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?).unwrap().with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?).unwrap().with_timezone(&Utc),
                })
            },
        );

        match result {
            Ok(semester) => Ok(Some(semester)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
    
    fn create_semester(&self, conn: &Connection, semester: CreateSemesterRequest) -> Result<Semester> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        // Validate semester label
        if semester.label.is_empty() {
            return Err(rusqlite::Error::InvalidParameterName("Semester label cannot be empty".to_string()));
        }

        // Default is_active to false if not specified
        let is_active = semester.is_active.unwrap_or(false);

        conn.execute(
            "INSERT INTO semesters (id, label, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                id.to_string(), 
                semester.label, 
                is_active,
                now.to_rfc3339(), 
                now.to_rfc3339()
            ],
        )?;

        let created_semester = Semester {
            id,
            label: semester.label,
            is_active,
            created_at: now,
            updated_at: now,
        };

        info!("Created semester: {}", created_semester.label);
        Ok(created_semester)
    }

    fn get_semester(&self, conn: &Connection, id: Uuid) -> Result<Semester> {
        let semester = conn.query_row(
            "SELECT * FROM semesters WHERE id = ?1",
            params![id.to_string()],
            |row| {
                Ok(Semester {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    label: row.get(1)?,
                    is_active: row.get(2)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?).unwrap().with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?).unwrap().with_timezone(&Utc),
                })
            },
        )?;

        Ok(semester)
    }

    fn get_semester_by_label(&self, conn: &Connection, label: &str) -> Result<Semester> {
        let semester = conn.query_row(
            "SELECT * FROM semesters WHERE label = ?1",
            params![label],
            |row| {
                Ok(Semester {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    label: row.get(1)?,
                    is_active: row.get(2)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?).unwrap().with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?).unwrap().with_timezone(&Utc),
                })
            },
        )?;

        Ok(semester)
    }

    fn update_semester(&self, conn: &Connection, id: Uuid, semester: CreateSemesterRequest) -> Result<Semester> {
        let now = Utc::now();

        // Use the existing is_active status if not specified in the update request
        let current_semester = self.get_semester(conn, id)?;
        let is_active = semester.is_active.unwrap_or(current_semester.is_active);

        conn.execute(
            "UPDATE semesters SET label = ?1, is_active = ?2, updated_at = ?3 WHERE id = ?4",
            params![semester.label, is_active, now.to_rfc3339(), id.to_string()],
        )?;

        self.get_semester(conn, id)
    }

    fn delete_semester(&self, conn: &Connection, id: Uuid) -> Result<()> {
        conn.execute(
            "DELETE FROM semesters WHERE id = ?1",
            params![id.to_string()],
        )?;

        Ok(())
    }

    fn get_all_semesters(&self, conn: &Connection) -> Result<Vec<Semester>> {
        let mut stmt = conn.prepare("SELECT * FROM semesters")?;
        
        let semester_iter = stmt.query_map([], |row| {
            Ok(Semester {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                label: row.get(1)?,
                is_active: row.get(2)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?).unwrap().with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?).unwrap().with_timezone(&Utc),
            })
        })?;

        let mut semesters = Vec::new();
        for semester in semester_iter {
            semesters.push(semester?);
        }

        Ok(semesters)
    }

    fn set_active_semester(&self, conn: &Connection, id: Uuid) -> Result<Semester> {
        // First, set all semesters to inactive
        conn.execute(
            "UPDATE semesters SET is_active = 0",
            [],
        )?;

        // Then set the specified semester to active
        conn.execute(
            "UPDATE semesters SET is_active = 1, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id.to_string()],
        )?;

        // Retrieve and return the updated semester
        self.get_semester(conn, id)
    }
}

// SQL to create the semesters table with timestamps and is_active
pub fn create_semesters_table(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS semesters (
            id TEXT PRIMARY KEY,
            label TEXT UNIQUE NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CONSTRAINT label_unique UNIQUE (label)
        )",
        [],
    )?;

    Ok(())
}