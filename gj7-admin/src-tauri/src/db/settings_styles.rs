// src/db/settings_styles.rs

use chrono::{DateTime, Utc};
use log::info;
use rusqlite::{Connection, Result as SqliteResult, params, Row};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettingsStyle {
    pub id: Option<i64>,
    pub component_name: String,
    pub tailwind_classes: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettingsStyleRequest {
    pub component_name: String,
    pub tailwind_classes: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettingsStyleRequest {
    pub component_name: Option<String>,
    pub tailwind_classes: Option<String>,
}

#[derive(Clone)]
pub struct SettingsStylesDatabase;

impl SettingsStylesDatabase {
    pub fn init(conn: &Connection) -> SqliteResult<Self> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings_styles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                component_name TEXT NOT NULL,
                tailwind_classes TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_settings_styles_by_component_name ON settings_styles (component_name)",
            [],
        )?;

        Ok(SettingsStylesDatabase)
    }

    fn datetime_to_timestamp(dt: &DateTime<Utc>) -> i64 {
        dt.timestamp()
    }

    fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
        DateTime::from_timestamp_millis(timestamp * 1000)
            .expect("Invalid timestamp")
    }

    fn row_to_settings_style(row: &Row) -> SqliteResult<SettingsStyle> {
        Ok(SettingsStyle {
            id: Some(row.get(0)?),
            component_name: row.get(1)?,
            tailwind_classes: row.get(2)?,
            created_at: Self::timestamp_to_datetime(row.get(3)?),
            updated_at: Self::timestamp_to_datetime(row.get(4)?),
        })
    }

    pub fn get_settings_style_by_component_name(&self, conn: &Connection, component_name: &str) -> Result<SettingsStyle, String> {
        info!("Fetching settings style for component: {}", component_name);
        let mut stmt = conn.prepare(
            "SELECT id, component_name, tailwind_classes, created_at, updated_at 
             FROM settings_styles 
             WHERE component_name = ?"
        ).map_err(|e| e.to_string())?;

        let settings_style = stmt.query_row(
            params![component_name], 
            Self::row_to_settings_style
        ).map_err(|e| e.to_string())?;

        info!("Successfully fetched settings style for component: {}", component_name);
        Ok(settings_style)
    }

    pub fn get_settings_style(&self, conn: &Connection, id: i64) -> Result<SettingsStyle, String> {
        info!("Fetching settings style with id: {}", id);
        let mut stmt = conn.prepare(
            "SELECT id, component_name, tailwind_classes, created_at, updated_at FROM settings_styles WHERE id = ?"
        ).map_err(|e| e.to_string())?;

        let settings_style = stmt.query_row(params![id], Self::row_to_settings_style)
            .map_err(|e| e.to_string())?;

        info!("Successfully fetched settings style with id: {}", id);
        Ok(settings_style)
    }

    pub fn create_settings_style(&self, conn: &Connection, settings_style: CreateSettingsStyleRequest) -> Result<SettingsStyle, String> {
        info!("Creating new settings style for component: {}", settings_style.component_name);
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        
        let mut stmt = conn.prepare(
            "INSERT INTO settings_styles (component_name, tailwind_classes, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4) 
             RETURNING id, component_name, tailwind_classes, created_at, updated_at"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(
            params![settings_style.component_name, settings_style.tailwind_classes, timestamp, timestamp],
            Self::row_to_settings_style
        ).map_err(|e| e.to_string())?;
        
        info!("Successfully created settings style with id: {:?}", result.id);
        Ok(result)
    }

    pub fn get_all_settings_styles(&self, conn: &Connection) -> Result<Vec<SettingsStyle>, String> {
        info!("Fetching all settings styles");
        let mut stmt = conn.prepare(
            "SELECT id, component_name, tailwind_classes, created_at, updated_at FROM settings_styles ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let settings_styles = stmt.query_map(
            [],
            Self::row_to_settings_style
        ).map_err(|e| e.to_string())?;

        let results = settings_styles.collect::<SqliteResult<Vec<SettingsStyle>>>()
            .map_err(|e| e.to_string())?;
        
        info!("Successfully fetched {} settings styles", results.len());
        Ok(results)
    }

    pub fn update_settings_style(&self, conn: &Connection, id: i64, settings_style: UpdateSettingsStyleRequest) -> Result<SettingsStyle, String> {
        info!("Updating settings style with id: {}", id);
        let existing = self.get_settings_style(conn, id)?;
        
        let now = Utc::now();
        let timestamp = Self::datetime_to_timestamp(&now);
        let component_name = settings_style.component_name.unwrap_or(existing.component_name);
        let tailwind_classes = settings_style.tailwind_classes.unwrap_or(existing.tailwind_classes);

        let mut stmt = conn.prepare(
            "UPDATE settings_styles 
             SET component_name = ?1, tailwind_classes = ?2, updated_at = ?3 
             WHERE id = ?4
             RETURNING id, component_name, tailwind_classes, created_at, updated_at"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(
            params![component_name, tailwind_classes, timestamp, id],
            Self::row_to_settings_style
        ).map_err(|e| e.to_string())?;

        info!("Successfully updated settings style with id: {}", id);
        Ok(result)
    }

    pub fn search_settings_styles(&self, conn: &Connection, query: &str) -> Result<Vec<SettingsStyle>, String> {
        info!("Searching settings styles with query: {}", query);
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = conn.prepare(
            "SELECT id, component_name, tailwind_classes, created_at, updated_at 
             FROM settings_styles 
             WHERE component_name LIKE ?1 OR tailwind_classes LIKE ?1 
             ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let settings_styles = stmt.query_map(
            params![search_pattern],
            Self::row_to_settings_style
        ).map_err(|e| e.to_string())?;

        let results = settings_styles.collect::<SqliteResult<Vec<SettingsStyle>>>()
            .map_err(|e| e.to_string())?;
        
        info!("Search complete. Found {} matching settings styles", results.len());
        Ok(results)
    }

    pub fn delete_settings_style(&self, conn: &Connection, id: i64) -> Result<(), String> {
        info!("Deleting settings style with id: {}", id);
        conn.execute("DELETE FROM settings_styles WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;

        info!("Successfully deleted settings style with id: {}", id);
        Ok(())
    }
}