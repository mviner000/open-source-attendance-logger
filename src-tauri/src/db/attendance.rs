// src/db/attendance.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result, types::ToSql};
use serde::{Serialize, Deserialize};
use log::{info, error, debug, warn};
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
    pub full_name: String, // This can still be provided, but will be overridden if found in school_accounts
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
        info!("Starting attendance creation process");
        debug!("Input attendance request: {:?}", attendance);
        
        // Log initial validation
        if attendance.school_id.is_empty() {
            error!("Validation failed: School ID is empty");
            let err = rusqlite::Error::InvalidParameterName("School ID cannot be empty".to_string());
            return Err(err);
        }
        
        debug!("Looking up school account for ID: {}", attendance.school_id);
        
        // Detailed logging for school account lookup
        let (full_name, classification) = match conn.query_row(
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
                ) as computed_full_name,
                COALESCE(
                    CASE 
                        WHEN position IS NOT NULL AND position != '' THEN 'Faculty'
                        WHEN course IS NOT NULL AND course != '' THEN course
                        ELSE 'Unknown'
                    END, 
                    'Unknown'
                ) as computed_classification,
                first_name, middle_name, last_name, 
                course, department, position, major, year_level, is_active
            FROM school_accounts 
            WHERE school_id = ?2",
            params![attendance.full_name, attendance.school_id],
            |row| {
                let name: String = row.get(0)?;
                let classification: String = row.get(1)?;
                
                // Extract additional details for debug logging
                let first_name: Option<String> = row.get(2)?;
                let middle_name: Option<String> = row.get(3)?;
                let last_name: Option<String> = row.get(4)?;
                let course: Option<String> = row.get(5)?;
                let department: Option<String> = row.get(6)?;
                let position: Option<String> = row.get(7)?;
                let major: Option<String> = row.get(8)?;
                let year_level: Option<String> = row.get(9)?;
                let is_active: bool = row.get(10)?;
                
                debug!(
                    "Detailed School Account Information for ID {}: \
                    Name: {} {} {} | Course: {:?} | \
                    Department: {:?} | Position: {:?} | Major: {:?} | \
                    Year Level: {:?} | Active: {} | Computed Classification: {}",
                    attendance.school_id,
                    first_name.unwrap_or_default(),
                    middle_name.unwrap_or_default(),
                    last_name.unwrap_or_default(),
                    course,
                    department,
                    position,
                    major,
                    year_level,
                    is_active,
                    classification
                );
                
                Ok((name, classification))
            }
        ) {
            Ok((name, class_type)) => {
                info!("Successfully retrieved school account details");
                debug!("Using school account data - Name: {}, Classification: {}", name, class_type);
                (name, class_type)
            },
            Err(e) => {
                warn!("School account not found: {}", e);
                
                if attendance.full_name.is_empty() {
                    error!("No school account found and no full name provided");
                    let err = rusqlite::Error::InvalidParameterName("School ID not found".to_string());
                    return Err(err);
                }
                
                debug!("Falling back to provided values - Name: {}, Classification: Unknown", 
                    attendance.full_name);
                
                (attendance.full_name.clone(), "Unknown".to_string())
            }
        };
        
        // Override or validate input classification
        let final_classification = if !attendance.classification.is_empty() {
            attendance.classification.clone()
        } else {
            classification
        };
        
        let id = Uuid::new_v4();
        let time_in_date = Utc::now();
        let time_in_str = time_in_date.to_rfc3339();
        
        debug!("Preparing database insertion with values:");
        debug!("  - ID: {}", id);
        debug!("  - School ID: {}", attendance.school_id);
        debug!("  - Full Name: {}", full_name);
        debug!("  - Time In: {}", time_in_str);
        debug!("  - Classification: {}", final_classification);
        debug!("  - Purpose ID: {:?}", attendance.purpose_id);
        
        // Log the actual SQL operation
        info!("Executing database insertion");
        match conn.execute(
            "INSERT INTO attendance (
                id, school_id, full_name, time_in_date, classification, purpose_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id.to_string(),
                attendance.school_id,
                full_name,
                time_in_str,
                final_classification,
                attendance.purpose_id.map(|id| id.to_string())
            ],
        ) {
            Ok(_) => debug!("Database insertion successful"),
            Err(e) => {
                error!("Database insertion failed: {}", e);
                return Err(e);
            }
        }
        
        let created_attendance = Attendance {
            id,
            school_id: attendance.school_id,
            full_name,
            time_in_date,
            classification: final_classification,
            purpose_id: attendance.purpose_id,
        };
        
        info!("Successfully created attendance record:");
        debug!("Created attendance details: {:?}", created_attendance);
        
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