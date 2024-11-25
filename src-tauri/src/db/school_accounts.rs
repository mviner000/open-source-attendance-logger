// src/db/school_accounts.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};
use serde::Deserializer;
use log::{info, error};
use rusqlite::Result as SqlResult;


// Enum for gender choices
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Gender {
    Male,
    Female,
    Other,
}

// Enum for last updated semesters
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Semester {
    FirstSem2024_2025,
    SecondSem2024_2025,
    FirstSem2025_2026,
    SecondSem2025_2026,
    None,
}

// Struct representing the School Account
#[derive(Debug, Serialize, Deserialize)]
pub struct SchoolAccount {
    pub id: Uuid,
    pub school_id: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<Gender>,
    pub course: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub major: Option<String>,
    pub year_level: Option<String>,
    pub is_active: bool,
    pub last_updated: Option<Semester>,
}

// Create Request Struct
#[derive(Debug, Deserialize)]
pub struct CreateSchoolAccountRequest {
    pub school_id: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<Gender>,
    pub course: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub major: Option<String>,
    pub year_level: Option<String>,
    #[serde(default = "default_is_active")]
    pub is_active: bool,
    #[serde(default)]
    pub last_updated: Option<Semester>,
}

// Update Request Struct
#[derive(Debug, Deserialize)]
pub struct UpdateSchoolAccountRequest {
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    #[serde(deserialize_with = "deserialize_gender")]
    pub gender: Option<Gender>,
    pub course: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub major: Option<String>,
    pub year_level: Option<String>,
    pub is_active: Option<bool>,
    #[serde(deserialize_with = "deserialize_semester", default)]
    pub last_updated: Option<Semester>,
}

// Default function for is_active
fn default_is_active() -> bool {
    true
}

// Trait for SchoolAccount Database Operations
pub trait SchoolAccountRepository {
    // Create a new school account
    fn create_school_account(&self, conn: &Connection, account: CreateSchoolAccountRequest) -> Result<SchoolAccount>;
    
    // Get a school account by its UUID
    fn get_school_account(&self, conn: &Connection, id: Uuid) -> Result<SchoolAccount>;
    
    // Get a school account by school_id
    fn get_school_account_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<SchoolAccount>;
    
    // Update a school account
    fn update_school_account(&self, conn: &Connection, id: Uuid, account: UpdateSchoolAccountRequest) -> Result<SchoolAccount>;
    
    // Delete a school account
    fn delete_school_account(&self, conn: &Connection, id: Uuid) -> Result<()>;
    
    // Get all school accounts
    fn get_all_school_accounts(&self, conn: &Connection) -> Result<Vec<SchoolAccount>>;

    fn search_school_accounts(&self, conn: &Connection, query: &str) -> Result<Vec<SchoolAccount>>;
}

pub struct SqliteSchoolAccountRepository;

fn deserialize_gender<'de, D>(deserializer: D) -> Result<Option<Gender>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    Ok(match value {
        serde_json::Value::String(s) => Some(match s.as_str() {
            "Male" => Gender::Male,
            "Female" => Gender::Female,
            "Other" => Gender::Other,
            _ => Gender::Other,
        }),
        serde_json::Value::Number(n) => {
            let gender = n.as_i64().unwrap_or(2);
            Some(match gender {
                0 => Gender::Male,
                1 => Gender::Female,
                _ => Gender::Other,
            })
        }
        _ => None,
    })
}

fn deserialize_semester<'de, D>(deserializer: D) -> Result<Option<Semester>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    Ok(match value {
        serde_json::Value::String(s) => Some(match s.as_str() {
            "FirstSem2024_2025" => Semester::FirstSem2024_2025,
            "SecondSem2024_2025" => Semester::SecondSem2024_2025,
            "FirstSem2025_2026" => Semester::FirstSem2025_2026,
            "SecondSem2025_2026" => Semester::SecondSem2025_2026,
            _ => Semester::None,
        }),
        serde_json::Value::Number(n) => {
            let semester = n.as_i64().unwrap_or(4);
            Some(match semester {
                0 => Semester::FirstSem2024_2025,
                1 => Semester::SecondSem2024_2025,
                2 => Semester::FirstSem2025_2026,
                3 => Semester::SecondSem2025_2026,
                _ => Semester::None,
            })
        }
        _ => None,
    })
}



