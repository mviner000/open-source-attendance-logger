// src/school_account_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::school_accounts::{PaginatedSchoolAccounts, SchoolAccount, UpdateSchoolAccountRequest};
use crate::db::semester::{Semester,};
use rusqlite::Result;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

// Optional: Create a new struct that includes semester data
#[derive(Serialize)]
pub struct SchoolAccountWithSemester {
    #[serde(flatten)]
    account: SchoolAccount,
    last_updated_semester: Option<Semester>,
}

#[derive(Deserialize)]
pub struct PaginationRequest {
    page: Option<u64>,
    page_size: Option<u64>,
    semester_id: Option<String>,
}

#[tauri::command]
pub async fn get_all_school_accounts(
    state: State<'_, DbState>
) -> Result<Vec<SchoolAccount>, String> {
    let db_state = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        db_state.with_connection_blocking(|conn| {
            // Use Arc's deref method to access the repository methods
            db_state.school_accounts.get_all_school_accounts(conn)
        })
        .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_paginated_school_accounts(
    state: State<'_, DbState>,
    request: PaginationRequest
) -> Result<PaginatedSchoolAccounts, String> {
    // Set default values if not provided
    let page = request.page.unwrap_or(1);
    let page_size = request.page_size.unwrap_or(30);
    
    // Convert semester_id to Uuid outside of the blocking closure
    let semester_uuid = match &request.semester_id {
        Some(id) => Uuid::parse_str(id).map_err(|e| e.to_string())?,
        None => Uuid::nil(), // Use a nil UUID if no semester is specified
    };

    let db_state = state.0.clone();
    
    // Use std::thread::spawn instead of tauri's async_runtime
    let result = std::thread::spawn(move || {
        let conn = db_state.get_connection_blocking();
        
        // Log the parameters being used
        log::info!(
            "Fetching paginated school accounts: page={}, page_size={}, semester_id={}", 
            page, 
            page_size, 
            semester_uuid
        );
        
        let paginated_result = db_state.school_accounts.get_paginated_school_accounts(
            &conn, 
            page, 
            page_size,
            Some(semester_uuid)
        );

        // Log the result of the pagination
        match &paginated_result {
            Ok(accounts) => {
                log::info!(
                    "Pagination result: total_count={}, page={}, page_size={}, total_pages={}, accounts_fetched={}",
                    accounts.total_count,
                    accounts.page,
                    accounts.page_size,
                    accounts.total_pages,
                    accounts.accounts.len()
                );

                // Log details of each account
                for (index, account) in accounts.accounts.iter().enumerate() {
                    log::info!(
                        "Account #{}: id={}, school_id={}, name={} {}, is_active={}",
                        index + 1,
                        account.id,
                        account.school_id,
                        account.first_name.clone().unwrap_or_default(),
                        account.last_name.clone().unwrap_or_default(),
                        account.is_active
                    );
                }
            },
            Err(e) => {
                log::error!("Error fetching paginated school accounts: {:?}", e);
            }
        }

        paginated_result.map_err(|e| e.to_string())
    }).join().map_err(|e| format!("Thread error: {:?}", e))?;

    result
}


#[tauri::command]
pub async fn get_school_account_with_semester(
    state: State<'_, DbState>,
    id: String,
) -> Result<SchoolAccountWithSemester, String> {
    let db_state = state.0.clone(); // Use clone if available
    
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db_state.get_connection_blocking();
        
        // Get the school account
        let account = db_state.school_accounts.get_school_account(&conn, 
            Uuid::parse_str(&id).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        
        // Get the related semester if it exists
        let semester = match account.last_updated_semester_id {
            Some(semester_id) => {
                db_state.semester_repository.get_semester(&conn, semester_id)
                    .ok()
            },
            None => None
        };

        Ok(SchoolAccountWithSemester {
            account,
            last_updated_semester: semester,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}


#[tauri::command]
pub async fn update_school_account_semester(
    state: State<'_, DbState>,
    id: String,
    semester_id: String,
) -> Result<SchoolAccount, String> {
    let db_state = state.0.clone(); // Use clone if available
    
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db_state.get_connection_blocking();
        
        let account_id = Uuid::parse_str(&id)
            .map_err(|e| e.to_string())?;
        let semester_uuid = Uuid::parse_str(&semester_id)
            .map_err(|e| e.to_string())?;

        // Validate semester exists
        db_state.semester_repository.get_semester(&conn, semester_uuid)
            .map_err(|e| format!("Semester validation error: {}", e))?;

        let update = UpdateSchoolAccountRequest {
            last_updated_semester_id: Some(semester_uuid),
            ..Default::default()
        };

        db_state.school_accounts.update_school_account(&conn, account_id, update)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}