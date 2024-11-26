// src/tests/csv_import_tests.rs


#[cfg(test)]
mod tests {
    use std::path::Path;
    use log::{info, error};
    use env_logger;
    use rusqlite::Connection;
    use crate::db::csv_import::CsvValidator;
    use crate::db::csv_transform::CsvTransformer;
    use crate::db::school_accounts::{SchoolAccountRepository, SqliteSchoolAccountRepository, create_school_accounts_table};
    use csv::ReaderBuilder;
    use std::fs::File;
    use crate::db::school_accounts::CreateSchoolAccountRequest;
    use crate::db::csv_transform::TransformError;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to create in-memory database");
        create_school_accounts_table(&conn).expect("Failed to create school_accounts table");
        conn
    }

    #[test]
    fn test_csv_validation() {
        // Initialize logging - only do this once per test run
        let _ = env_logger::try_init();

        // Create a new CSV validator
        let validator = CsvValidator::new();

        // Path to your test CSV file
        let file_path = Path::new("src/test_account.csv");

        // Validate the file
        match validator.validate_file(file_path) {
            Ok(validation_result) => {
                info!("CSV Validation Successful!");
                info!("File Name: {}", validation_result.file_name);
                info!("File Size: {} bytes", validation_result.file_size);
                info!("Total Records: {}", validation_result.total_rows);
                info!("Valid Records: {}", validation_result.validated_rows);
                info!("Invalid Records: {}", validation_result.invalid_rows);

                assert!(validation_result.errors.is_empty(), "No validation errors expected");
                assert_eq!(validation_result.total_rows, 1, "Expected 1 record");
                assert_eq!(validation_result.validated_rows, 1, "Expected 1 valid record");
            },
            Err(errors) => {
                error!("CSV Validation Failed!");
                for error in &errors {
                    error!("Error: {:?}", error);
                }
                panic!("CSV validation failed with {} errors", errors.len());
            }
        }
    }

    #[test]
    fn test_csv_import_and_batch_processing() {
        let _ = env_logger::try_init();

        // Setup in-memory test database
        let conn = setup_test_db();
        
        // Initialize repository
        let repo = SqliteSchoolAccountRepository;

        // Path to test CSV file
        let file_path = Path::new("src/test_account.csv");
        
        // Open and read CSV file
        let file = File::open(file_path).expect("Failed to open CSV file");
        let mut reader = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(file);

        // Get headers and create transformer
        let headers = reader.headers().expect("Failed to read CSV headers").clone();
        let transformer = CsvTransformer::new(&headers);

        // Read all records
        let records: Vec<_> = reader.records()
            .collect::<Result<Vec<_>, _>>()
            .expect("Failed to collect CSV records");

        // Process in batches of 100
        const BATCH_SIZE: usize = 100;
        let batches = batch_transform_records(&transformer, &records, BATCH_SIZE);

        let mut successful_imports = 0;
        let mut failed_imports = 0;

        // Process each batch
        for (batch_index, batch) in batches.iter().enumerate() {
            info!("Processing batch {}", batch_index + 1);

            for result in batch {
                match result {
                    Ok(account_request) => {
                        match repo.create_school_account(&conn, account_request.clone()) {
                            Ok(_) => {
                                successful_imports += 1;
                                info!("Successfully imported school account");
                            },
                            Err(e) => {
                                failed_imports += 1;
                                error!("Failed to import school account, Error: {:?}", e);
                            }
                        }
                    },
                    Err(e) => {
                        failed_imports += 1;
                        error!("Failed to transform record: {:?}", e);
                    }
                }
            }
        }

        // Verify results
        let total_accounts = repo.get_all_school_accounts(&conn)
            .expect("Failed to retrieve accounts");

        info!("Import Summary:");
        info!("Successful imports: {}", successful_imports);
        info!("Failed imports: {}", failed_imports);
        info!("Total accounts in database: {}", total_accounts.len());

        // Assertions
        assert_eq!(successful_imports, records.len(), 
            "Number of successful imports should match number of input records");
        assert_eq!(failed_imports, 0, "Should have no failed imports");
        assert_eq!(total_accounts.len(), records.len(), 
            "Number of accounts in database should match number of input records");

        // Verify data integrity
        let first_record = &records[0];
        let school_id = first_record.get(
            headers.iter()
                .position(|h| h.to_lowercase() == "student_id")
                .expect("No student_id column found")
        ).expect("Failed to get school_id");

        let imported_account = repo.get_school_account_by_school_id(&conn, school_id)
            .expect("Failed to retrieve imported account");

        // Verify some key fields
        assert_eq!(imported_account.school_id, school_id, "School ID mismatch");
        
        // Optional: Add more specific field validations based on your CSV structure
        if let Some(first_name_idx) = headers.iter().position(|h| h.to_lowercase() == "first_name") {
            let expected_first_name = first_record.get(first_name_idx)
                .expect("Failed to get first_name from CSV");
            assert_eq!(imported_account.first_name.unwrap_or_default(), expected_first_name, 
                "First name mismatch");
        }
    }

    // Helper function from csv_transform.rs
    fn batch_transform_records(
        transformer: &CsvTransformer,
        records: &[csv::StringRecord],
        batch_size: usize
    ) -> Vec<Vec<Result<CreateSchoolAccountRequest, TransformError>>> {
        records.chunks(batch_size)
            .map(|chunk| transformer.transform_records(chunk))
            .collect()
    }
}