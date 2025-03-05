// src/db/classification.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use log::{info, error};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Classification {
    pub id: Uuid,
    pub placing: Option<i32>,
    pub long_name: String,
    pub short_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClassificationScanResult {
    pub total_scanned: usize,
    pub added_to_database: usize,
    pub already_existed: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedCourse {
    pub long_name: String,
    pub existing_short_name: Option<String>,
    pub existing_placing: Option<i32>,
    pub exists: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClassificationInput {
    pub long_name: String,
    pub short_name: Option<String>,
    pub placing: Option<i32>,
}

pub trait ClassificationRepository: Send {
    fn create_classification(&self, conn: &Connection, classification: &Classification) -> Result<Classification>;
    fn get_classification_by_long_name(&self, conn: &Connection, long_name: &str) -> Result<Option<Classification>>;
    fn scan_and_save_courses_from_school_accounts(&self, conn: &Connection) -> Result<ClassificationScanResult>;
    fn scan_distinct_courses(&self, conn: &Connection) -> Result<Vec<ScannedCourse>>;
    fn update_classification(&self, conn: &Connection, classification: &Classification) -> Result<()>;
}

pub struct SqliteClassificationRepository;

impl ClassificationRepository for SqliteClassificationRepository {
    fn scan_distinct_courses(&self, conn: &Connection) -> Result<Vec<ScannedCourse>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT course FROM school_accounts WHERE course IS NOT NULL AND course != ''"
        )?;

        let courses_iter = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut scanned_courses = Vec::new();

        for course in courses_iter {
            let long_name = course?;
            match self.get_classification_by_long_name(conn, &long_name) {
                Ok(Some(existing)) => {
                    scanned_courses.push(ScannedCourse {
                        long_name,
                        existing_short_name: existing.short_name,
                        existing_placing: existing.placing,
                        exists: true,
                    });
                }
                Ok(None) => {
                    scanned_courses.push(ScannedCourse {
                        long_name,
                        existing_short_name: None,
                        existing_placing: None,
                        exists: false,
                    });
                }
                Err(e) => return Err(e),
            }
        }

        Ok(scanned_courses)
    }

    fn update_classification(&self, conn: &Connection, classification: &Classification) -> Result<()> {
        conn.execute(
            "UPDATE classifications SET short_name = ?1, placing = ?2 WHERE long_name = ?3",
            params![
                classification.short_name,
                classification.placing,
                classification.long_name
            ],
        )?;

        info!(
            "Updated classification: {}",
            classification.long_name
        );

        Ok(())
    }

    fn create_classification(&self, conn: &Connection, classification: &Classification) -> Result<Classification> {
        conn.execute(
            "INSERT INTO classifications (
                id, 
                placing, 
                long_name, 
                short_name
            ) VALUES (?1, ?2, ?3, ?4)",
            params![
                classification.id.to_string(),
                classification.placing,
                classification.long_name,
                classification.short_name
            ],
        )?;

        info!(
            "Created classification: Long Name = {}, Short Name = {:?}",
            classification.long_name, 
            classification.short_name
        );

        Ok(classification.clone())
    }

    fn get_classification_by_long_name(&self, conn: &Connection, long_name: &str) -> Result<Option<Classification>> {
        let result = conn.query_row(
            "SELECT id, placing, long_name, short_name FROM classifications WHERE long_name = ?1",
            params![long_name],
            |row| {
                Ok(Classification {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    placing: row.get(1)?,
                    long_name: row.get(2)?,
                    short_name: row.get(3)?,
                })
            },
        );

        match result {
            Ok(classification) => Ok(Some(classification)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    fn scan_and_save_courses_from_school_accounts(&self, conn: &Connection) -> Result<ClassificationScanResult> {
        // First, get distinct courses from school_accounts
        let mut stmt = conn.prepare(
            "SELECT DISTINCT course FROM school_accounts WHERE course IS NOT NULL AND course != ''"
        )?;

        let courses_iter = stmt.query_map([], |row| row.get::<_, String>(0))?;

        let mut result = ClassificationScanResult {
            total_scanned: 0,
            added_to_database: 0,
            already_existed: 0,
            errors: Vec::new(),
        };

        for course in courses_iter {
            match course {
                Ok(course_name) => {
                    result.total_scanned += 1;

                    // Check if classification already exists
                    match self.get_classification_by_long_name(conn, &course_name) {
                        Ok(Some(_)) => {
                            result.already_existed += 1;
                            info!("Course already exists: {}", course_name);
                        }
                        Ok(None) => {
                            // Create a new classification
                            let new_classification = Classification {
                                id: Uuid::new_v4(),
                                placing: None,
                                long_name: course_name.clone(),
                                short_name: None,
                            };

                            match self.create_classification(conn, &new_classification) {
                                Ok(_) => result.added_to_database += 1,
                                Err(e) => {
                                    error!("Failed to save course {}: {:?}", course_name, e);
                                    result.errors.push(format!("Failed to save course {}: {:?}", course_name, e));
                                }
                            }
                        }
                        Err(e) => {
                            error!("Error checking course {}: {:?}", course_name, e);
                            result.errors.push(format!("Error checking course {}: {:?}", course_name, e));
                        }
                    }
                }
                Err(e) => {
                    error!("Error processing course: {:?}", e);
                    result.errors.push(format!("Error processing course: {:?}", e));
                }
            }
        }

        info!(
            "Course Scan Summary: Total={}, Added={}, Existed={}, Errors={}",
            result.total_scanned,
            result.added_to_database,
            result.already_existed,
            result.errors.len()
        );

        Ok(result)
    }
}

// SQL to create the classifications table
pub fn create_classifications_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classifications (
            id TEXT PRIMARY KEY,
            placing INTEGER,
            long_name TEXT UNIQUE NOT NULL,
            short_name TEXT UNIQUE
        )",
        [],
    )?;

    Ok(())
}