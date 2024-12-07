// src/parallel_csv_processor.rs
use std::fmt;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use crossbeam_channel::{bounded, Sender, Receiver};
use rayon::prelude::*;
use csv::StringRecord;
use rand::{Rng, thread_rng};
use uuid::Uuid;
use crate::db::school_accounts::{CreateSchoolAccountRequest, UpdateSchoolAccountRequest, SqliteSchoolAccountRepository, SchoolAccountRepository};
use crate::csv_commands::ExistingAccountInfo;
use crate::db::csv_transform::CsvTransformer;
use crate::DbState;
use tauri::State;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;


#[derive(Debug)]
enum ProcessingError {
    UniqueViolation(String),
    DatabaseLocked(String),
    ConnectionError(String),
    Other(String),
}

// Implement Display trait for ProcessingError
impl fmt::Display for ProcessingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProcessingError::UniqueViolation(msg) => write!(f, "Unique constraint violation: {}", msg),
            ProcessingError::DatabaseLocked(msg) => write!(f, "Database locked: {}", msg),
            ProcessingError::ConnectionError(msg) => write!(f, "Connection error: {}", msg),
            ProcessingError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}



#[derive(Debug)]
enum WorkItem {
    Create(CreateSchoolAccountRequest),
    Update(Uuid, CreateSchoolAccountRequest),
}


impl From<rusqlite::Error> for ProcessingError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::SqliteFailure(sqlite_err, Some(msg)) => {
                match sqlite_err.code {
                    rusqlite::ErrorCode::ConstraintViolation => {
                        ProcessingError::UniqueViolation(msg.to_string())
                    },
                    rusqlite::ErrorCode::DatabaseBusy | 
                    rusqlite::ErrorCode::DatabaseLocked => {
                        ProcessingError::DatabaseLocked(msg.to_string())
                    },
                    _ => ProcessingError::Other(msg.to_string())
                }
            },
            _ => ProcessingError::Other(err.to_string())
        }
    }
}


#[derive(Debug)]
pub struct ProcessingResult {
    pub successful: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

pub struct ParallelCsvProcessor {
    pool: Arc<Pool<SqliteConnectionManager>>,
    num_workers: usize,
    db_state: Arc<DbState>,
}

trait Retryable {
    fn should_retry(&self) -> bool;
}

// Implement for common error types
impl Retryable for rusqlite::Error {
    fn should_retry(&self) -> bool {
        matches!(
            self,
            rusqlite::Error::SqliteFailure(sqlite_err, _) 
            if matches!(
                sqlite_err.code, 
                rusqlite::ErrorCode::DatabaseBusy | 
                rusqlite::ErrorCode::DatabaseLocked
            )
        )
    }
}

// Retry configuration
#[derive(Clone)]
struct RetryConfig {
    max_attempts: usize,
    initial_delay_ms: u64,
    max_delay_ms: u64,
    exponential_base: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        RetryConfig {
            max_attempts: 5,
            initial_delay_ms: 50,
            max_delay_ms: 1000,
            exponential_base: 2,
        }
    }
}

fn get_connection_with_retry(
    pool: &Arc<Pool<SqliteConnectionManager>>, 
    config: &RetryConfig
) -> Result<PooledConnection<SqliteConnectionManager>, String> {
    let mut attempt = 0;
    loop {
        match pool.get() {
            Ok(conn) => return Ok(conn),
            Err(e) if attempt < config.max_attempts => {
                attempt += 1;
                
                // More aggressive backoff and jitter
                let delay = std::cmp::min(
                    config.initial_delay_ms * (2_u64.pow(attempt as u32)),
                    config.max_delay_ms
                );
                
                let jitter = thread_rng().gen_range(0..=delay);
                let actual_delay = delay + jitter;
                
                eprintln!(
                    "Connection pool retrieval attempt {} failed. Retrying in {} ms. Error: {}", 
                    attempt, 
                    actual_delay,
                    e
                );
                
                std::thread::sleep(Duration::from_millis(actual_delay));
            }
            Err(e) => return Err(format!(
                "Failed to get connection after {} attempts: {}", 
                config.max_attempts, 
                e
            )),
        }
    }
}

