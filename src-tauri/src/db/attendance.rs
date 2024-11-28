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

#[derive(Debug, Deserialize, Clone)]
pub struct UpdateAttendanceRequest {
    pub school_id: Option<String>,
    pub full_name: Option<String>,
    pub classification: Option<String>,
    pub purpose_id: Option<Uuid>,
}

pub trait AttendanceRepository: Send {
    fn create_attendance(&self, conn: &Connection, attendance: CreateAttendanceRequest) -> Result<Attendance>;
    fn get_attendance(&self, conn: &Connection, id: Uuid) -> Result<Attendance>;
    fn get_attendances_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<Vec<Attendance>>;
    fn delete_attendance(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_attendances(&self, conn: &Connection) -> Result<Vec<Attendance>>;
    fn search_attendances(&self, conn: &Connection, query: &str) -> Result<Vec<Attendance>>;
    fn update_attendance(&self, conn: &Connection, id: Uuid, attendance: UpdateAttendanceRequest) -> Result<Attendance>;
    fn get_attendances_by_semester(&self, conn: &Connection, semester_id: Uuid) -> Result<Vec<Attendance>>;
    fn get_attendances_by_school_account(&self, conn: &Connection, school_account_id: Uuid) -> Result<Vec<Attendance>>;
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

    fn get_attendances_by_semester(&self, conn: &Connection, semester_id: Uuid) -> Result<Vec<Attendance>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM attendance 
             JOIN semester_accounts ON attendance.school_id = semester_accounts.school_id 
             WHERE semester_accounts.semester_id = ?1 
             ORDER BY attendance.time_in_date DESC"
        )?;
        
        let attendance_iter = stmt.query_map(params![semester_id.to_string()], |row| {
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

    fn get_attendances_by_school_account(&self, conn: &Connection, school_account_id: Uuid) -> Result<Vec<Attendance>> {
        let mut stmt = conn.prepare(
            "SELECT * FROM attendance 
             WHERE school_id = (
                 SELECT school_id FROM school_accounts 
                 WHERE id = ?1
             ) 
             ORDER BY time_in_date DESC"
        )?;
        
        let attendance_iter = stmt.query_map(params![school_account_id.to_string()], |row| {
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

    fn update_attendance(&self, conn: &Connection, id: Uuid, attendance: UpdateAttendanceRequest) -> Result<Attendance> {
        let mut update_parts = Vec::new();
        let mut params_values: Vec<String> = Vec::new();
        let mut param_count = 1;
    
        if let Some(school_id) = &attendance.school_id {
            update_parts.push(format!("school_id = ?{}", param_count));
            params_values.push(school_id.clone());
            param_count += 1;
        }
    
        if let Some(full_name) = &attendance.full_name {
            update_parts.push(format!("full_name = ?{}", param_count));
            params_values.push(full_name.clone());
            param_count += 1;
        }
    
        if let Some(classification) = &attendance.classification {
            update_parts.push(format!("classification = ?{}", param_count));
            params_values.push(classification.clone());
            param_count += 1;
        }
    
        if let Some(purpose_id) = &attendance.purpose_id {
            update_parts.push(format!("purpose_id = ?{}", param_count));
            params_values.push(purpose_id.to_string());
            param_count += 1;
        }
    
        if update_parts.is_empty() {
            // If no updates are provided, return the existing record
            return self.get_attendance(conn, id);
        }
    
        let sql = format!(
            "UPDATE attendance SET {} WHERE id = ?{}",
            update_parts.join(", "),
            param_count
        );
    
        params_values.push(id.to_string());
    
        // Use the params! macro to create parameters
        let result = conn.execute(
            &sql, 
            rusqlite::params_from_iter(params_values.iter().map(|v| v.as_str()))
        )?;
    
        // Retrieve and return the updated record
        self.get_attendance(conn, id)
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