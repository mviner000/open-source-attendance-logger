// src/parallel_csv_processor.rs
use std::fmt;
use std::sync::Arc;
use std::thread;
use anyhow::Result;
use std::time::Duration;
use crossbeam_channel::{Sender, Receiver, RecvTimeoutError};
use csv::StringRecord;
use rand::Rng;
use uuid::Uuid;
use crate::db::school_accounts::{CreateSchoolAccountRequest, UpdateSchoolAccountRequest, SqliteSchoolAccountRepository, SchoolAccountRepository};
use crate::csv_commands::ExistingAccountInfo;
use crate::db::csv_transform::CsvTransformer;
use crate::DbState;
use tauri::State;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
impl std::error::Error for ProcessingError {}

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

impl Default for ProcessingResult {
    fn default() -> Self {
        ProcessingResult {
            successful: 0,
            failed: 0,
            errors: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
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
    max_attempts: usize,           // Increased to maximum
    initial_delay_ms: u64,          // Minimum initial delay
    max_delay_ms: u64,              // Maximum delay between retries
    exponential_base: u64,          // Exponential backoff multiplier
    jitter_percentage: f64,         // Random jitter to prevent thundering herd
}

impl Default for RetryConfig {
    fn default() -> Self {
        RetryConfig {
            max_attempts: 50,        // Extremely high number of retry attempts
            initial_delay_ms: 50,    // Very quick initial retry
            max_delay_ms: 30_000,    // Maximum 30 seconds between retries
            exponential_base: 2,     // Standard exponential backoff
            jitter_percentage: 0.25, // 25% jitter to spread out retries
        }
    }
}

fn get_connection_with_retry(
    pool: &Arc<Pool<SqliteConnectionManager>>, 
    config: &RetryConfig
) -> Result<PooledConnection<SqliteConnectionManager>, String> {
    let mut attempt = 0;
    let mut rng = rand::thread_rng();

    loop {
        match pool.get() {
            Ok(conn) => return Ok(conn),
            Err(e) if attempt < config.max_attempts => {
                attempt += 1;
                
                // Enhanced exponential backoff with jitter
                let base_delay = config.initial_delay_ms * (2_u64.pow(attempt as u32));
                let jitter = base_delay as f64 * config.jitter_percentage;
                let jittered_delay = base_delay as f64 + (rng.gen::<f64>() * jitter);
                let actual_delay = std::cmp::min(
                    jittered_delay as u64, 
                    config.max_delay_ms
                );
                
                log::error!(
                    "Connection Retrieval Retry: 
                    - Attempt: {}/{}
                    - Delay: {} ms
                    - Error: {}
                    - Possible Causes:
                      * Database Contention
                      * Connection Pool Exhaustion
                      * Resource Constraints",
                    attempt, 
                    config.max_attempts, 
                    actual_delay, 
                    e
                );
                
                // Advanced sleep mechanism with potential thread yield
                std::thread::sleep(Duration::from_millis(actual_delay));
                
                // Optional: Yield to allow other threads to proceed
                if attempt % 5 == 0 {
                    std::thread::yield_now();
                }
            }
            Err(e) => return Err(format!(
                "Persistent Connection Failure after {} attempts. 
                Underlying Error: {}
                Recommended Actions:
                1. Check database connection
                2. Verify connection pool configuration
                3. Review system resource availability", 
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
) -> Result<T, ProcessingError>
where 
    F: FnMut() -> Result<T, E>,
    E: Retryable + std::fmt::Debug + Into<ProcessingError>
{
    let mut attempt = 0;
    let mut rng = rand::thread_rng();

    loop {
        match operation() {
            Ok(result) => return Ok(result),
            Err(err) if attempt < config.max_attempts && err.should_retry() => {
                attempt += 1;
                
                // Exponential backoff with jitter
                let base_delay = config.initial_delay_ms * (config.exponential_base.pow(attempt as u32));
                let jitter = base_delay as f64 * config.jitter_percentage;
                let jittered_delay = base_delay as f64 + (rng.gen::<f64>() * jitter);
                let actual_delay = std::cmp::min(
                    jittered_delay as u64, 
                    config.max_delay_ms
                );
                
                log::warn!(
                    "Retry Operation: 
                    - Attempt: {}/{}
                    - Delay: {} ms
                    - Error: {:?}
                    - Backoff Strategy: Exponential with Jitter",
                    attempt, 
                    config.max_attempts, 
                    actual_delay, 
                    err
                );
                
                // Advanced parking mechanism with timeout
                std::thread::park_timeout(Duration::from_millis(actual_delay));
            }
            Err(err) => {
                log::error!(
                    "Operation Persistent Failure:
                    - Total Attempts: {}
                    - Final Error: {:?}
                    - Error Type: {}
                    - Recommendation: Manual Intervention Required",
                    attempt, 
                    err,
                    std::any::type_name::<E>()
                );
                return Err(err.into());
            }
        }
    }
}

impl ParallelCsvProcessor {
    const BATCH_SIZE: usize = 500;

    pub fn new(pool: &Arc<Pool<SqliteConnectionManager>>, num_workers: Option<usize>, db_state: &State<DbState>) -> Self {
        const MAX_CONCURRENT_WORKERS: usize = 8; 

        let num_workers = num_workers
            .map(|n| n.min(MAX_CONCURRENT_WORKERS))
            .unwrap_or_else(|| {
                std::cmp::min(
                    thread::available_parallelism()
                        .map(|n| n.get())
                        .unwrap_or(4),
                    MAX_CONCURRENT_WORKERS
                )
            });
        
        ParallelCsvProcessor {
            pool: Arc::clone(pool),
            num_workers,
            db_state: Arc::new(db_state.inner().to_owned()),
        }
    }

    fn large_dataset_processor(
        &self,
        work_receiver: Receiver<WorkItem>,
        result_sender: Sender<(usize, usize, Vec<String>)>,
        headers: &StringRecord,
    ) -> Vec<thread::JoinHandle<()>> {
        let pool = Arc::clone(&self.pool);
        let db_state = Arc::clone(&self.db_state);
        let retry_config = RetryConfig {
            max_attempts: 10,
            initial_delay_ms: 100,
            max_delay_ms: 5000,
            exponential_base: 2,
            jitter_percentage: 0.25,
        };
        let headers = headers.clone();
        let num_workers = self.num_workers;
    
        (0..num_workers)
            .map(|worker_id| {
                let work_receiver = work_receiver.clone();
                let result_sender = result_sender.clone();
                let pool = Arc::clone(&pool);
                let db_state = Arc::clone(&db_state);
                let retry_config = retry_config.clone();
                let headers = headers.clone();
    
                thread::spawn(move || {
                    let mut total_successful = 0;
                    let mut total_failed = 0;
                    let mut total_errors = Vec::new();
                    let mut work_completed = false;
    
                    while !work_completed {
                        // Establish connection with extended retry
                        let mut connection = match get_connection_with_retry(&pool, &retry_config) {
                            Ok(conn) => conn,
                            Err(e) => {
                                log::error!("Worker {} persistent connection error: {}", worker_id, e);
                                let _ = result_sender.send((0, 1, vec![e]));
                                break;
                            }
                        };
    
                        // Start a new transaction with retry
                        let mut tx = match connection.transaction() {
                            Ok(tx) => tx,
                            Err(e) => {
                                log::error!("Worker {} transaction error: {}", worker_id, e);
                                let _ = result_sender.send((0, 1, vec![e.to_string()]));
                                break;
                            }
                        };
    
                        let mut batch_successful = 0;
                        let mut batch_failed = 0;
                        let mut batch_errors = Vec::new();
    
                        // Process work items with enhanced error handling
                        for _ in 0..Self::BATCH_SIZE {
                            // Receive work item with extended timeout and error handling
                            let work_item = match work_receiver.recv_timeout(Duration::from_millis(1000)) {
                                Ok(item) => item,
                                Err(RecvTimeoutError::Timeout) => {
                                    // Check if channel is empty to determine completion
                                    if work_receiver.is_empty() {
                                        work_completed = true;
                                        break;
                                    }
                                    continue;
                                }
                                Err(RecvTimeoutError::Disconnected) => {
                                    work_completed = true;
                                    break;
                                }
                            };
    
                            // Process work item with nested transaction and comprehensive retry
                            match work_item {
                                WorkItem::Create(create_request) => {
                                    let result = safe_create_account(
                                        &mut tx, 
                                        create_request, 
                                        &retry_config
                                    );
                                    match result {
                                        Ok(_) => batch_successful += 1,
                                        Err(e) => {
                                            batch_failed += 1;
                                            batch_errors.push(e.to_string());
                                        }
                                    }
                                }
                                WorkItem::Update(id, update_request) => {
                                    let result = safe_update_account(
                                        &mut tx, 
                                        id, 
                                        update_request, 
                                        &retry_config
                                    );
                                    match result {
                                        Ok(_) => batch_successful += 1,
                                        Err(e) => {
                                            batch_failed += 1;
                                            batch_errors.push(e.to_string());
                                        }
                                    }
                                }
                            }
                        }
    
                        // Commit with comprehensive error handling
                        if let Err(commit_err) = tx.commit() {
                            log::error!("Batch commit failed: {}", commit_err);
                            batch_errors.push(format!("Commit failed: {}", commit_err));
                            batch_failed += batch_successful;
                            batch_successful = 0;
                        }
    
                        // Aggregate and send results
                        total_successful += batch_successful;
                        total_failed += batch_failed;
                        total_errors.extend(batch_errors.clone());
    
                        let _ = result_sender.send((batch_successful, batch_failed, batch_errors));
    
                        // Exit conditions
                        if work_receiver.is_empty() {
                            work_completed = true;
                        }
                    }
    
                    // Send final results and completion signal
                    let _ = result_sender.send((total_successful, total_failed, total_errors));
                    let _ = result_sender.send((usize::MAX, 0, Vec::new())); // Completion signal
                })
            })
            .collect()
    }
}


fn safe_create_account(
    tx: &mut rusqlite::Transaction,
    create_request: CreateSchoolAccountRequest,
    retry_config: &RetryConfig,
) -> Result<(), ProcessingError> {
    retry_operation(
        || {
            let repo = SqliteSchoolAccountRepository;
            // Ignore the returned SchoolAccount and just return Ok(()) if successful
            repo.create_school_account(tx, create_request.clone())
                .map(|_| ())
                .map_err(|e| {
                    log::error!("Create account error: {:?}", e);
                    e
                })
        }, 
        retry_config
    )
}

fn safe_update_account(
    tx: &mut rusqlite::Transaction,
    id: Uuid,
    update_request: CreateSchoolAccountRequest,
    retry_config: &RetryConfig,
) -> Result<(), ProcessingError> {
    let update_request: UpdateSchoolAccountRequest = update_request.into();
    
    retry_operation(
        || {
            let repo = SqliteSchoolAccountRepository;
            // Ignore the returned SchoolAccount and just return Ok(()) if successful
            repo.update_school_account(tx, id, update_request.clone())
                .map(|_| ())
                .map_err(|e| {
                    log::error!("Update account error: {:?}", e);
                    e
                })
        }, 
        retry_config
    )
}

pub fn process_csv_with_progress<F>(
    processor: &ParallelCsvProcessor,
    records: Vec<StringRecord>,
    headers: StringRecord,
    existing_accounts: Vec<ExistingAccountInfo>,
    progress_callback: F,
    last_updated_semester_id: Option<Uuid>,
    db_state: &State<DbState>
) -> Result<ProcessingResult, String> 
where
    F: Fn(f32) + Send + Sync + Clone + 'static
{
    let total_records = records.len();
    
    // Debug logging for dataset details
    log::debug!(
        "CSV Processing Initiated: 
        - Total Records: {}
        - Headers: {:?}
        - Existing Accounts: {}
        - Last Updated Semester ID: {:?}",
        total_records, 
        headers, 
        existing_accounts.len(),
        last_updated_semester_id
    );
    
    // Define threshold for switching between processing strategies
    const CHANNEL_BUFFER_SIZE: usize = 75_000; // Increased buffer size

    // Clone the progress callback for async usage
    let progress_callback_clone = progress_callback.clone();
    
    // Enhanced channel creation with larger buffer and bounded capacity
    let (work_sender, work_receiver) = crossbeam_channel::bounded(CHANNEL_BUFFER_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded(processor.num_workers);

    // Clone work_sender for use in the sending thread
    let work_sender_clone = work_sender.clone();

    // Prepare work items with error handling and logging
    let mut work_items = Vec::with_capacity(total_records);
    let mut create_count = 0;
    let mut update_count = 0;
    let mut skipped_count = 0;

    for (record_index, record) in records.into_iter().enumerate() {
        match CsvTransformer::new(&headers, Arc::clone(&processor.db_state)).transform_record(&record) {
            Ok(transformed_request) => {
                // Determine if it's a create or update based on existing accounts
                let work_item = if !existing_accounts.iter().any(|existing| 
                    existing.existing_accounts.iter().any(|acc| acc.school_id == transformed_request.school_id)
                ) {
                    create_count += 1;
                    WorkItem::Create(transformed_request)
                } else {
                    // Find the existing account ID for update
                    match existing_accounts.iter()
                        .find(|existing| existing.existing_accounts.iter()
                            .any(|acc| acc.school_id == transformed_request.school_id))
                        .and_then(|existing| existing.existing_accounts.first()) {
                        Some(existing_account) => {
                            update_count += 1;
                            WorkItem::Update(existing_account.id, transformed_request)
                        },
                        None => {
                            skipped_count += 1;
                            continue; // Skip if no matching account found
                        }
                    }
                };
                
                work_items.push(work_item);
            },
            Err(e) => {
                log::warn!(
                    "Record transformation error at index {}: {}. Skipping record.",
                    record_index,
                    e
                );
                skipped_count += 1;
            }
        }
    }

    // Detailed debug logging for work items
    log::debug!(
        "Work Item Preparation Complete:
        - Total Work Items: {}
        - Create Items: {}
        - Update Items: {}
        - Skipped Items: {}",
        work_items.len(),
        create_count,
        update_count,
        skipped_count
    );

    // Enhanced work item sending with backpressure and retry mechanism
    let progress_callback_async = progress_callback_clone.clone();
    let total_records_async = total_records;

    // Spawn a dedicated thread for work item sending
    let send_handle = thread::spawn(move || {
        log::debug!("Starting to send work items to processing channel");
        
        let mut sent_count = 0;
        let mut last_log_time = std::time::Instant::now();

        for (index, work_item) in work_items.into_iter().enumerate() {
            // Implement backpressure mechanism
            loop {
                match work_sender_clone.try_send(work_item.clone()) {
                    Ok(_) => {
                        sent_count += 1;
                        break;
                    },
                    Err(crossbeam_channel::TrySendError::Full(_)) => {
                        // Wait and retry if channel is full
                        std::thread::sleep(Duration::from_millis(10));
                        continue;
                    },
                    Err(crossbeam_channel::TrySendError::Disconnected(_)) => {
                        log::error!("Channel disconnected during work item sending");
                        return sent_count;
                    }
                }
            }
            
            // Periodic progress and logging
            if index % 100 == 0 {
                let progress = index as f32 / total_records_async as f32;
                progress_callback_async(progress);

                // Log progress periodically to prevent log spam
                if last_log_time.elapsed() >= Duration::from_secs(5) {
                    log::info!(
                        "Work Item Sending Progress: {}/{} ({}%)", 
                        index, 
                        total_records_async,
                        (progress * 100.0).round()
                    );
                    last_log_time = std::time::Instant::now();
                }
            }
        }

        log::debug!("Finished sending all work items");
        sent_count
    });

    // Drop the original sender to signal completion
    drop(work_sender);

    // Log before spawning workers
    log::info!(
        "Spawning {} workers for large dataset processing", 
        processor.num_workers
    );

    // Spawn workers
    let workers = processor.large_dataset_processor(
        work_receiver, 
        result_sender, 
        &headers
    );

    // Collect and aggregate results with timeout and error handling
    let mut overall_result = ProcessingResult::default();
    log::debug!("Collecting results from workers");

    // Timeout mechanism for result collection
    let result_collection_timeout = Duration::from_secs(600); // 10-minute timeout
    let collection_start = std::time::Instant::now();

    let mut completed_workers = 0;

    while completed_workers < processor.num_workers {
        // Break if timeout occurs
        if collection_start.elapsed() > result_collection_timeout {
            log::error!("Result collection timed out");
            break;
        }

        match result_receiver.recv_timeout(Duration::from_secs(30)) {
            Ok((successful, failed, errors)) => {
                // Check for special completion signal
                if successful == usize::MAX {
                    completed_workers += 1;
                    continue;
                }

                log::debug!(
                    "Worker result - Successful: {}, Failed: {}, Errors: {}",
                    successful, 
                    failed, 
                    errors.len()
                );
                overall_result.successful += successful;
                overall_result.failed += failed;
                overall_result.errors.extend(errors);
            },
            Err(err) => {
                log::error!("Error receiving worker results: {:?}", err);
                break;
            }
        }
    }

    // Wait for work item sending thread to complete
    let sent_count = send_handle.join().expect("Work item sending thread failed");

    // Wait for all workers to complete
    log::debug!("Waiting for worker threads to complete");
    for worker in workers {
        worker.join().expect("Worker thread panicked");
    }

    // Final progress and logging
    log::debug!( 
        "Large dataset processing complete. 
        Total Sent: {}
        Total Successful: {}, 
        Total Faile d: {}, 
        Total Errors: {}",
        sent_count,
        overall_result.successful,
        overall_result.failed,
        overall_result.errors.len()
    );

    // Return the overall processing result
    Ok(overall_result)
}