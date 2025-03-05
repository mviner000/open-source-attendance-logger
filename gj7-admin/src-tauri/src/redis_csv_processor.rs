// src/redis_csv_processor.rs

use redis::{
    AsyncCommands, 
    Client, 
    aio::Connection as AsyncConnection,
};
use std::sync::Arc;
use tokio::sync::{Mutex, Semaphore};
use csv::StringRecord;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::time::Duration;

pub struct RedisCsvProcessor {
    client: Client,
    batch_size: usize,
    redis_url: String,
    max_concurrent_tasks: usize,
}

impl ProcessingResult {
    // New method to merge results from different chunks
    pub fn merge(&mut self, other: ProcessingResult) {
        self.successful += other.successful;
        self.failed += other.failed;
        self.errors.extend(other.errors);
    }

    // Add a default implementation for easier initialization
    pub fn default() -> Self {
        ProcessingResult {
            successful: 0,
            failed: 0,
            errors: Vec::new(),
        }
    }
}

impl RedisCsvProcessor {
     // Updated new method to align with the specified error handling
     pub async fn new(redis_url: &str, batch_size: Option<usize>, max_concurrent_tasks: Option<usize>) -> Result<Self, redis::RedisError> {
        let connection_info = redis_url.parse::<redis::ConnectionInfo>()?;
        let client = Client::open(connection_info)?;

        Ok(Self {
            client,
            batch_size: batch_size.unwrap_or(1000),
            redis_url: redis_url.to_string(),
            max_concurrent_tasks: max_concurrent_tasks.unwrap_or(50),
        })
    }

    // Updated method for processing large CSV files in chunks with improved error context
    pub async fn process_large_csv_in_chunks(
        &self, 
        records: &[StringRecord], 
        headers: &csv::StringRecord,
        chunk_size: Option<usize>
    ) -> Result<ProcessingResult, String> {
        // Use configured batch size if no chunk size provided
        let chunk_size = chunk_size.unwrap_or(self.batch_size);
        
        // Initialize overall result
        let mut overall_result = ProcessingResult::default();
        
        // Process records in chunks with more detailed error handling
        for (chunk_index, chunk) in records.chunks(chunk_size).enumerate() {
            // Process each chunk with retry mechanism
            match self.process_with_retry(chunk, headers, 3).await {
                Ok(chunk_result) => {
                    // Merge results from this chunk
                    overall_result.merge(chunk_result);
                },
                Err(e) => {
                    // Detailed error logging for chunk processing
                    let error_msg = format!(
                        "Error processing chunk {}: {} (chunk size: {}, records in chunk: {})", 
                        chunk_index, 
                        e, 
                        chunk_size, 
                        chunk.len()
                    );
                    
                    // Add chunk-level error to overall results
                    overall_result.errors.push(error_msg);
                    overall_result.failed += chunk.len();
                }
            }
        }
        
        Ok(overall_result)
    }

    // Optional: Add a method to estimate chunk size based on system resources
    fn estimate_optimal_chunk_size(&self, total_records: usize) -> usize {
        // Simple heuristic: balance between batch size and max concurrent tasks
        let estimated_chunk = (total_records / self.max_concurrent_tasks).max(self.batch_size);
        estimated_chunk.min(5000) // Prevent extremely large chunks
    }

    // Convenience method to process large CSV with automatic chunk sizing
    pub async fn process_large_csv_auto_chunk(
        &self, 
        records: &[StringRecord], 
        headers: &csv::StringRecord
    ) -> Result<ProcessingResult, String> {
        let chunk_size = self.estimate_optimal_chunk_size(records.len());
        
        self.process_large_csv_in_chunks(records, headers, Some(chunk_size)).await
    }

    // Async connection method with improved error handling
    async fn get_async_connection(&self) -> Result<AsyncConnection, redis::RedisError> {
        tokio::time::timeout(
            Duration::from_secs(10), 
            self.client.get_async_connection()
        )
        .await
        .map_err(|_| redis::RedisError::from(std::io::Error::new(
            std::io::ErrorKind::TimedOut, 
            "Redis connection timeout"
        )))?
    }

