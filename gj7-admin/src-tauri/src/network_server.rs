use axum::{
    routing::{get, post},
    Router,
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use rusqlite::{Connection, params};
use tokio::net::TcpListener;
use std::sync::Arc;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use tower_http::cors::CorsLayer;
use crate::Database;

// Existing structs
#[derive(Debug, Serialize, Deserialize)]
pub struct SchoolIdLookupResponse {
    pub school_id: String,
    pub full_name: String,
    pub purposes: HashMap<String, PurposeLookup>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurposeLookup {
    pub label: String,
    pub icon_name: String,
}

// DatabaseAccessor struct
#[derive(Clone)]
struct DatabaseAccessor {
    db_path: std::path::PathBuf,
}

impl DatabaseAccessor {
    fn new(db: &Database) -> Self {
        Self {
            db_path: db.get_db_path().clone(),
        }
    }
}

// Original handler logic
async fn school_id_lookup_handler(
    State(db_accessor): State<DatabaseAccessor>,
    Path(school_id): Path<String>
) -> Result<Json<SchoolIdLookupResponse>, (StatusCode, String)> {
    // Wrap the entire handler logic in a blocking task
    let result = tokio::task::spawn_blocking(move || {
        // Open database connection
        let conn = match Connection::open(&db_accessor.db_path) {
            Ok(conn) => conn,
            Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        };

        // Look up full name
        let full_name = match conn.query_row(
            "SELECT 
                COALESCE(
                    CASE 
                        WHEN first_name IS NOT NULL AND middle_name IS NOT NULL AND last_name IS NOT NULL THEN 
                            first_name || ' ' || middle_name || ' ' || last_name
                        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 
                            first_name || ' ' || last_name
                        ELSE first_name
                    END, 
                    school_id
                ) as full_name
            FROM school_accounts 
            WHERE school_id = ?1",
            params![school_id],
            |row| row.get::<_, String>(0)
        ) {
            Ok(name) => name,
            Err(_) => return Err((StatusCode::NOT_FOUND, "School ID not found".to_string())),
        };

        // Prepare purposes statement
        let mut purposes_stmt = match conn.prepare(
            "SELECT label, icon_name FROM purposes WHERE is_deleted = FALSE"
        ) {
            Ok(stmt) => stmt,
            Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        };

        // Fetch purposes
        let purposes_iter = match purposes_stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                PurposeLookup {
                    label: row.get(0)?,
                    icon_name: row.get(1)?,
                }
            ))
        }) {
            Ok(iter) => iter,
            Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        };

        // Convert purposes to HashMap
        let mut purposes = HashMap::new();
        for purpose in purposes_iter {
            match purpose {
                Ok((key, value)) => {
                    purposes.insert(key, value);
                },
                Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
            }
        }

        // Construct and return the response
        Ok(SchoolIdLookupResponse {
            school_id,
            full_name,
            purposes,
        })
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Convert the result to Json
    result.map(Json)
}

// Wrapper function that explicitly handles the conversion
async fn wrapped_school_id_lookup_handler(
    state: State<DatabaseAccessor>, 
    path: Path<String>
) -> Result<Json<SchoolIdLookupResponse>, (StatusCode, String)> {
    school_id_lookup_handler(state, path).await
}

// Network server setup
pub async fn start_network_server(db: Database) -> Result<(), Box<dyn std::error::Error>> {
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    // Create a thread-safe database accessor
    let db_accessor = DatabaseAccessor::new(&db);

    // Create Axum router
    let app = Router::new()
        .route("/school_id/:school_id", get(wrapped_school_id_lookup_handler))
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