// Retry utility function
fn retry_operation<T, E, F>(
    mut operation: F, 
    config: &RetryConfig
) -> Result<T, E>
where 
    F: FnMut() -> Result<T, E>,
    E: Retryable + std::fmt::Debug
{
    let mut attempt = 0;
    loop {
        match operation() {
            Ok(result) => return Ok(result),
            Err(err) if attempt < config.max_attempts && err.should_retry() => {
                attempt += 1;
                
                // Log detailed error information
                eprintln!(
                    "Retry attempt {}/{}: {:?}", 
                    attempt, 
                    config.max_attempts, 
                    err
                );
                
                // More sophisticated backoff with jitter
                let delay = std::cmp::min(
                    config.initial_delay_ms * (config.exponential_base.pow(attempt as u32)),
                    config.max_delay_ms
                );
                
                let jitter = rand::random::<u64>() % (delay / 2);
                std::thread::sleep(Duration::from_millis(delay + jitter));
            }
            Err(err) => {
                eprintln!("Operation failed after {} attempts: {:?}", config.max_attempts, err);
                return Err(err);
            }
        }
    }
}

impl ParallelCsvProcessor {
    fn process_batch(
        &self,
        batch: Vec<StringRecord>,
        headers: &StringRecord,
        existing_accounts: &[ExistingAccountInfo],
        last_updated_semester_id: Option<Uuid>,
    ) -> ProcessingResult {
        // Pre-process batch to separate creates and updates
        let (creates, updates): (Vec<_>, Vec<_>) = batch.into_iter()
            .filter_map(|record| {
                let transformer = CsvTransformer::new(headers, Arc::clone(&self.db_state));
                transformer.transform_record(&record).ok()
            })
            .partition(|request| {
                !existing_accounts.iter().any(|existing| {
                    existing.existing_accounts.iter()
                        .any(|acc| acc.school_id == request.school_id)
                })
            });
    
        let mut successful = 0;
        let mut failed = 0;
        let mut errors = Vec::new();
    
        // Define retry_config here to make it accessible throughout the method
        let retry_config = RetryConfig::default();
    
        // Process creates
        if !creates.is_empty() {
            let mut conn = self.pool.get().expect("Failed to get connection");
            let tx = conn.transaction().expect("Failed to start transaction");
            
            for create_request in creates {
                match self.process_create(&tx, create_request, &retry_config) {
                    Ok(_) => successful += 1,
                    Err(ProcessingError::UniqueViolation(_)) => {/* Ignore */},
                    Err(e) => {
                        failed += 1;
                        errors.push(e.to_string());
                    }
                }
            }
            
            tx.commit().expect("Failed to commit transaction");
        }
    
        // Process updates with account IDs
        if !updates.is_empty() {
            let mut conn = self.pool.get().expect("Failed to get connection");
            let tx = conn.transaction().expect("Failed to start transaction");
            
            for update_request in updates {
                // Find the corresponding existing account ID
                if let Some(existing_account) = existing_accounts.iter()
                    .find(|existing| existing.existing_accounts.iter()
                        .any(|acc| acc.school_id == update_request.school_id))
                    .and_then(|existing| existing.existing_accounts.first()) {
                    
                    match self.process_update(&tx, existing_account.id, update_request, &retry_config) {
                        Ok(_) => successful += 1,
                        Err(e) => {
                            failed += 1;
                            errors.push(e.to_string());
                        }
                    }
                }
            }
            
            tx.commit().expect("Failed to commit transaction");
        }
    
        // Return results
        ProcessingResult {
            successful,
            failed,
            errors,
        }
    }

