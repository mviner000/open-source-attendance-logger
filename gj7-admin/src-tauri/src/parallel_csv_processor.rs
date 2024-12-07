// src/parallel_csv_processor.rs

use std::sync::{Arc, Mutex};
use std::env;
use std::thread;
use std::path::Path;
use crossbeam_channel::{bounded, Sender, Receiver};
use rayon::prelude::*;
use csv::StringRecord;
use uuid::Uuid;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Connection, Transaction};
use crate::db::school_accounts::{SchoolAccount, CreateSchoolAccountRequest, SqliteSchoolAccountRepository, SchoolAccountRepository};
use crate::csv_commands::{ExistingAccountInfo};
use crate::db::csv_transform::{CsvTransformer, TransformError};
use crate::DbState;
use tauri::State;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::task;

#[derive(Debug)]
enum WorkItem {
    Create(CreateSchoolAccountRequest),
    Update(Uuid, CreateSchoolAccountRequest),
}

#[derive(Debug)]
pub struct ProcessingResult {
    pub successful: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

pub struct ParallelCsvProcessor {
    db_path: String,
    num_workers: usize,
    db_state: Arc<DbState>,
}

#[derive(Debug, Clone)]
struct SystemResourceConfig {
    total_cores: usize,
    total_memory: u64,
    available_memory: u64,
    max_workers: usize,
    memory_allocation: u64,
    architecture: String,
    operating_system: String,
}

impl SystemResourceConfig {
    fn new() -> Self {
        // Number of logical cores
        let total_cores = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1);
        
        // Estimate memory (this is a simplified approach)
        let total_memory = Self::estimate_system_memory();
        
        // Get system architecture
        let architecture = env::consts::ARCH.to_string();
        
        // Get operating system
        let operating_system = env::consts::OS.to_string();

        let max_workers = Self::calculate_optimal_workers(total_cores);
        let memory_allocation = Self::calculate_memory_allocation(total_memory);

        Self {
            total_cores,
            total_memory,
            available_memory: total_memory, // Simplified
            max_workers,
            memory_allocation,
            architecture,
            operating_system,
        }
    }

    fn estimate_system_memory() -> u64 {
        // Crude estimation - you might want to use a more sophisticated method
        #[cfg(target_os = "windows")]
        {
            // Windows-specific memory detection (requires winapi)
            use winapi::um::sysinfoapi::GlobalMemoryStatusEx;
            use winapi::um::winbase::MEMORYSTATUSEX;

            unsafe {
                let mut mem_status: MEMORYSTATUSEX = std::mem::zeroed();
                mem_status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
                
                if GlobalMemoryStatusEx(&mut mem_status) != 0 {
                    return mem_status.ullTotalPhys;
                }
            }
        }

        // Fallback for other platforms
        // Assume a default of 8GB if detection fails
        8 * 1024 * 1024 * 1024 // 8GB in bytes
    }

    fn calculate_optimal_workers(total_cores: usize) -> usize {
        (total_cores * 2).max(8).min(256) // Double the number of threads, capped at 256
    }    
    
    fn calculate_memory_allocation(total_memory: u64) -> u64 {
        let total_gb = total_memory / (1024 * 1024 * 1024);
        
        match total_gb {
            mem if mem <= 8 => total_memory * 6 / 10,     // 60% for systems <= 8GB
            mem if mem <= 16 => total_memory * 75 / 100,  // 75% for systems <= 16GB
            mem if mem <= 32 => total_memory * 85 / 100,  // 85% for systems <= 32GB
            _ => total_memory * 9 / 10,                   // 90% for larger systems
        }
    }

    fn debug_system_info(&self) {
        println!("System Information:");
        println!("Cores: {}", self.total_cores);
        println!("Total Memory: {} GB", self.total_memory / (1024 * 1024 * 1024));
        println!("Max Workers: {}", self.max_workers);
        println!("Architecture: {}", self.architecture);
        println!("Operating System: {}", self.operating_system);
    }

    fn monitor_and_adjust(&mut self) {
        // Simplified monitoring - you might want to add more sophisticated 
        // runtime monitoring mechanisms
        let current_cores = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1);

        if current_cores != self.total_cores {
            self.total_cores = current_cores;
            self.max_workers = Self::calculate_optimal_workers(current_cores);
        }
    }
}

impl ParallelCsvProcessor {
    // Preserve the existing new method, but integrate dynamic resource detection
    pub fn new(
        connection: &Connection,
        num_workers: Option<usize>,
        state: &State<'_, DbState>
    ) -> Self {
        let resource_config = SystemResourceConfig::new();
        
        let workers = num_workers.unwrap_or(resource_config.max_workers);

        ParallelCsvProcessor {
            db_path: state.0.get_db_path().to_string_lossy().into_owned(),
            num_workers: workers,
            db_state: Arc::new(DbState(state.0.clone())),
        }
    }

