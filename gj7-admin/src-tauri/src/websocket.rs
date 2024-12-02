// src/websocket.rs

use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::{mpsc, Mutex};
use std::{collections::HashMap, sync::Arc, path::PathBuf};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use rusqlite::Connection;

use crate::db::attendance::{
    Attendance,
    CreateAttendanceRequest,
    SqliteAttendanceRepository,
    AttendanceRepository
};

#[derive(Clone)]
pub struct DatabaseAccessor {
    pub db_path: PathBuf,
}

impl DatabaseAccessor {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    pub fn get_connection(&self) -> Result<Connection, rusqlite::Error> {
        Connection::open(&self.db_path)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WebSocketError {
    DatabaseError(String),
    SerializationError(String),
    InvalidMessageFormat(String),
}

#[derive(Clone)]
pub struct WebSocketState {
    pub sender_tx: mpsc::Sender<(String, AttendanceEvent)>,
    pub connections: Arc<Mutex<HashMap<String, mpsc::Sender<AttendanceEvent>>>>,
    pub recent_attendances: Arc<Mutex<Vec<Attendance>>>,
}

#[derive(Clone)]
pub struct AppState {
    pub ws_state: WebSocketState,
    pub db_accessor: DatabaseAccessor,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AttendanceEvent {
    NewAttendance(CreateAttendanceRequest),
    AttendanceList(Vec<Attendance>),
    Error(WebSocketError),
}

impl WebSocketState {
    pub fn new(db_accessor: &DatabaseAccessor) -> Self {
        let (sender_tx, mut receiver) = mpsc::channel::<(String, AttendanceEvent)>(100);
        let connections = Arc::new(Mutex::new(HashMap::<String, mpsc::Sender<AttendanceEvent>>::new()));
        
        // Fetch initial recent attendances from database
        let recent_attendances = Arc::new(Mutex::new(
            get_last_n_attendances(db_accessor, 100).unwrap_or_default()
        ));

        let connections_clone = connections.clone();
        let recent_attendances_clone = recent_attendances.clone();

        tokio::spawn(async move {
            while let Some((exclude_client, event)) = receiver.recv().await {
                let connections = connections_clone.lock().await;
                for (client_id, client_tx) in connections.iter() {
                    if *client_id != exclude_client {
                        let _ = client_tx.send(event.clone()).await;
                    }
                }
            }
        });

        WebSocketState {
            sender_tx,
            connections,
            recent_attendances: recent_attendances_clone,
        }
    }
}

// Helper function to get last N attendances from database
fn get_last_n_attendances(
    db_accessor: &DatabaseAccessor, 
    n: usize
) -> Result<Vec<Attendance>, WebSocketError> {
    let conn = db_accessor.get_connection()
        .map_err(|e| WebSocketError::DatabaseError(e.to_string()))?;
    
    let repo = SqliteAttendanceRepository;
    repo.get_last_n_attendances(&conn, n)
        .map_err(|e| WebSocketError::DatabaseError(e.to_string()))
}

async fn create_attendance(
    db_accessor: DatabaseAccessor,
    attendance_req: CreateAttendanceRequest,
) -> Result<Attendance, WebSocketError> {
    let result = tokio::task::spawn_blocking(move || {
        let conn = db_accessor.get_connection()
            .map_err(|e| WebSocketError::DatabaseError(e.to_string()))?;
        
        let repo = SqliteAttendanceRepository;
        repo.create_attendance(&conn, attendance_req.clone())
            .map_err(|e| WebSocketError::DatabaseError(e.to_string()))
    })
    .await
    .map_err(|e| WebSocketError::DatabaseError(e.to_string()))?;
    
    result
}

#[axum::debug_handler]
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let client_id = uuid::Uuid::new_v4().to_string();
    let (client_tx, mut client_rx) = mpsc::channel(100);
    
    {
        let mut connections = state.ws_state.connections.lock().await;
        connections.insert(client_id.clone(), client_tx);
    }
    
    // Send recent attendances immediately on connection
    {
        let recent_attendances = state.ws_state.recent_attendances.lock().await;
        if !recent_attendances.is_empty() {
            let msg = json!({ "AttendanceList": *recent_attendances });
            let _ = sender.send(axum::extract::ws::Message::Text(msg.to_string())).await;
        }
    }
    
    let sender_task = {
        let client_id_clone = client_id.clone();
        tokio::spawn(async move {
            while let Some(event) = client_rx.recv().await {
                match event {
                    AttendanceEvent::NewAttendance(attendance) => {
                        let msg = json!({ "NewAttendance": attendance });
                        let _ = sender.send(axum::extract::ws::Message::Text(msg.to_string())).await;
                    },
                    AttendanceEvent::AttendanceList(attendances) => {
                        let msg = json!({ "AttendanceList": attendances });
                        let _ = sender.send(axum::extract::ws::Message::Text(msg.to_string())).await;
                    },
                    AttendanceEvent::Error(error) => {
                        let msg = json!({ "Error": error });
                        let _ = sender.send(axum::extract::ws::Message::Text(msg.to_string())).await;
                    }
                }
            }
        })
    };

    let receiver_task = {
        let client_id_clone = client_id.clone();
        let ws_state = state.ws_state.clone();
        let db_accessor = state.db_accessor.clone();
        
        tokio::spawn(async move {
            while let Some(Ok(message)) = receiver.next().await {
                match message {
                    axum::extract::ws::Message::Text(text) => {
                        match serde_json::from_str::<serde_json::Value>(&text) {
                            Ok(value) => {
                                let msg_type = value.get("type").and_then(|v| v.as_str());
                                let data = value.get("data");

                                match (msg_type, data) {
                                    (Some("NewAttendance"), Some(data)) => {
                                        if let Ok(attendance_req) = serde_json::from_value::<CreateAttendanceRequest>(data.clone()) {
                                            match create_attendance(db_accessor.clone(), attendance_req.clone()).await {
                                                Ok(created_attendance) => {
                                                    // Update recent attendances
                                                    {
                                                        let mut recent_attendances = ws_state.recent_attendances.lock().await;
                                                        recent_attendances.insert(0, created_attendance);
                                                        if recent_attendances.len() > 100 {
                                                            recent_attendances.pop();
                                                        }
                                                    }

                                                    let _ = ws_state.sender_tx.send((
                                                        client_id_clone.clone(),
                                                        AttendanceEvent::NewAttendance(attendance_req)
                                                    )).await;
                                                },
                                                Err(e) => {
                                                    let _ = ws_state.sender_tx.send((
                                                        client_id_clone.clone(),
                                                        AttendanceEvent::Error(e)
                                                    )).await;
                                                }
                                            }
                                        }
                                    },
                                    _ => {}
                                }
                            },
                            Err(_) => {}
                        }
                    },
                    axum::extract::ws::Message::Close(_) => break,
                    _ => {}
                }
            }
        })
    };

    tokio::select! {
        _ = sender_task => {},
        _ = receiver_task => {},
    }

    let mut connections = state.ws_state.connections.lock().await;
    connections.remove(&client_id);
}

pub fn create_websocket_routes(db_path: PathBuf) -> Router {
    let db_accessor = DatabaseAccessor::new(db_path);
    let ws_state = WebSocketState::new(&db_accessor);
    
    let app_state = AppState {
        ws_state,
        db_accessor: db_accessor.clone(),
    };
    
    Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(app_state)
}