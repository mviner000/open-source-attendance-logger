// src/parallel_csv_processor.rs
use std::fmt;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use crossbeam_channel::{Sender, Receiver};
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

impl Default for ProcessingResult {
    fn default() -> Self {
        ProcessingResult {
            successful: 0,
            failed: 0,
            errors: Vec::new(),
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
                
                let base_delay = config.initial_delay_ms * (2_u64.pow(attempt as u32));
                let jitter = thread_rng().gen_range(0..=base_delay);
                let actual_delay = std::cmp::min(base_delay + jitter, config.max_delay_ms);
                
                log::error!(
                    "Connection pool retrieval failed (Attempt {}/{}) with error: {}. 
                    Retry delay: {} ms. 
                    Error details: {:?}
                    Possible causes:
                    - Database is locked
                    - Connection pool exhausted
                    - Resource temporarily unavailable
                    - Concurrent connection attempts",
                    attempt, 
                    config.max_attempts, 
                    e,
                    actual_delay,
                    e
                );
                
                std::thread::sleep(Duration::from_millis(actual_delay));
            }
            Err(e) => return Err(format!(
                "Persistent connection retrieval failure after {} attempts. 
                Underlying error: {}", 
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
                
                let delay = std::cmp::min(
                    config.initial_delay_ms * (config.exponential_base.pow(attempt as u32)),
                    config.max_delay_ms
                );
                
                let jitter = rand::random::<u64>() % (delay / 2);
                let actual_delay = delay + jitter;
                
                log::warn!(
                    "Operation retry attempt {}/{} triggered. 
                    Delay: {} ms
                    Error details: {:?}
                    Retry conditions: 
                    - Retryable error detected
                    - Attempt within max retry limit",
                    attempt, 
                    config.max_attempts, 
                    actual_delay,
                    err
                );
                
                std::thread::sleep(Duration::from_millis(actual_delay));
            }
            Err(err) => {
                log::error!(
                    "Operation failed after {} retry attempts. 
                    Final error: {:?}
                    Unable to successfully complete operation.",
                    config.max_attempts, 
                    err
                );
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
        let batch_len = batch.len(); 

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

        // Define retry config with more aggressive backoff
        let retry_config = RetryConfig {
            max_attempts: 5,
            initial_delay_ms: 100,
            max_delay_ms: 2000,
            exponential_base: 2,
        };

        // Attempt to get a connection with extended timeout
        let mut connection = match get_connection_with_retry(&self.pool, &retry_config) {
            Ok(conn) => conn,
            Err(e) => {
                return ProcessingResult {
                    successful: 0,
                    failed: batch_len, // Use the stored length
                    errors: vec![format!("Connection error: {}", e)],
                };
            }
        };

        // Use a savepoint for more granular transaction management
        let tx = match connection.savepoint() {
            Ok(tx) => tx,
            Err(e) => {
                return ProcessingResult {
                    successful: 0,
                    failed: batch_len, // Use the stored length
                    errors: vec![format!("Transaction start error: {}", e)],
                };
            }
        };

        // Process creates
        if !creates.is_empty() {
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
        }

        // Process updates with account IDs
        if !updates.is_empty() {
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
        }

        // Attempt to commit the transaction
        if let Err(commit_err) = tx.commit() {
            errors.push(format!("Transaction commit failed: {}", commit_err));
            failed += successful;
            successful = 0;
        }

        // Return results with enhanced error tracking
        ProcessingResult {
            successful,
            failed,
            errors,
        }
    }

    fn process_update(
        &self,
        tx: &rusqlite::Savepoint,  // Change from Transaction to Savepoint
        account_id: Uuid,
        update_request: CreateSchoolAccountRequest,
        retry_config: &RetryConfig,
    ) -> Result<(), ProcessingError> {
        let mut attempt = 0;
        
        // Convert CreateSchoolAccountRequest to UpdateSchoolAccountRequest
        let update_request: UpdateSchoolAccountRequest = update_request.into();
        
        loop {
            match retry_operation(
                || SqliteSchoolAccountRepository.update_school_account(tx, account_id, update_request.clone()),
                retry_config
            ) {
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
        tx: &rusqlite::Savepoint,  // Change from Transaction to Savepoint
        create_request: CreateSchoolAccountRequest,
        retry_config: &RetryConfig,
    ) -> Result<(), ProcessingError> {
        let mut attempt = 0;
        
        loop {
            match retry_operation(
                || SqliteSchoolAccountRepository.create_school_account(tx, create_request.clone()),
                retry_config
            ) {
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
        headers: &StringRecord,
    ) -> Vec<thread::JoinHandle<()>> {
        let pool = Arc::clone(&self.pool);
        let db_state = Arc::clone(&self.db_state);
        let retry_config = RetryConfig::default();
        let headers = headers.clone();
    
        (0..self.num_workers)
            .map(|worker_id| {
                let work_receiver = work_receiver.clone();
                let result_sender = result_sender.clone();
                let pool = Arc::clone(&pool);
                let db_state = Arc::clone(&db_state);
                let retry_config = retry_config.clone();
                let headers = headers.clone();
    
                thread::spawn(move || {
                    let mut successful = 0;
                    let mut failed = 0;
                    let mut errors = Vec::new();
    
                    // Enhanced connection management with retry
                    let mut connection = match get_connection_with_retry(&pool, &retry_config) {
                        Ok(conn) => conn,
                        Err(e) => {
                            log::error!("Worker {} connection error: {}", worker_id, e);
                            let _ = result_sender.send((0, 1, vec![e]));
                            return;
                        }
                    };
    
                    // Robust transaction management
                    let mut tx = match connection.savepoint() {
                        Ok(tx) => tx,
                        Err(e) => {
                            log::error!("Worker {} savepoint error: {}", worker_id, e);
                            let _ = result_sender.send((0, 1, vec![e.to_string()]));
                            return;
                        }
                    };
    
                    // Process work items
                    while let Ok(work_item) = work_receiver.recv() {
                        match work_item {
                            WorkItem::Create(create_request) => {
                                // Create transformer with thread-safe db_state
                                let transformer = CsvTransformer::new(&headers, Arc::clone(&db_state));
    
                                match retry_operation(
                                    || {
                                        // Nested savepoint for granular error handling
                                        let mut nested_tx = tx.savepoint()?;
                                        let repo = SqliteSchoolAccountRepository;
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
                                                "Worker {} create error for {}: {}", 
                                                worker_id,
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
                                        // Nested savepoint for granular error handling
                                        let mut nested_tx = tx.savepoint()?;
                                        let repo = SqliteSchoolAccountRepository;
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
                                                "Worker {} update error for {}: {}", 
                                                worker_id,
                                                id, 
                                                e
                                            ));
                                        }
                                    }
                                }
                            }
                        }
                    }
    
                    // Commit main transaction
                    if let Err(commit_err) = tx.commit() {
                        errors.push(format!("Worker {} transaction commit failed: {}", worker_id, commit_err));
                        failed += successful;
                        successful = 0;
                    }
    
                    // Send final results
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
) -> Result<ProcessingResult, String> 
where
    F: Fn(f32) + Send + Sync + Clone + 'static
{
    let total_records = records.len();
    
    // Define threshold for switching between processing strategies
    const SMALL_DATASET_THRESHOLD: usize = 5000;
    
    // Clone the progress callback for async usage
    let progress_callback_clone = progress_callback.clone();
    
    // Choose processing strategy based on dataset size
    let result = if total_records <= SMALL_DATASET_THRESHOLD {
        // Use process_batch for small datasets
        let mut overall_result = ProcessingResult::default();
        let chunk_size = 500; // Use a reasonable chunk size for batch processing
        
        for (iteration, chunk) in records.chunks(chunk_size).enumerate() {
            let chunk_result = processor.process_batch(
                chunk.to_vec(),
                &headers,
                &existing_accounts,
                last_updated_semester_id
            );

            // Update overall result
            overall_result.successful += chunk_result.successful;
            overall_result.failed += chunk_result.failed;
            overall_result.errors.extend(chunk_result.errors);

            // Progress callback
            let progress = ((iteration + 1) * chunk_size).min(total_records) as f32 / total_records as f32;
            progress_callback(progress);
        }
        
        // Final progress
        progress_callback(1.0);
        
        Ok(overall_result)
    } else {
        // Use spawn_workers for large datasets
        let (work_sender, work_receiver) = crossbeam_channel::bounded(total_records);
        let (result_sender, result_receiver) = crossbeam_channel::bounded(processor.num_workers);

        // Distribute work items
        let mut work_items = Vec::new();
        for record in records.into_iter() {
            // Transform record and create appropriate WorkItem
            if let Ok(transformed_request) = CsvTransformer::new(&headers, Arc::clone(&processor.db_state)).transform_record(&record) {
                // Determine if it's a create or update based on existing accounts
                let work_item = if !existing_accounts.iter().any(|existing| 
                    existing.existing_accounts.iter().any(|acc| acc.school_id == transformed_request.school_id)
                ) {
                    WorkItem::Create(transformed_request)
                } else {
                    // Find the existing account ID for update
                    if let Some(existing_account) = existing_accounts.iter()
                        .find(|existing| existing.existing_accounts.iter()
                            .any(|acc| acc.school_id == transformed_request.school_id))
                        .and_then(|existing| existing.existing_accounts.first()) {
                        WorkItem::Update(existing_account.id, transformed_request)
                    } else {
                        continue; // Skip if no matching account found
                    }
                };
                
                work_items.push(work_item);
            }
        }

        // Capture cloned progress callback for async use
        let progress_callback_async = progress_callback_clone.clone();

        // Send work items with progress tracking
        let total_records_async = total_records;
        tokio::spawn(async move {
            for (index, work_item) in work_items.into_iter().enumerate() {
                work_sender.send(work_item).expect("Failed to send work item");
                
                // Periodic progress update
                if index % 100 == 0 {
                    let progress = index as f32 / total_records_async as f32;
                    progress_callback_async(progress);
                }
            }
            drop(work_sender);
        });

        // Spawn workers
        let workers = processor.spawn_workers(
            work_receiver, 
            result_sender, 
            &headers
        );

        // Collect and aggregate results
        let mut overall_result = ProcessingResult::default();
        for _ in 0..processor.num_workers {
            if let Ok((successful, failed, errors)) = result_receiver.recv() {
                overall_result.successful += successful;
                overall_result.failed += failed;
                overall_result.errors.extend(errors);
            }
        }

        // Wait for all workers to complete
        for worker in workers {
            worker.join().expect("Worker thread panicked");
        }

        // Final progress callback
        progress_callback_clone(1.0);

        Ok(overall_result)
    };

    result
}