// Optional helper function for logging (if needed separately)
fn log_school_account_creation_attempt(
    account: &CreateSchoolAccountRequest, 
    result: &Result<SchoolAccount>
) {
    match result {
        Ok(created_account) => {
            info!(
                "School Account Created Successfully: ID={}, SchoolID={}, Name={} {}",
                created_account.id,
                created_account.school_id,
                created_account.first_name.clone().unwrap_or_default(),
                created_account.last_name.clone().unwrap_or_default()
            );
        },
        Err(e) => {
            error!(
                "School Account Creation Failed: SchoolID={}, Error={:?}", 
                account.school_id, 
                e
            );
        }
    }
}

// Implement the repository for a specific database type (e.g., SQLite)
impl SchoolAccountRepository for SqliteSchoolAccountRepository {
    fn create_school_account(&self, conn: &Connection, account: CreateSchoolAccountRequest) -> Result<SchoolAccount> {
        // Generate a new UUID for the account
        let id = Uuid::new_v4();
        
        // Log the attempt to create a new school account
        info!("Attempting to create school account for school ID: {}", account.school_id);

        // Validate required fields
        if account.school_id.is_empty() {
            error!("Failed to create school account: School ID is required");
            let err = rusqlite::Error::InvalidParameterName(
                "School ID cannot be empty".to_string()
            );
            
            // Log the error
            error!("School Account Creation Failed: SchoolID={}, Error={:?}", 
                account.school_id, 
                err
            );
            
            return Err(err);
        }

        // Attempt to execute the database insertion
        let result = conn.execute(
            "INSERT INTO school_accounts (
                id, school_id, first_name, middle_name, last_name, 
                gender, course, department, position, major, year_level, is_active, last_updated
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id.to_string(), 
                account.school_id, 
                account.first_name, 
                account.middle_name, 
                account.last_name,
                account.gender.as_ref().map(|g| g.clone() as i32), 
                account.course, 
                account.department, 
                account.position, 
                account.major, 
                account.year_level,
                account.is_active,
                account.last_updated.clone().map(|s| match s {
                    Semester::FirstSem2024_2025 => 0,
                    Semester::SecondSem2024_2025 => 1,
                    Semester::FirstSem2025_2026 => 2,
                    Semester::SecondSem2025_2026 => 3,
                    Semester::None => 4,
                })
            ],
        );

