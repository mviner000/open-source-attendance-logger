// src/storage.rs
use std::path::PathBuf;
use directories::ProjectDirs;
use log::{info, warn};
use std::fs;

const QUALIFIER: &str = "com";
const ORGANIZATION: &str = "yourorg";
const APP_NAME: &str = "nameOftheApp";

pub struct AppStorage {
    data_dir: PathBuf,
    config_dir: PathBuf,
}

impl AppStorage {
    pub fn new() -> Option<Self> {
        let project_dirs = ProjectDirs::from(QUALIFIER, ORGANIZATION, APP_NAME)?;
        
        let data_dir = project_dirs.data_dir().to_path_buf();
        let config_dir = project_dirs.config_dir().to_path_buf();
        
        Some(Self {
            data_dir,
            config_dir,
        })
    }

    pub fn initialize(&self) -> std::io::Result<()> {
        info!("Initializing application directories...");
        fs::create_dir_all(&self.data_dir)?;
        fs::create_dir_all(&self.config_dir)?;
        Ok(())
    }

    pub fn get_database_dir(&self) -> PathBuf {
        self.data_dir.clone()
    }

    pub fn get_database_path(&self, db_name: &str) -> PathBuf {
        self.data_dir.join(format!("{}.db", db_name))
    }

    pub fn get_database_name_file_path(&self) -> PathBuf {
        self.config_dir.join("database_name.txt")
    }
}