    pub async fn process_csv_records(
        &self, 
        records: &[StringRecord], 
        headers: &csv::StringRecord
    ) -> Result<ProcessingResult, String> {
        let semaphore = Arc::new(Semaphore::new(self.max_concurrent_tasks));
        let successful = Arc::new(Mutex::new(0));
        let failed = Arc::new(Mutex::new(0));
        let errors = Arc::new(Mutex::new(Vec::new()));

        let total_records = records.len();
        let tasks: Vec<_> = records.iter().enumerate().map(|(index, record)| {
            let record = record.clone();
            let headers = headers.clone();
            let client = self.client.clone();
            let redis_url = self.redis_url.clone();
            let semaphore_clone = semaphore.clone();
            let successful_clone = Arc::clone(&successful);
            let failed_clone = Arc::clone(&failed);
            let errors_clone = Arc::clone(&errors);

            tokio::spawn(async move {
                let _permit = semaphore_clone.acquire().await.unwrap();

                let conn_result = client.get_async_connection().await;

                match conn_result {
                    Ok(mut conn) => {
                        match Self::process_single_record(&mut conn, &record, &headers, index).await {
                            Ok(_) => {
                                let mut successful = successful_clone.lock().await;
                                *successful += 1;
                            },
                            Err(e) => {
                                let school_id = record.get(0).unwrap_or("unknown").to_string();
                                let mut failed = failed_clone.lock().await;
                                let mut error_list = errors_clone.lock().await;
                                *failed += 1;
                                error_list.push(format!("Error processing school {}: {}", school_id, e));
                            }
                        }
                    },
                    Err(e) => {
                        let mut failed = failed_clone.lock().await;
                        let mut error_list = errors_clone.lock().await;
                        *failed += 1;
                        error_list.push(format!("Redis connection error: {}", e));
                    }
                }
            })
        }).collect();

        // Wait for all tasks to complete
        for task in tasks {
            task.await.map_err(|e| format!("Task failed: {}", e))?;
        }
    
        // Move lock acquisition and value extraction inside this block
        let result = ProcessingResult {
            successful: *successful.lock().await,
            failed: *failed.lock().await,
            errors: errors.lock().await.clone(),
        };

        Ok(result)
    }

    async fn process_single_record(
        conn: &mut AsyncConnection, 
        record: &StringRecord,
        headers: &csv::StringRecord,
        index: usize
    ) -> Result<(), String> {
        // Extract key fields
        let school_id = record.get(0)
            .ok_or_else(|| format!("Missing school_id in record {}", index))?;
    
        // Construct a Redis key with a namespace
        let redis_key = format!("school_account:{}", school_id);
    
        // Convert record to a vector of tuples
        let record_data: Vec<(String, String)> = headers.iter()
            .zip(record.iter())
            .map(|(header, value)| (header.to_string(), value.to_string()))
            .collect();
    
        // Clone redis_key for the second use
        conn.hset_multiple::<String, String, String, ()>(redis_key.clone(), &record_data)
            .await
            .map_err(|e| format!("Redis HMSET error for {}: {}", school_id, e))?;
        
        conn.expire::<String, ()>(redis_key, 86400 * 30)
            .await
            .map_err(|e| format!("Redis EXPIRE error for {}: {}", school_id, e))?;
    
        Ok(())
    }