        // Handle potential database insertion errors
        match result {
            Ok(_) => {
                // Create the SchoolAccount struct
                let created_account = SchoolAccount {
                    id,
                    school_id: account.school_id,
                    first_name: account.first_name,
                    middle_name: account.middle_name,
                    last_name: account.last_name,
                    gender: account.gender.clone(),
                    course: account.course,
                    department: account.department,
                    position: account.position,
                    major: account.major,
                    year_level: account.year_level,
                    is_active: account.is_active,
                    last_updated: account.last_updated.clone(),
                };

                // Log successful creation
                info!(
                    "School Account Created Successfully: ID={}, SchoolID={}, Name={} {}",
                    created_account.id,
                    created_account.school_id,
                    created_account.first_name.clone().unwrap_or_default(),
                    created_account.last_name.clone().unwrap_or_default()
                );

                Ok(created_account)
            },
            Err(e) => {
                // Log different types of errors with appropriate severity
                match &e {
                    rusqlite::Error::SqliteFailure(error, message) => {
                        if error.code == rusqlite::ErrorCode::ConstraintViolation {
                            error!(
                                "Constraint violation when creating school account for school ID {}: {:?} {}",
                                account.school_id, 
                                error, 
                                message.as_ref().cloned().unwrap_or_else(|| "Unknown constraint violated".to_string())
                            );
                        } else {
                            error!(
                                "SQLite error when creating school account for school ID {}: {:?} {}",
                                account.school_id, 
                                error, 
                                message.as_ref().cloned().unwrap_or_else(|| "Unknown error".to_string())
                            );
                        }
                        Err(e)
                    },
                    _ => {
                        error!(
                            "Unexpected error when creating school account for school ID {}: {:?}",
                            account.school_id, 
                            e
                        );
                        Err(e)
                    }
                }
            }
        }
    }

    fn search_school_accounts(&self, conn: &Connection, query: &str) -> Result<Vec<SchoolAccount>> {
        let sql = "SELECT * FROM school_accounts 
                   WHERE school_id LIKE ? OR 
                         first_name LIKE ? OR 
                         middle_name LIKE ? OR 
                         last_name LIKE ?";
        
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(sql)?;
        let account_iter = stmt.query_map(params![
            &search_pattern, 
            &search_pattern, 
            &search_pattern, 
            &search_pattern
        ], |row| {
            Ok(SchoolAccount {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                school_id: row.get(1)?,
                first_name: row.get(2)?,
                middle_name: row.get(3)?,
                last_name: row.get(4)?,
                gender: row.get::<_, Option<i32>>(5)?.map(|g| match g {
                    0 => Gender::Male,
                    1 => Gender::Female,
                    _ => Gender::Other,
                }),
                course: row.get(6)?,
                department: row.get(7)?,
                position: row.get(8)?,
                major: row.get(9)?,
                year_level: row.get(10)?,
                is_active: row.get(11)?,
                last_updated: row.get::<_, Option<i32>>(12)?.map(|s| match s {
                    0 => Semester::FirstSem2024_2025,
                    1 => Semester::SecondSem2024_2025,
                    2 => Semester::FirstSem2025_2026,
                    3 => Semester::SecondSem2025_2026,
                    _ => Semester::None,
                }),
            })
        })?;
    
        let mut accounts = Vec::new();
        for account in account_iter {
            accounts.push(account?);
        }
    
        Ok(accounts)
    }

    fn get_school_account(&self, conn: &Connection, id: Uuid) -> Result<SchoolAccount> {
        let account = conn.query_row(
            "SELECT * FROM school_accounts WHERE id = ?1",
            params![id.to_string()],
            |row| {
                Ok(SchoolAccount {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    school_id: row.get(1)?,
                    first_name: row.get(2)?,
                    middle_name: row.get(3)?,
                    last_name: row.get(4)?,
                    gender: row.get::<_, Option<i32>>(5)?.map(|g| match g {
                        0 => Gender::Male,
                        1 => Gender::Female,
                        _ => Gender::Other,
                    }),
                    course: row.get(6)?,
                    department: row.get(7)?,
                    position: row.get(8)?,
                    major: row.get(9)?,
                    year_level: row.get(10)?,
                    is_active: row.get(11)?,
                    last_updated: row.get::<_, Option<i32>>(12)?.map(|s| match s {
                        0 => Semester::FirstSem2024_2025,
                        1 => Semester::SecondSem2024_2025,
                        2 => Semester::FirstSem2025_2026,
                        3 => Semester::SecondSem2025_2026,
                        _ => Semester::None,
                    }),
                })
            },
        )?;

        Ok(account)
    }

    fn get_school_account_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<SchoolAccount> {
        let account = conn.query_row(
            "SELECT * FROM school_accounts WHERE school_id = ?1",
            params![school_id],
            |row| {
                Ok(SchoolAccount {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    school_id: row.get(1)?,
                    first_name: row.get(2)?,
                    middle_name: row.get(3)?,
                    last_name: row.get(4)?,
                    gender: row.get::<_, Option<i32>>(5)?.map(|g| match g {
                        0 => Gender::Male,
                        1 => Gender::Female,
                        _ => Gender::Other,
                    }),
                    course: row.get(6)?,
                    department: row.get(7)?,
                    position: row.get(8)?,
                    major: row.get(9)?,
                    year_level: row.get(10)?,
                    is_active: row.get(11)?,
                    last_updated: row.get::<_, Option<i32>>(12)?.map(|s| match s {
                        0 => Semester::FirstSem2024_2025,
                        1 => Semester::SecondSem2024_2025,
                        2 => Semester::FirstSem2025_2026,
                        3 => Semester::SecondSem2025_2026,
                        _ => Semester::None,
                    }),
                })
            },
        )?;

        Ok(account)
    }

    fn update_school_account(&self, conn: &Connection, id: Uuid, account: UpdateSchoolAccountRequest) -> Result<SchoolAccount> {
        conn.execute(
            "UPDATE school_accounts SET 
                first_name = COALESCE(?1, first_name), 
                middle_name = COALESCE(?2, middle_name), 
                last_name = COALESCE(?3, last_name), 
                gender = COALESCE(?4, gender), 
                course = COALESCE(?5, course), 
                department = COALESCE(?6, department), 
                position = COALESCE(?7, position), 
                major = COALESCE(?8, major), 
                year_level = COALESCE(?9, year_level),
                is_active = COALESCE(?10, is_active),
                last_updated = COALESCE(?11, last_updated)
            WHERE id = ?12",
            params![
                account.first_name, 
                account.middle_name, 
                account.last_name,
                account.gender.map(|g| match g {
                    Gender::Male => 0,
                    Gender::Female => 1,
                    Gender::Other => 2
                }), 
                account.course, 
                account.department, 
                account.position, 
                account.major, 
                account.year_level,
                account.is_active,
                account.last_updated.clone().map(|s| match s {
                    Semester::FirstSem2024_2025 => 0,
                    Semester::SecondSem2024_2025 => 1,
                    Semester::FirstSem2025_2026 => 2,
                    Semester::SecondSem2025_2026 => 3,
                    Semester::None => 4,
                }),
                id.to_string()
            ],
        )?;
    
        // Retrieve the updated account
        self.get_school_account(conn, id)
    }

    fn delete_school_account(&self, conn: &Connection, id: Uuid) -> Result<()> {
        conn.execute(
            "DELETE FROM school_accounts WHERE id = ?1",
            params![id.to_string()],
        )?;

        Ok(())
    }

    fn get_all_school_accounts(&self, conn: &Connection) -> Result<Vec<SchoolAccount>> {
        let mut stmt = conn.prepare("SELECT * FROM school_accounts")?;
        let account_iter = stmt.query_map([], |row| {
            Ok(SchoolAccount {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                school_id: row.get(1)?,
                first_name: row.get(2)?,
                middle_name: row.get(3)?,
                last_name: row.get(4)?,
                gender: row.get::<_, Option<i32>>(5)?.map(|g| match g {
                    0 => Gender::Male,
                    1 => Gender::Female,
                    _ => Gender::Other,
                }),
                course: row.get(6)?,
                department: row.get(7)?,
                position: row.get(8)?,
                major: row.get(9)?,
                year_level: row.get(10)?,
                is_active: row.get(11)?,
                last_updated: row.get::<_, Option<i32>>(12)?.map(|s| match s {
                    0 => Semester::FirstSem2024_2025,
                    1 => Semester::SecondSem2024_2025,
                    2 => Semester::FirstSem2025_2026,
                    3 => Semester::SecondSem2025_2026,
                    _ => Semester::None,
                }),
            })
        })?;
    
        let mut accounts = Vec::new();
        for account in account_iter {
            accounts.push(account?);
        }
    
        Ok(accounts)
    }
}


// SQL to create the table with all required columns
pub fn create_school_accounts_table(conn: &Connection) -> SqlResult<()> {
    // First, check if table exists
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='school_accounts'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if table_exists {
        // Drop the existing table to recreate with correct schema
        conn.execute("DROP TABLE school_accounts", [])?;
    }

    // Create the table with all required columns
    conn.execute(
        "CREATE TABLE school_accounts (
            id TEXT PRIMARY KEY,
            school_id TEXT UNIQUE NOT NULL,
            first_name TEXT,
            middle_name TEXT,
            last_name TEXT,
            gender INTEGER,
            course TEXT,
            department TEXT,
            position TEXT,
            major TEXT,
            year_level TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_updated INTEGER,
            CONSTRAINT school_id_unique UNIQUE (school_id)
        )",
        [],
    )?;

    Ok(())
}
