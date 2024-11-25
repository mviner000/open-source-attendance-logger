// src/db/school_accounts.rs

use uuid::Uuid;
use rusqlite::{params, Connection, Result};
use serde::{Serialize, Deserialize};

// Enum for gender choices
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Gender {
    Male,
    Female,
    Other,
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
}

// Update Request Struct
#[derive(Debug, Deserialize)]
pub struct UpdateSchoolAccountRequest {
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<Gender>,
    pub course: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub major: Option<String>,
    pub year_level: Option<String>,
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
}

pub struct SqliteSchoolAccountRepository;

// Implement the repository for a specific database type (e.g., SQLite)
impl SchoolAccountRepository for SqliteSchoolAccountRepository {
    fn create_school_account(&self, conn: &Connection, account: CreateSchoolAccountRequest) -> Result<SchoolAccount> {
        let id = Uuid::new_v4();
        
        conn.execute(
            "INSERT INTO school_accounts (
                id, school_id, first_name, middle_name, last_name, 
                gender, course, department, position, major, year_level
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id.to_string(), 
                account.school_id, 
                account.first_name, 
                account.middle_name, 
                account.last_name,
                account.gender.as_ref().map(|g| g.clone() as i32), // Clone the Gender
                account.course, 
                account.department, 
                account.position, 
                account.major, 
                account.year_level
            ],
        )?;
    
        Ok(SchoolAccount {
            id,
            school_id: account.school_id,
            first_name: account.first_name,
            middle_name: account.middle_name,
            last_name: account.last_name,
            gender: account.gender.clone(), // Clone the entire Option
            course: account.course,
            department: account.department,
            position: account.position,
            major: account.major,
            year_level: account.year_level,
        })
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
                year_level = COALESCE(?9, year_level) 
            WHERE id = ?10",
            params![
                account.first_name, 
                account.middle_name, 
                account.last_name,
                account.gender.map(|g| g as i32), 
                account.course, 
                account.department, 
                account.position, 
                account.major, 
                account.year_level,
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
            })
        })?;

        let mut accounts = Vec::new();
        for account in account_iter {
            accounts.push(account?);
        }

        Ok(accounts)
    }
}

// SQL to create the table (for reference)
pub fn create_school_accounts_table(conn: &Connection) -> Result<()> {
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
            year_level TEXT
        )",
        [],
    )?;
    Ok(())
}