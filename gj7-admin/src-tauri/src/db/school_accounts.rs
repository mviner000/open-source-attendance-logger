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

// Struct representing the School Account
#[derive(Debug, Serialize, Deserialize, Clone)]
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
    pub last_updated_semester_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedSchoolAccounts {
    pub accounts: Vec<SchoolAccount>,
    pub total_count: u64,
    pub page: u64,
    pub page_size: u64,
    pub total_pages: u64,
}

// Create Request Struct
#[derive(Debug, Deserialize, Clone, Default)]
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
    pub last_updated_semester_id: Option<Uuid>,
}

// Update Request Struct
#[derive(Debug, Deserialize,Default)]
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
    pub last_updated_semester_id: Option<Uuid>,
}

// Default function for is_active
fn default_is_active() -> bool {
    true
}

// Trait for SchoolAccount Database Operations
pub trait SchoolAccountRepository: Send {
    // Existing methods remain the same...
    fn create_school_account(&self, conn: &Connection, account: CreateSchoolAccountRequest) -> Result<SchoolAccount>;
    
    fn get_school_account(&self, conn: &Connection, id: Uuid) -> Result<SchoolAccount>;
    
    fn get_school_account_by_school_id(&self, conn: &Connection, school_id: &str) -> Result<SchoolAccount>;
    
    fn update_school_account(&self, conn: &Connection, id: Uuid, account: UpdateSchoolAccountRequest) -> Result<SchoolAccount>;
    
    fn delete_school_account(&self, conn: &Connection, id: Uuid) -> Result<()>;
    
    fn get_all_school_accounts(&self, conn: &Connection) -> Result<Vec<SchoolAccount>>;

    fn search_school_accounts(&self, conn: &Connection, query: &str) -> Result<Vec<SchoolAccount>>;

    fn get_paginated_school_accounts(
        &self, 
        conn: &Connection, 
        page: u64, 
        page_size: u64,
        semester_id: Option<Uuid>
    ) -> Result<PaginatedSchoolAccounts>;
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

impl From<CreateSchoolAccountRequest> for UpdateSchoolAccountRequest {
    fn from(create_request: CreateSchoolAccountRequest) -> Self {
        UpdateSchoolAccountRequest {
            first_name: create_request.first_name,
            middle_name: create_request.middle_name,
            last_name: create_request.last_name,
            gender: create_request.gender,
            course: create_request.course,
            department: create_request.department,
            position: create_request.position,
            major: create_request.major,
            year_level: create_request.year_level,
            is_active: Some(create_request.is_active),
            last_updated_semester_id: create_request.last_updated_semester_id,
        }
    }
}

// Implement the repository for a specific database type (e.g., SQLite)
impl SchoolAccountRepository for SqliteSchoolAccountRepository {
    fn create_school_account(&self, conn: &Connection, account: CreateSchoolAccountRequest) -> Result<SchoolAccount> {
        info!("Creating new school account with school_id: {}", account.school_id);
        
        // Generate a new UUID for the account
        let id = Uuid::new_v4();
        
        // Validate required fields
        if account.school_id.is_empty() {
            let err = rusqlite::Error::InvalidParameterName("School ID cannot be empty".to_string());
            error!("Failed to create school account: {}", err);
            return Err(err);
        }

        let result = conn.execute(
            "INSERT INTO school_accounts (
                id, school_id, first_name, middle_name, last_name, 
                gender, course, department, position, major, year_level, is_active, last_updated_semester_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id.to_string(), 
                account.school_id, 
                account.first_name, 
                account.middle_name, 
                account.last_name,
                account.gender.as_ref().map(|g| match g {
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
                account.last_updated_semester_id.map(|id| id.to_string())
            ],
        );

        match result {
            Ok(_) => {
                let created_account = SchoolAccount {
                    id,
                    school_id: account.school_id,
                    first_name: account.first_name,
                    middle_name: account.middle_name,
                    last_name: account.last_name,
                    gender: account.gender,
                    course: account.course,
                    department: account.department,
                    position: account.position,
                    major: account.major,
                    year_level: account.year_level,
                    is_active: account.is_active,
                    last_updated_semester_id: account.last_updated_semester_id,
                };

                info!(
                    "Successfully created school account: ID={}, SchoolID={}",
                    created_account.id,
                    created_account.school_id
                );

                Ok(created_account)
            },
            Err(e) => {
                error!("Failed to create school account: {:?}", e);
                Err(e)
            }
        }
    }

    fn get_paginated_school_accounts(
        &self, 
        conn: &Connection, 
        page: u64, 
        page_size: u64,
        semester_id: Option<Uuid>
    ) -> Result<PaginatedSchoolAccounts> {
        // Calculate offset
        let offset = (page.saturating_sub(1)) * page_size;

        // Base query with optional semester filtering
        let base_query = "FROM school_accounts 
            WHERE (?1 IS NULL OR last_updated_semester_id = ?1)";

        // Count total records
        let total_count: u64 = conn.query_row(
            &format!("SELECT COUNT(*) {}", base_query),
            params![semester_id.map(|id| id.to_string())],
            |row| row.get(0)
        )?;

        // Calculate total pages
        let total_pages = (total_count as f64 / page_size as f64).ceil() as u64;

        // Fetch paginated accounts
        let mut stmt = conn.prepare(&format!(
            "SELECT * {} 
            ORDER BY school_id 
            LIMIT ?2 OFFSET ?3", 
            base_query
        ))?;

        let account_iter = stmt.query_map(params![
            semester_id.map(|id| id.to_string()), 
            page_size, 
            offset
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
                last_updated_semester_id: row.get::<_, Option<String>>(12)?.map(|id| Uuid::parse_str(&id).unwrap()),
            })
        })?;

        let mut accounts = Vec::new();
        for account in account_iter {
            accounts.push(account?);
        }

        Ok(PaginatedSchoolAccounts {
            accounts,
            total_count,
            page,
            page_size,
            total_pages,
        })
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
                last_updated_semester_id: row.get::<_, Option<String>>(12)?.map(|id| Uuid::parse_str(&id).unwrap()),
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
                    last_updated_semester_id: row.get::<_, Option<String>>(12)?.map(|id| Uuid::parse_str(&id).unwrap()),
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
                    last_updated_semester_id: row.get::<_, Option<String>>(12)?.map(|id| Uuid::parse_str(&id).unwrap()),
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
                last_updated_semester_id = COALESCE(?11, last_updated_semester_id)
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
                account.last_updated_semester_id.map(|id| id.to_string()),
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
        info!("Fetching all school accounts");
        
        let mut stmt = conn.prepare(
            "SELECT * FROM school_accounts ORDER BY school_id"
        )?;
        
        // Use a helper function to map rows consistently
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
                last_updated_semester_id: row.get::<_, Option<String>>(12)?.map(|id| Uuid::parse_str(&id).unwrap()),
            })
        })?;
    
        let mut accounts = Vec::new();
        for account in account_iter {
            match account {
                Ok(acc) => accounts.push(acc),
                Err(e) => {
                    error!("Error while fetching school account: {:?}", e);
                    return Err(e);
                }
            }
        }
    
        info!("Successfully fetched {} school accounts", accounts.len());
        Ok(accounts)
    }
}

// SQL to create the table with all required columns
pub fn create_school_accounts_table(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS school_accounts (
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
            last_updated_semester_id TEXT,
            CONSTRAINT school_id_unique UNIQUE (school_id),
            CONSTRAINT fk_semester 
                FOREIGN KEY (last_updated_semester_id) 
                REFERENCES semesters(id)
        )",
        [],
    )?;

    Ok(())
}