    pub async fn process_with_retry(
        &self, 
        records: &[StringRecord], 
        headers: &csv::StringRecord,
        max_retries: usize
    ) -> Result<ProcessingResult, String> {
        let semaphore = Arc::new(Semaphore::new(self.max_concurrent_tasks));
        let successful = Arc::new(Mutex::new(0));
        let failed = Arc::new(Mutex::new(0));
        let errors = Arc::new(Mutex::new(Vec::new()));
    
        let total_records = records.len();
        let tasks: Vec<_> = records.iter().enumerate().map(|(index, record)| {
            let record = record.clone();
            let headers = headers.clone();
            let client = self.client.clone();
            let redis_url = self.redis_url.clone();
            let semaphore_clone = semaphore.clone();
            let successful_clone = Arc::clone(&successful);
            let failed_clone = Arc::clone(&failed);
            let errors_clone = Arc::clone(&errors);
    
            tokio::spawn(async move {
                let _permit = semaphore_clone.acquire().await.unwrap();
    
                // Retry logic with exponential backoff
                let mut retry_count = 0;
                loop {
                    // Move the connection attempt inside the retry loop
                    log::debug!("Attempting to get Redis connection for record {} (attempt {}/{})", 
                        index, retry_count + 1, max_retries);
                    
                    match client.get_async_connection().await {
                        Ok(mut conn) => {
                            log::debug!("Successfully obtained connection for record {}", index);
                            
                            match Self::process_single_record(&mut conn, &record, &headers, index).await {
                                Ok(_) => {
                                    log::debug!("Successfully processed record {}/{}", index + 1, total_records);
                                    let mut successful = successful_clone.lock().await;
                                    *successful += 1;
                                    break; // Success, exit retry loop
                                },
                                Err(e) => {
                                    let school_id = record.get(0).unwrap_or("unknown").to_string();
                                    
                                    if retry_count >= max_retries {
                                        log::debug!(
                                            "Failed processing school {} after {} retries: {}", 
                                            school_id, max_retries, e
                                        );
                                        let mut failed = failed_clone.lock().await;
                                        let mut error_list = errors_clone.lock().await;
                                        *failed += 1;
                                        error_list.push(format!(
                                            "Failed processing school {}: {} (after {} retries)", 
                                            school_id, e, max_retries
                                        ));
                                        break;
                                    }
    
                                    log::debug!(
                                        "Retrying processing for school {} (attempt {}/{}): {}", 
                                        school_id, retry_count + 1, max_retries, e
                                    );
    
                                    // Exponential backoff
                                    let delay = std::time::Duration::from_millis(
                                        100 * 2u64.pow(retry_count as u32)
                                    );
                                    
                                    tokio::time::sleep(delay).await;
                                    retry_count += 1;
                                }
                            }
                        },
                        Err(e) => {
                            if retry_count >= max_retries {
                                log::debug!(
                                    "Failed to get Redis connection for record {} after {} retries: {}", 
                                    index, max_retries, e
                                );
                                let mut failed = failed_clone.lock().await;
                                let mut error_list = errors_clone.lock().await;
                                *failed += 1;
                                error_list.push(format!(
                                    "Redis connection error: {} (after {} retries)", 
                                    e, max_retries
                                ));
                                break;
                            }
    
                            log::debug!(
                                "Retrying Redis connection for record {} (attempt {}/{}): {}", 
                                index, retry_count + 1, max_retries, e
                            );
    
                            // Connection retry with exponential backoff
                            let delay = std::time::Duration::from_millis(
                                100 * 2u64.pow(retry_count as u32)
                            );
                            
                            tokio::time::sleep(delay).await;
                            retry_count += 1;
                        }
                    }
                }
            })
        }).collect();
    
        // Wait for all tasks to complete
        for task in tasks {
            task.await.map_err(|e| format!("Task failed: {}", e))?;
        }
    
        // Retrieve final processing results
        let result = ProcessingResult {
            successful: *successful.lock().await,
            failed: *failed.lock().await,
            errors: errors.lock().await.clone(),
        };
    
        Ok(result)
    }

    // Additional method to retrieve stored records
    pub async fn get_school_account(&self, school_id: &str) -> Result<HashMap<String, String>, String> {
        let mut conn = self.get_async_connection()
            .await
            .map_err(|e| format!("Failed to get async connection: {}", e))?;

        let redis_key = format!("school_account:{}", school_id);
        
        let result: HashMap<String, String> = conn.hgetall(&redis_key)
            .await
            .map_err(|e| format!("Failed to retrieve school account: {}", e))?;

        Ok(result)
    }

    // Method to check if a school account exists
    pub async fn school_account_exists(&self, school_id: &str) -> Result<bool, String> {
        let mut conn = self.get_async_connection()
            .await
            .map_err(|e| format!("Failed to get async connection: {}", e))?;

        let redis_key = format!("school_account:{}", school_id);
        
        let exists: i32 = conn.exists(&redis_key)
            .await
            .map_err(|e| format!("Failed to check school account existence: {}", e))?;

        Ok(exists > 0)
    }

    // Serializable configuration method
    pub fn config(&self) -> ProcessorConfig {
        ProcessorConfig {
            redis_url: self.redis_url.clone(),
            batch_size: self.batch_size,
            max_concurrent_tasks: self.max_concurrent_tasks,
        }
    }

    // Optional method to clear all school account keys
    pub async fn clear_all_school_accounts(&self) -> Result<(), String> {
        let mut conn = self.get_async_connection()
            .await
            .map_err(|e| format!("Failed to get async connection: {}", e))?;

        // Use KEYS to find all school_account keys and then delete them
        let keys: Vec<String> = conn.keys("school_account:*")
            .await
            .map_err(|e| format!("Failed to get keys: {}", e))?;

        if !keys.is_empty() {
            conn.del(keys)
                .await
                .map_err(|e| format!("Failed to delete keys: {}", e))?;
        }

        Ok(())
    }

    // Optional method to count school accounts
    pub async fn count_school_accounts(&self) -> Result<usize, String> {
        let mut conn = self.get_async_connection()
            .await
            .map_err(|e| format!("Failed to get async connection: {}", e))?;

        let keys: Vec<String> = conn.keys("school_account:*")
            .await
            .map_err(|e| format!("Failed to get keys: {}", e))?;

        Ok(keys.len())
    }
}

// Separate serializable configuration struct
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProcessorConfig {
    redis_url: String,
    batch_size: usize,
    max_concurrent_tasks: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub successful: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}