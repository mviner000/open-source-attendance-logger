// src/school_account_commands.rs

use tauri::State;
use crate::DbState;
use crate::db::school_accounts::{SchoolAccount};
use rusqlite::Result;

#[tauri::command]
pub async fn get_all_school_accounts(
    state: State<'_, DbState>
) -> Result<Vec<SchoolAccount>, String> {
    let conn = state.0.get_connection().read();
    state.0.school_accounts.get_all_school_accounts(&conn)
        .map_err(|e| e.to_string())
}