    fn process_update(
        &self,
        tx: &rusqlite::Transaction,
        account_id: Uuid,  // Changed parameter name to be explicit
        update_request: CreateSchoolAccountRequest,
        retry_config: &RetryConfig,
    ) -> Result<(), ProcessingError> {
        let mut attempt = 0;
        
        // Convert CreateSchoolAccountRequest to UpdateSchoolAccountRequest
        let update_request: UpdateSchoolAccountRequest = update_request.into();
        
        loop {
            match SqliteSchoolAccountRepository.update_school_account(tx, account_id, update_request.clone()) {
                Ok(_) => return Ok(()),
                Err(e) => {
                    let error = ProcessingError::from(e);
                    match error {
                        ProcessingError::UniqueViolation(_) => return Err(error),
                        ProcessingError::DatabaseLocked(_) if attempt < retry_config.max_attempts => {
                            attempt += 1;
                            let delay = std::cmp::min(
                                retry_config.initial_delay_ms * 2_u64.pow(attempt as u32),
                                retry_config.max_delay_ms
                            );
                            thread::sleep(std::time::Duration::from_millis(delay));
                        },
                        _ => return Err(error),
                    }
                }
            }
        }
    }

    fn process_create(
        &self,
        tx: &rusqlite::Transaction,
        create_request: CreateSchoolAccountRequest,
        retry_config: &RetryConfig,
    ) -> Result<(), ProcessingError> {
        let mut attempt = 0;
        
        loop {
            match SqliteSchoolAccountRepository.create_school_account(tx, create_request.clone()) {
                Ok(_) => return Ok(()),
                Err(e) => {
                    let error = ProcessingError::from(e);
                    match error {
                        ProcessingError::UniqueViolation(_) => return Err(error),
                        ProcessingError::DatabaseLocked(_) if attempt < retry_config.max_attempts => {
                            attempt += 1;
                            let delay = std::cmp::min(
                                retry_config.initial_delay_ms * 2_u64.pow(attempt as u32),
                                retry_config.max_delay_ms
                            );
                            thread::sleep(std::time::Duration::from_millis(delay));
                        },
                        _ => return Err(error),
                    }
                }
            }
        }
    }

    pub fn new(pool: &Arc<Pool<SqliteConnectionManager>>, num_workers: Option<usize>, db_state: &State<DbState>) -> Self {
        let num_workers = num_workers.unwrap_or_else(|| {
            thread::available_parallelism()
                .map(|n| n.get())
                .unwrap_or(4)
        });
        
        ParallelCsvProcessor {
            pool: Arc::clone(pool),
            num_workers,
            db_state: Arc::new(db_state.inner().to_owned()),
        }
    }

