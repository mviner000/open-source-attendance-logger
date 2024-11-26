// src/storage.rs

use std::path::PathBuf;
use directories::{ProjectDirs, UserDirs};
use log::{info, warn};
use std::fs;

const QUALIFIER: &str = "com";
const ORGANIZATION: &str = "yourorg";
const APP_NAME: &str = "nameOftheApp";

pub struct AppStorage {
    safe_storage: PathBuf,    // For database in roaming directory
    public_storage: PathBuf,  // For config.xml in Documents
}

impl AppStorage {
    pub fn new() -> Option<Self> {
        let project_dirs = ProjectDirs::from(QUALIFIER, ORGANIZATION, APP_NAME)?;
        let safe_storage = project_dirs.config_dir().to_path_buf();
        
        let public_storage = UserDirs::new()
            .and_then(|dirs| dirs.document_dir().map(|d| d.join(APP_NAME)))?;

        Some(Self {
            safe_storage,
            public_storage,
        })
    }

    pub fn initialize(&self) -> std::io::Result<()> {
        info!("Initializing application directories...");
        fs::create_dir_all(&self.safe_storage)?;
        fs::create_dir_all(&self.public_storage)?;
        Ok(())
    }

    pub fn get_database_dir(&self) -> PathBuf {
        self.safe_storage.clone()
    }

    pub fn get_database_path(&self, db_name: &str) -> PathBuf {
        self.safe_storage.join(format!("{}.db", db_name))
    }

    pub fn get_database_name_file_path(&self) -> PathBuf {
        self.safe_storage.join("database_name.txt")
    }

    pub fn get_config_file_path(&self) -> PathBuf {
        self.public_storage.join("config.xml")
    }

    pub fn get_public_storage(&self) -> PathBuf {
        self.public_storage.clone()
    }
}