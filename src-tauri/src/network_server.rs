// src/network_server.rs

use axum::{
    routing::post,
    Router,
    extract::State,
    Json,
};
use tokio::net::TcpListener;
use std::sync::Arc;
use rusqlite::{Connection, Result as SqliteResult};
use crate::db::Database;
use crate::DbState;
use crate::db::attendance::{CreateAttendanceRequest, Attendance, AttendanceRepository};
use futures::StreamExt;
use tokio_tungstenite::tungstenite::Message;

// Create a thread-safe database access struct
#[derive(Clone)]
struct DatabaseAccessor {
    db_path: std::path::PathBuf,
    attendance_repository: Arc<dyn AttendanceRepository + Send + Sync>,
}

impl DatabaseAccessor {
    fn new(db: &Database) -> Self {
        Self {
            db_path: db.get_db_path().clone(),
            attendance_repository: Arc::clone(&db.attendance_repository),
        }
    }

    async fn create_attendance(&self, attendance: CreateAttendanceRequest) -> rusqlite::Result<Attendance> {
        // Use tokio's blocking task to run database operation
        let db_path = self.db_path.clone();
        let attendance_repo = Arc::clone(&self.attendance_repository);

        tokio::task::spawn_blocking(move || {
            let conn = rusqlite::Connection::open(db_path)?;
            attendance_repo.create_attendance(&conn, attendance)
        })
        .await
        .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?
    }
}

pub async fn start_network_server(db: Database) -> Result<(), Box<dyn std::error::Error>> {
    // Configure CORS
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    // Create a thread-safe database accessor
    let db_accessor = DatabaseAccessor::new(&db);

    // Create Axum router
    let app = Router::new()
        .route("/attendance", post(create_attendance_handler))
        // Add more routes here as needed
        .layer(cors)
        .with_state(db_accessor);

    // Bind to all network interfaces
    let listener = TcpListener::bind("0.0.0.0:8080").await
        .map_err(|e| -> Box<dyn std::error::Error> {
            format!("Failed to bind TCP listener: {}", e).into()
        })?;

    println!("Network server started on 0.0.0.0:8080");

    // Serve the application
    axum::serve(listener, app)
        .await
        .map_err(|e| -> Box<dyn std::error::Error> {
            format!("Server error: {}", e).into()
        })
}

async fn create_attendance_handler(
    State(db): State<DatabaseAccessor>,
    Json(attendance): Json<CreateAttendanceRequest>
) -> Result<Json<Attendance>, (axum::http::StatusCode, String)> {
    match db.create_attendance(attendance).await {
        Ok(created_attendance) => Ok(Json(created_attendance)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string()
        ))
    }
}

// WebSocket handler for real-time updates (optional)
async fn handle_websocket(stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>) {
    let (mut write, mut read) = stream.split();
    while let Some(message) = read.next().await {
        match message {
            Ok(msg) => {
                // Handle incoming WebSocket messages
                match msg {
                    Message::Text(text) => {
                        // Process text messages
                        println!("Received: {}", text);
                    }
                    _ => {}
                }
            }
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
        }
    }
}