    fn spawn_workers(
        &self,
        work_receiver: Receiver<WorkItem>,
        result_sender: Sender<(usize, usize, Vec<String>)>,
    ) -> Vec<thread::JoinHandle<()>> {
        let pool = Arc::clone(&self.pool);
        let retry_config = RetryConfig::default();
        
        (0..self.num_workers)
            .map(|_| {
                let work_receiver = work_receiver.clone();
                let result_sender = result_sender.clone();
                let pool = Arc::clone(&pool);
                let retry_config = retry_config.clone();
        
                thread::spawn(move || {
                    let mut successful = 0;
                    let mut failed = 0;
                    let mut errors = Vec::new();
        
                    let repo = SqliteSchoolAccountRepository;
                    
                    // Use the new connection retrieval method with more robust error handling
                    let mut connection = match get_connection_with_retry(&pool, &retry_config) {
                        Ok(conn) => conn,
                        Err(e) => {
                            errors.push(format!("Connection retrieval failed: {}", e));
                            let _ = result_sender.send((0, 1, errors));
                            return;
                        }
                    };
        
                    // Use savepoint for more granular transaction management
                    let mut tx = match connection.savepoint() {
                        Ok(tx) => tx,
                        Err(e) => {
                            errors.push(format!("Failed to create savepoint: {}", e));
                            let _ = result_sender.send((0, 1, errors));
                            return;
                        }
                    };
        
                    while let Ok(work_item) = work_receiver.recv() {
                        match work_item {
                            WorkItem::Create(create_request) => {
                                match retry_operation(
                                    || {
                                        // Use a nested savepoint for each operation
                                        let mut nested_tx = tx.savepoint()?;
                                        let result = repo.create_school_account(&nested_tx, create_request.clone());
                                        nested_tx.commit()?;
                                        result
                                    }, 
                                    &retry_config
                                ) {
                                    Ok(_) => successful += 1,
                                    Err(e) => {
                                        if !e.to_string().contains("UNIQUE constraint failed") {
                                            failed += 1;
                                            errors.push(format!(
                                                "Failed to create account for {}: {}", 
                                                create_request.school_id, 
                                                e
                                            ));
                                        }
                                    }
                                }
                            }
                            WorkItem::Update(id, update_request) => {
                                let update_request_converted: UpdateSchoolAccountRequest = update_request.clone().into();
                                match retry_operation(
                                    || {
                                        // Use a nested savepoint for each operation
                                        let mut nested_tx = tx.savepoint()?;
                                        let result = repo.update_school_account(&nested_tx, id, update_request_converted.clone());
                                        nested_tx.commit()?;
                                        result
                                    }, 
                                    &retry_config
                                ) {
                                    Ok(_) => successful += 1,
                                    Err(e) => {
                                        if !e.to_string().contains("UNIQUE constraint failed") {
                                            failed += 1;
                                            errors.push(format!(
                                                "Failed to update account {}: {}", 
                                                id, 
                                                e
                                            ));
                                        }
                                    }
                                }
                            }
                        }
                    }
        
                    // Commit the main transaction
                    match tx.commit() {
                        Ok(_) => {},
                        Err(e) => {
                            errors.push(format!("Failed to commit transaction: {}", e));
                        }
                    }
        
                    // Send results back
                    let _ = result_sender.send((successful, failed, errors));
                })
            })
            .collect()
    }
}

pub fn process_csv_with_progress<F>(
    processor: &ParallelCsvProcessor,
    records: Vec<StringRecord>,
    headers: StringRecord,
    existing_accounts: Vec<ExistingAccountInfo>,
    progress_callback: F,
    last_updated_semester_id: Option<Uuid>,
    db_state: &State<DbState>
) -> Result<ProcessingResult, String>  // Change return type to Result
where
    F: Fn(f32) + Send + 'static
{
    let total_records = records.len();
    let chunk_size = 500;  // Reduced chunk size for better granularity
    let mut overall_result = ProcessingResult {
        successful: 0,
        failed: 0,
        errors: Vec::new(),
    };

    let max_retries = 3;
    for retry in 0..max_retries {
        let mut current_records = records.clone();
        let mut retry_result = ProcessingResult {
            successful: 0,
            failed: 0,
            errors: Vec::new(),
        };

        for (i, chunk) in current_records.chunks_mut(chunk_size).enumerate() {
            match processor.process_batch(
                chunk.to_vec(),
                &headers,
                &existing_accounts,
                last_updated_semester_id
            ) {
                result => {
                    retry_result.successful += result.successful;
                    retry_result.failed += result.failed;
                    retry_result.errors.extend(result.errors);

                    let progress = ((i + 1) * chunk_size).min(total_records) as f32 / total_records as f32;
                    progress_callback(progress);
                }
            }
        }

        // If successful or no retriable errors, return
        if retry_result.successful > 0 || retry_result.errors.is_empty() {
            overall_result = retry_result;
            break;
        }

        // If last retry, return the result
        if retry == max_retries - 1 {
            return Err(format!(
                "Failed to process CSV after {} retries. Errors: {:?}", 
                max_retries, 
                retry_result.errors
            ));
        }

        // Wait before retrying
        std::thread::sleep(std::time::Duration::from_secs(1 * (retry as u64 + 1)));
    }

    Ok(overall_result)
}