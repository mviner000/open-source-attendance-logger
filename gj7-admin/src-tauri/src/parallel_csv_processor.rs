// src/parallel_csv_processor.rs

use std::sync::{Arc, Mutex};
use std::thread;
use std::path::Path;
use crossbeam_channel::{bounded, Sender, Receiver};
use rayon::prelude::*;
use csv::StringRecord;
use uuid::Uuid;
use rusqlite::{Connection, Transaction};
use crate::db::school_accounts::{SchoolAccount, CreateSchoolAccountRequest, SqliteSchoolAccountRepository, SchoolAccountRepository};
use crate::csv_commands::{ExistingAccountInfo};
use crate::db::csv_transform::{CsvTransformer, TransformError};

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
}

impl ParallelCsvProcessor {
    pub fn new(connection: &Connection, num_workers: Option<usize>) -> Self {
        let num_workers = num_workers.unwrap_or_else(|| thread::available_parallelism().unwrap().get());
        
        // Fix: Handle the path correctly by converting it to a string directly
        let db_path = connection.path()
            .map(|p| p.to_string())
            .unwrap_or_else(|| String::from(":memory:"));
        
        ParallelCsvProcessor {
            db_path,
            num_workers,
        }
    }

    pub fn process_csv_data(
        &self,
        records: Vec<StringRecord>,
        headers: StringRecord,
        existing_accounts: Vec<ExistingAccountInfo>,
        last_updated_semester_id: Option<Uuid>
    ) -> ProcessingResult {
        let (work_sender, work_receiver) = bounded::<WorkItem>(self.num_workers * 2);
        let (result_sender, result_receiver) = bounded(self.num_workers * 2);

        // Start worker threads
        let workers = self.spawn_workers(work_receiver, result_sender.clone());

        // Process records in chunks using rayon
        let chunk_size = (records.len() / self.num_workers).max(1);
        
        // Create transformer connections per thread
        let processing_errors = Arc::new(Mutex::new(Vec::new()));
        let work_sender = Arc::new(work_sender);

        // Create a mapping of school_ids to existing accounts for faster lookup
        let existing_accounts_map: std::collections::HashMap<String, ExistingAccountInfo> = 
        existing_accounts.clone()  // Use the existing_accounts directly
            .into_iter()
            .map(|info| {
                // Clone existing_accounts before processing
                let cloned_accounts = info.existing_accounts.clone();
                
                // Create a map of school_ids to existing accounts
                let school_id_map: std::collections::HashMap<String, SchoolAccount> = 
                    cloned_accounts.iter().cloned()
                        .map(|acc| (acc.school_id.clone(), acc))
                        .collect();
                
                (cloned_accounts.first()
                    .map(|acc| acc.school_id.clone())
                    .unwrap_or_default(), 
                info)
            })
            .collect();
        
        let db_path = self.db_path.clone();
        let headers = Arc::new(headers);

        // Process chunks in parallel
        records.par_chunks(chunk_size)
            .for_each_with(
                (work_sender.clone(), processing_errors.clone()),
                |(sender, errors), chunk| {
                    // Create a new connection for each thread
                    let mut thread_conn = Connection::open(&db_path)
                        .expect("Failed to create thread connection");
                    let transformer = CsvTransformer::new(&headers, thread_conn);

                    for record in chunk {
                        match transformer.transform_record(record) {
                            Ok(mut create_request) => {
                                // Add semester_id to the create_request if provided
                                if let Some(last_updated_semester_id) = last_updated_semester_id {
                                    create_request.last_updated_semester_id = Some(last_updated_semester_id);
                                }
            
                                let work_item = {
                                    let existing_match = existing_accounts_map.get(&create_request.school_id)
                                        .and_then(|existing| existing.existing_accounts.first());
                                    
                                    match existing_match {
                                        Some(account) => WorkItem::Update(account.id, create_request.clone()),
                                        None => WorkItem::Create(create_request)
                                    }
                                };
            
                                if sender.send(work_item).is_err() {
                                    errors.lock().unwrap().push("Failed to send work item".to_string());
                                }
                            }
                            Err(e) => {
                                errors.lock().unwrap().push(format!("Transform error: {}", e));
                            }
                        }
                    }
                }
            );

        // Close the work channel to signal workers to finish
        drop(work_sender);

        // Collect results
        let mut successful = 0;
        let mut failed = 0;
        let mut errors = processing_errors.lock().unwrap().clone();

        // Wait for all workers to complete and collect their results
        for _ in 0..workers.len() {
            if let Ok((success, failure, worker_errors)) = result_receiver.recv() {
                successful += success;
                failed += failure;
                errors.extend(worker_errors);
            }
        }

        // Wait for all worker threads to finish
        for worker in workers {
            worker.join().unwrap();
        }

        ProcessingResult {
            successful,
            failed,
            errors,
        }
    }

    fn spawn_workers(
        &self,
        work_receiver: Receiver<WorkItem>,
        result_sender: Sender<(usize, usize, Vec<String>)>,
    ) -> Vec<thread::JoinHandle<()>> {
        let db_path = self.db_path.clone();
        
        (0..self.num_workers)
            .map(|_| {
                let work_receiver = work_receiver.clone();
                let result_sender = result_sender.clone();
                let db_path = db_path.clone();

                thread::spawn(move || {
                    let mut successful = 0;
                    let mut failed = 0;
                    let mut errors = Vec::new();

                    let repo = SqliteSchoolAccountRepository;
                    
                    // Create a new connection for each worker thread with mut
                    let mut connection = Connection::open(&db_path)
                        .expect("Failed to create worker connection");
                    let tx = connection.transaction().unwrap();

                    while let Ok(work_item) = work_receiver.recv() {
                        match work_item {
                            WorkItem::Create(create_request) => {
                                match repo.create_school_account(&tx, create_request.clone()) {
                                    Ok(_) => successful += 1,
                                    Err(e) => {
                                        failed += 1;
                                        errors.push(format!(
                                            "Failed to create account for {}: {}", 
                                            create_request.school_id, 
                                            e
                                        ));
                                    }
                                }
                            }
                            WorkItem::Update(id, update_request) => {
                                match repo.update_school_account(&tx, id, update_request.into()) {
                                    Ok(_) => successful += 1,
                                    Err(e) => {
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

                    // Commit the transaction
                    if let Err(e) = tx.commit() {
                        errors.push(format!("Failed to commit transaction: {}", e));
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
    last_updated_semester_id: Option<Uuid>  // Add last_updated_semester_id parameter
) -> ProcessingResult 
where
    F: Fn(f32) + Send + 'static
{
    let total_records = records.len();
    let chunk_size = 1000;
    let mut overall_result = ProcessingResult {
        successful: 0,
        failed: 0,
        errors: Vec::new(),
    };

    for (i, chunk) in records.chunks(chunk_size).enumerate() {
        let result = processor.process_csv_data(
            chunk.to_vec(),
            headers.clone(),
            existing_accounts.clone(),
            last_updated_semester_id
        );

        overall_result.successful += result.successful;
        overall_result.failed += result.failed;
        overall_result.errors.extend(result.errors);

        let progress = ((i + 1) * chunk_size).min(total_records) as f32 / total_records as f32;
        progress_callback(progress);
    }

    overall_result
}