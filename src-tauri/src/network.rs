// src-tauri/network.rs
use std::time::Duration;
use tauri::Emitter;
use tokio::time::sleep;

#[derive(Clone, serde::Serialize)]
pub struct NetworkStatus {
    is_online: bool,
    last_checked: chrono::DateTime<chrono::Utc>,
}

// Static method for connection checking
pub async fn check_connection() -> bool {
    // Try to connect to a reliable host
    match reqwest::get("https://8.8.8.8").await {
        Ok(_) => true,
        Err(_) => false,
    }
}

// Start network monitoring
pub async fn start_network_monitoring(app: tauri::AppHandle) {
    // Spawn a background task to check connection periodically
    tokio::spawn(async move {
        loop {
            let is_online = check_connection().await;
            let status = NetworkStatus {
                is_online,
                last_checked: chrono::Utc::now(),
            };
            
            // Emit the network status
            app.emit("network-status", status).unwrap();
            
            // Wait for 10 seconds before next check
            sleep(Duration::from_secs(10)).await;
        }
    });
}

// Command to check connection on demand
#[tauri::command]
pub async fn check_network() -> Result<NetworkStatus, String> {
    let is_online = check_connection().await;
    Ok(NetworkStatus {
        is_online,
        last_checked: chrono::Utc::now(),
    })
}