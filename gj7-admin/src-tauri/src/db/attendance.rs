// src/db/attendance.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use std::io;
use rusqlite::Error as SqliteError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Attendance {
    pub id: Uuid,
    pub school_id: String,
    pub full_name: String,
    pub time_in_date: DateTime<Utc>,
    pub classification: String,
    pub purpose_label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateAttendanceRequest {
    pub school_id: String,
    pub full_name: String,
    pub classification: Option<String>,
    pub purpose_label: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct UpdateAttendanceRequest {
    pub school_id: Option<String>,
    pub full_name: Option<String>,
    pub classification: Option<String>,
    pub purpose_label: Option<String>,
}

// Custom error type for CSV operations
#[derive(Debug)]
pub enum AttendanceExportError {
    Csv(csv::Error),
    Sqlite(SqliteError),
    Io(io::Error),
}

impl From<csv::Error> for AttendanceExportError {
    fn from(err: csv::Error) -> Self {
        AttendanceExportError::Csv(err)
    }
}

impl From<SqliteError> for AttendanceExportError {
    fn from(err: SqliteError) -> Self {
        AttendanceExportError::Sqlite(err)
    }
}

impl From<io::Error> for AttendanceExportError {
    fn from(err: io::Error) -> Self {
        AttendanceExportError::Io(err)
    }
}

pub trait AttendanceRepository: Send + Sync {
    fn clone_box(&self) -> Box<dyn AttendanceRepository + Send + Sync>;
    fn create_attendance(&self, conn: &Connection, attendance: CreateAttendanceRequest) -> Result<Attendance>;
    fn get_attendance(&self, conn: &Connection, id: Uuid) -> Result<Attendance>;
    fn get_attendances_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<Vec<Attendance>>;
    fn delete_attendance(&self, conn: &Connection, id: Uuid) -> Result<()>;
    fn get_all_attendances(&self, conn: &Connection) -> Result<Vec<Attendance>>;
    fn search_attendances(&self, conn: &Connection, query: &str) -> Result<Vec<Attendance>>;
    fn update_attendance(&self, conn: &Connection, id: Uuid, attendance: UpdateAttendanceRequest) -> Result<Attendance>;
    fn get_attendances_by_semester(&self, conn: &Connection, semester_id: Uuid) -> Result<Vec<Attendance>>;
    fn get_attendances_by_school_account(&self, conn: &Connection, school_account_id: Uuid) -> Result<Vec<Attendance>>;
    fn get_last_n_attendances(&self, conn: &Connection, n: usize) -> Result<Vec<Attendance>, rusqlite::Error>;
    fn get_filtered_attendances(
        &self, 
        conn: &Connection, 
        course: Option<String>, 
        date: Option<DateTime<Utc>>
    ) -> Result<Vec<Attendance>>;
    fn get_all_courses(&self, conn: &Connection) -> Result<Vec<String>>;
    fn export_attendances_to_csv(
        &self, 
        conn: &Connection, 
        path: PathBuf, 
        attendances: Vec<Attendance>
    ) -> std::result::Result<(), AttendanceExportError> {
        let mut wtr = csv::Writer::from_path(path)?;

        // Write header
        wtr.write_record(&[
            "ID",
            "School ID",
            "Full Name",
            "Date",
            "Time",
            "Classification",
            "Purpose"
        ])?;

        // Write data
        for attendance in attendances {
            // Convert UTC to local time and format
            let local_time = attendance.time_in_date.with_timezone(&chrono::Local);
            
            // Format date as MM/DD/YYYY
            let date_str = local_time.format("%m/%d/%Y").to_string();
            
            // Format time as hh:MM AM/PM
            let time_str = local_time.format("%I:%M %p").to_string();
            
            wtr.write_record(&[
                attendance.id.to_string(),
                attendance.school_id,
                attendance.full_name,
                date_str,
                time_str,
                attendance.classification,
                attendance.purpose_label.unwrap_or_default()
            ])?;
        }

        wtr.flush()?;
        Ok(())
    }
}

// Implement Clone for SqliteAttendanceRepository
impl Clone for SqliteAttendanceRepository {
    fn clone(&self) -> Self {
        SqliteAttendanceRepository
    }
}

pub struct SqliteAttendanceRepository;

impl AttendanceRepository for SqliteAttendanceRepository {
    fn clone_box(&self) -> Box<dyn AttendanceRepository + Send + Sync> {
        Box::new(self.clone())
    }

    fn get_all_courses(&self, conn: &Connection) -> Result<Vec<String>> {
        let query = "
            SELECT DISTINCT course 
            FROM school_accounts 
            WHERE course IS NOT NULL AND course != '' 
            ORDER BY course ASC
        ";
        
        let mut stmt = conn.prepare(query)?;
        let course_iter = stmt.query_map([], |row| {
            row.get::<_, String>(0)
        })?;

        let mut courses = Vec::new();
        for course in course_iter {
            courses.push(course?);
        }

        Ok(courses)
    }

    fn get_filtered_attendances(
        &self, 
        conn: &Connection, 
        course: Option<String>, 
        date: Option<DateTime<Utc>>
    ) -> Result<Vec<Attendance>> {
        // Base query with flexible filtering
        let mut query = String::from("
            SELECT DISTINCT a.* FROM attendance a
            LEFT JOIN school_accounts sa ON a.school_id = sa.school_id
            WHERE 1=1
        ");
    
        // Prepare parameters for the query
        let mut param_conditions = Vec::new();
        let mut param_values = Vec::new();
    
        // Add course filter if specified
        if let Some(course_name) = course {
            param_conditions.push("sa.course = ?");
            param_values.push(course_name);
        }
    
        // Add date filter if specified (exact date match)
        if let Some(filter_date) = date {
            // Match the entire day
            param_conditions.push("date(a.time_in_date) = date(?)");
            param_values.push(filter_date.to_rfc3339());
        }
    
        // Add conditions to query if any
        if !param_conditions.is_empty() {
            query.push_str(" AND ");
            query.push_str(&param_conditions.join(" AND "));
        }
    
        // Add ordering
        query.push_str(" ORDER BY a.time_in_date DESC");
    
        // Prepare the statement with dynamic parameters
        let mut stmt = conn.prepare(&query)?;
        
        let attendance_iter = stmt.query_map(rusqlite::params_from_iter(param_values.iter().map(|v| v.as_str())), |row| {
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
                purpose_label: row.get(5)?,
            })
        })?;
    
        let mut attendances = Vec::new();
        for attendance in attendance_iter {
            attendances.push(attendance?);
        }
    
        Ok(attendances)
    }
    
    
    fn create_attendance(&self, conn: &Connection, attendance: CreateAttendanceRequest) -> Result<Attendance> {
        if attendance.school_id.is_empty() {
            let err = rusqlite::Error::InvalidParameterName("School ID cannot be empty".to_string());
            return Err(err);
        }
        
        // Only get the full name from database if not provided
        let full_name = match conn.query_row(
            "SELECT 
                COALESCE(
                    CASE 
                        WHEN first_name IS NOT NULL AND middle_name IS NOT NULL AND last_name IS NOT NULL THEN 
                            first_name || ' ' || middle_name || ' ' || last_name
                        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 
                            first_name || ' ' || last_name
                        ELSE first_name
                    END, 
                    ?1
                ) as computed_full_name
            FROM school_accounts 
            WHERE school_id = ?2",
            params![
                attendance.full_name, 
                attendance.school_id
            ],
            |row| row.get::<_, String>(0)
        ) {
            Ok(name) => name,
            Err(_) => attendance.full_name.clone()
        };
        
        let id = Uuid::new_v4();
        let time_in_date = Utc::now();
        let time_in_str = time_in_date.to_rfc3339();
        
        // Use the classification provided by the frontend, with "Visitor" as fallback
        let classification = attendance.classification.unwrap_or_else(|| "Visitor".to_string());
        
        conn.execute(
            "INSERT INTO attendance (
                id, school_id, full_name, time_in_date, classification, purpose_label
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id.to_string(),
                attendance.school_id,
                full_name,
                time_in_str,
                classification,
                attendance.purpose_label
            ],
        )?;
        
        let created_attendance = Attendance {
            id,
            school_id: attendance.school_id,
            full_name,
            time_in_date,
            classification,
            purpose_label: attendance.purpose_label,
        };
        
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
                    purpose_label: row.get(5)?,
                })
            },
        )?;

        Ok(attendance)
    }

    fn get_last_n_attendances(&self, conn: &Connection, n: usize) -> Result<Vec<Attendance>, rusqlite::Error> {
        let query = "
            SELECT id, school_id, full_name, time_in_date, classification, purpose_label
            FROM attendance 
            ORDER BY time_in_date DESC 
            LIMIT ?
        ";
        
        let mut stmt = conn.prepare(query)?;
        let attendance_iter = stmt.query_map([n], |row| {
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
                purpose_label: row.get(5)?,
            })
        })?;
    
        attendance_iter.collect::<Result<Vec<Attendance>, _>>()
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
                purpose_label: row.get(5)?,
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
                purpose_label: row.get(5)?,
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
                purpose_label: row.get(5)?,
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
                purpose_label: row.get(5)?,
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
                         full_name LIKE ? OR
                         purpose_label LIKE ?
                   ORDER BY time_in_date DESC";
        
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(sql)?;
        let attendance_iter = stmt.query_map(
            params![&search_pattern, &search_pattern, &search_pattern],
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
                    purpose_label: row.get(5)?, // Use purpose_label instead of purpose_id
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
            purpose_label TEXT
        )",
        [],
    )?;

    Ok(())
}