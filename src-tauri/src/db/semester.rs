// src/db/semester.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use log::{info};
use rusqlite::Result as SqlResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Semester {
    pub id: Uuid,
    pub label: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CreateSemesterRequest {
    pub label: String,
}

pub trait SemesterRepository {
    fn create_semester(&self, conn: &Connection, semester: CreateSemesterRequest) -> Result<Semester>;
    fn get_semester(&self, conn: &Connection, id: Uuid) -> Result<Semester>;
    fn get_semester_by_label(&self, conn: &Connection, label: &str) -> Result<Semester>;
    fn update_semester(&self, conn: &Connection, id: Uuid, semester: CreateSemesterRequest) -> Result<Semester>;
    fn delete_semester(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_semesters(&self, conn: &Connection) -> Result<Vec<Semester>>;
}

pub struct SqliteSemesterRepository;

impl SemesterRepository for SqliteSemesterRepository {
    fn create_semester(&self, conn: &Connection, semester: CreateSemesterRequest) -> Result<Semester> {
        let id = Uuid::new_v4();

        // Validate semester label
        if semester.label.is_empty() {
            return Err(rusqlite::Error::InvalidParameterName("Semester label cannot be empty".to_string()));
        }

        conn.execute(
            "INSERT INTO semesters (id, label) VALUES (?1, ?2)",
            params![id.to_string(), semester.label],
        )?;

        let created_semester = Semester {
            id,
            label: semester.label,
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
                })
            },
        )?;

        Ok(semester)
    }

    fn update_semester(&self, conn: &Connection, id: Uuid, semester: CreateSemesterRequest) -> Result<Semester> {
        conn.execute(
            "UPDATE semesters SET label = ?1 WHERE id = ?2",
            params![semester.label, id.to_string()],
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
            })
        })?;

        let mut semesters = Vec::new();
        for semester in semester_iter {
            semesters.push(semester?);
        }

        Ok(semesters)
    }
}

// SQL to create the simplified semesters table
pub fn create_semesters_table(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS semesters (
            id TEXT PRIMARY KEY,
            label TEXT UNIQUE NOT NULL,
            CONSTRAINT label_unique UNIQUE (label)
        )",
        [],
    )?;

    Ok(())
}