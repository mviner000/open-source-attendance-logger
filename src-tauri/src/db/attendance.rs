// src/db/attendance.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result, types::ToSql};
use serde::{Serialize, Deserialize};
use log::{info, error};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Attendance {
    pub id: Uuid,
    pub school_id: String,
    pub full_name: String,
    pub time_in_date: DateTime<Utc>,
    pub classification: String,
    pub purpose_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CreateAttendanceRequest {
    pub school_id: String,
    pub full_name: String,
    pub classification: String,
    pub purpose_id: Option<Uuid>,
}

pub trait AttendanceRepository: Send {
    fn create_attendance(&self, conn: &Connection, attendance: CreateAttendanceRequest) -> Result<Attendance>;
    fn get_attendance(&self, conn: &Connection, id: Uuid) -> Result<Attendance>;
    fn get_attendances_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<Vec<Attendance>>;
    fn delete_attendance(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_attendances(&self, conn: &Connection) -> Result<Vec<Attendance>>;
    fn search_attendances(&self, conn: &Connection, query: &str) -> Result<Vec<Attendance>>;
}

pub struct SqliteAttendanceRepository;

impl AttendanceRepository for SqliteAttendanceRepository {
    fn create_attendance(&self, conn: &Connection, attendance: CreateAttendanceRequest) -> Result<Attendance> {
        info!("Creating new attendance record for school_id: {}", attendance.school_id);
        
        let id = Uuid::new_v4();
        let time_in_date = Utc::now();
        
        if attendance.school_id.is_empty() {
            let err = rusqlite::Error::InvalidParameterName("School ID cannot be empty".to_string());
            error!("Failed to create attendance record: {}", err);
            return Err(err);
        }

        if attendance.full_name.is_empty() {
            let err = rusqlite::Error::InvalidParameterName("Full name cannot be empty".to_string());
            error!("Failed to create attendance record: {}", err);
            return Err(err);
        }

        let time_in_str = time_in_date.to_rfc3339();

        conn.execute(
            "INSERT INTO attendance (
                id, school_id, full_name, time_in_date, classification, purpose_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id.to_string(),
                attendance.school_id,
                attendance.full_name,
                time_in_str,
                attendance.classification,
                attendance.purpose_id.map(|id| id.to_string())
            ],
        )?;

        let created_attendance = Attendance {
            id,
            school_id: attendance.school_id,
            full_name: attendance.full_name,
            time_in_date,
            classification: attendance.classification,
            purpose_id: attendance.purpose_id,
        };

        info!(
            "Successfully created attendance record: ID={}, SchoolID={}",
            created_attendance.id,
            created_attendance.school_id
        );

        Ok(created_attendance)
    }

    fn get_attendance(&self, conn: &Connection, id: Uuid) -> Result<Attendance> {
        let attendance = conn.query_row(
            "SELECT * FROM attendance WHERE id = ?1",
            params![id.to_string()],
            |row| {
                let time_in_str: String = row.get(3)?;
                let time_in_date = DateTime::parse_from_rfc3339(&time_in_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                        3,
                        rusqlite::types::Type::Text,
                        Box::new(e)
                    ))?;

                Ok(Attendance {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    school_id: row.get(1)?,
                    full_name: row.get(2)?,
                    time_in_date,
                    classification: row.get(4)?,
                    purpose_id: row.get::<_, Option<String>>(5)?.map(|id| Uuid::parse_str(&id).unwrap()),
                })
            },
        )?;

        Ok(attendance)
    }

    fn get_attendances_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<Vec<Attendance>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM attendance WHERE school_id = ?1 ORDER BY time_in_date DESC"
        )?;
        
        let attendance_iter = stmt.query_map(params![school_id], |row| {
            let time_in_str: String = row.get(3)?;
            let time_in_date = DateTime::parse_from_rfc3339(&time_in_str)
                .map(|dt| dt.with_timezone(&Utc))
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    Box::new(e)
                ))?;

            Ok(Attendance {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                school_id: row.get(1)?,
                full_name: row.get(2)?,
                time_in_date,
                classification: row.get(4)?,
                purpose_id: row.get::<_, Option<String>>(5)?.map(|id| Uuid::parse_str(&id).unwrap()),
            })
        })?;

        let mut attendances = Vec::new();
        for attendance in attendance_iter {
            attendances.push(attendance?);
        }

        Ok(attendances)
    }

    fn delete_attendance(&self, conn: &Connection, id: Uuid) -> Result<()> {
        conn.execute(
            "DELETE FROM attendance WHERE id = ?1",
            params![id.to_string()],
        )?;

        Ok(())
    }

    fn get_all_attendances(&self, conn: &Connection) -> Result<Vec<Attendance>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM attendance ORDER BY time_in_date DESC"
        )?;
        
        let attendance_iter = stmt.query_map([], |row| {
            let time_in_str: String = row.get(3)?;
            let time_in_date = DateTime::parse_from_rfc3339(&time_in_str)
                .map(|dt| dt.with_timezone(&Utc))
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    Box::new(e)
                ))?;

            Ok(Attendance {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                school_id: row.get(1)?,
                full_name: row.get(2)?,
                time_in_date,
                classification: row.get(4)?,
                purpose_id: row.get::<_, Option<String>>(5)?.map(|id| Uuid::parse_str(&id).unwrap()),
            })
        })?;

        let mut attendances = Vec::new();
        for attendance in attendance_iter {
            attendances.push(attendance?);
        }

        Ok(attendances)
    }

    fn search_attendances(&self, conn: &Connection, query: &str) -> Result<Vec<Attendance>> {
        let sql = "SELECT * FROM attendance 
                   WHERE school_id LIKE ? OR 
                         full_name LIKE ?
                   ORDER BY time_in_date DESC";
        
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(sql)?;
        let attendance_iter = stmt.query_map(
            params![&search_pattern, &search_pattern],
            |row| {
                let time_in_str: String = row.get(3)?;
                let time_in_date = DateTime::parse_from_rfc3339(&time_in_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(
                        3,
                        rusqlite::types::Type::Text,
                        Box::new(e)
                    ))?;

                Ok(Attendance {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    school_id: row.get(1)?,
                    full_name: row.get(2)?,
                    time_in_date,
                    classification: row.get(4)?,
                    purpose_id: row.get::<_, Option<String>>(5)?.map(|id| Uuid::parse_str(&id).unwrap()),
                })
            }
        )?;

        let mut attendances = Vec::new();
        for attendance in attendance_iter {
            attendances.push(attendance?);
        }

        Ok(attendances)
    }
}

pub fn create_attendance_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            school_id TEXT NOT NULL,
            full_name TEXT NOT NULL,
            time_in_date TEXT NOT NULL,
            classification TEXT NOT NULL,
            purpose_id TEXT,
            CONSTRAINT fk_purpose
                FOREIGN KEY (purpose_id)
                REFERENCES purposes(id)
        )",
        [],
    )?;

    Ok(())
}