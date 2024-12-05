// src/logger.rs

use tauri::Emitter;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LogMessage {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub target: String,
}

pub fn emit_log(app_handle: &tauri::AppHandle, log: LogMessage) {
    app_handle.emit("log-message", log).unwrap();
}