    fn retry_operation<F, T, E>(mut operation: F, max_attempts: usize) -> Result<T, E>
    where
        F: FnMut() -> Result<T, E>,
        E: std::fmt::Debug,
    {
        let mut attempts = 0;
        loop {
            attempts += 1;
            match operation() {
                Ok(result) => return Ok(result),
                Err(e) if attempts < max_attempts => {
                    // Optional: Add a small delay between retries
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempts as u64));
                    continue;
                }
                Err(e) => return Err(e),
            }
        }
    }


    // Enhanced async processing method with dynamic resource management
    pub async fn process_csv_data_async(
        &self,
        records: Vec<StringRecord>,
        headers: StringRecord,
        existing_accounts: Vec<ExistingAccountInfo>,
        last_updated_semester_id: Option<Uuid>,
    ) -> ProcessingResult {
        let total_records = records.len();
        let workers = self.num_workers;
        let chunk_size = (total_records / (workers * 2)).max(1);
        
        // Dynamic Semaphore with adaptive worker count
        let semaphore = Arc::new(Semaphore::new(workers * 2)); // Double the number of permits
        
        let processing_result = Arc::new(Mutex::new(ProcessingResult {
            successful: 0,
            failed: 0,
            errors: Vec::new(),
        }));
    
        let futures: Vec<_> = records
            .chunks(chunk_size)
            .map(|chunk| {
                let chunk = chunk.to_vec();
                let headers = headers.clone();
                let existing_accounts = existing_accounts.clone();
                let last_updated_semester_id = last_updated_semester_id;
                let db_state = Arc::clone(&self.db_state);
                let result_ref = Arc::clone(&processing_result);
                let pool = db_state.0.pool.clone();
                let permit = semaphore.clone().acquire_owned();
    
                task::spawn(async move {
                    let _permit = permit.await.unwrap();
    
                    let process_chunk = || -> Result<ProcessingResult, Box<dyn std::error::Error>> {
                        let mut connection = pool.get()
                            .map_err(|e| format!("Failed to get connection: {}", e))?;
    
                        let transformer = CsvTransformer::new(&headers, Arc::clone(&db_state));
                        let mut successful = 0;
                        let mut failed = 0;
                        let mut errors = Vec::new();
    
                        for record in &chunk {
                            match transformer.transform_record(record) {
                                Ok(create_request) => {
                                    let operation_result = Self::retry_operation(|| {
                                        let tx = connection.transaction()
                                            .map_err(|e| format!("Transaction error: {}", e))?;
                                        
                                        let repo = SqliteSchoolAccountRepository;
                                        
                                        match repo.create_school_account(&tx, create_request.clone()) {
                                            Ok(_) => {
                                                tx.commit()
                                                    .map_err(|e| format!("Commit error: {}", e))?;
                                                Ok(true)
                                            }
                                            Err(e) => Err(e.to_string())
                                        }
                                    }, 3);
    
                                    match operation_result {
                                        Ok(_) => successful += 1,
                                        Err(e) => {
                                            failed += 1;
                                            errors.push(e);
                                        }
                                    }
                                }
                                Err(e) => {
                                    failed += 1;
                                    errors.push(e.to_string());
                                }
                            }
                        }
    
                        Ok(ProcessingResult { 
                            successful, 
                            failed, 
                            errors 
                        })
                    };
    
                    match Self::retry_operation(process_chunk, 3) {
                        Ok(chunk_result) => {
                            let mut result = result_ref.lock().unwrap();
                            result.successful += chunk_result.successful;
                            result.failed += chunk_result.failed;
                            result.errors.extend(chunk_result.errors);
                        }
                        Err(e) => {
                            let mut result = result_ref.lock().unwrap();
                            result.failed += chunk.len();
                            result.errors.push(e.to_string());
                        }
                    }
                })
            })
            .collect();
    
        futures::future::join_all(futures).await;
    
        Arc::try_unwrap(processing_result)
            .unwrap()
            .into_inner()
            .unwrap()
    }
}

// Preserve the existing progress async method
pub async fn process_csv_with_progress_async<F>(
    processor: &ParallelCsvProcessor,
    records: Vec<StringRecord>,
    headers: StringRecord,
    existing_accounts: Vec<ExistingAccountInfo>,
    progress_callback: F,
    last_updated_semester_id: Option<Uuid>,  // Add last_updated_semester_id parameter
) -> ProcessingResult 
where
    F: Fn(f32) + Send + Sync + 'static,
{
    let total_records = records.len();
    let chunk_size = 1000;
    let mut overall_result = ProcessingResult {
        successful: 0,
        failed: 0,
        errors: Vec::new(),
    };

    for (i, chunk) in records.chunks(chunk_size).enumerate() {
        let result = processor
            .process_csv_data_async(
                chunk.to_vec(),
                headers.clone(),
                existing_accounts.clone(),
                last_updated_semester_id,
            )
            .await; // Await the async call here

        overall_result.successful += result.successful;
        overall_result.failed += result.failed;
        overall_result.errors.extend(result.errors);

        let progress = ((i + 1) * chunk_size).min(total_records) as f32 / total_records as f32;
        progress_callback(progress);
    }

    overall_result
}
