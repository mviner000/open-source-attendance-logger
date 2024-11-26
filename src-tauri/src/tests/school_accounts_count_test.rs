use rusqlite::{Connection, Result};
use crate::db::school_accounts::{
    create_school_accounts_table, 
    SchoolAccountRepository, 
    SqliteSchoolAccountRepository, 
    CreateSchoolAccountRequest,
    Gender,
    Semester
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_school_accounts_count() -> Result<()> {
        // Create an in-memory database for testing
        let conn = Connection::open_in_memory()?;

        // Create the school_accounts table
        create_school_accounts_table(&conn)?;

        // Initialize the repository
        let repo = SqliteSchoolAccountRepository;

        // Create some sample school accounts
        let sample_accounts = vec![
            CreateSchoolAccountRequest {
                school_id: "ST001".to_string(),
                first_name: Some("John".to_string()),
                last_name: Some("Doe".to_string()),
                gender: Some(Gender::Male),
                course: Some("Computer Science".to_string()),
                department: Some("Engineering".to_string()),
                ..Default::default()
            },
            CreateSchoolAccountRequest {
                school_id: "ST002".to_string(),
                first_name: Some("Jane".to_string()),
                last_name: Some("Smith".to_string()),
                gender: Some(Gender::Female),
                course: Some("Mathematics".to_string()),
                department: Some("Science".to_string()),
                ..Default::default()
            },
        ];

        // Add sample accounts to the database
        for account in sample_accounts {
            repo.create_school_account(&conn, account)?;
        }

        // Get all school accounts and verify the count
        let all_accounts = repo.get_all_school_accounts(&conn)?;
        
        // Assert that we have exactly 2 accounts
        assert_eq!(
            all_accounts.len(), 
            2, 
            "Expected 2 school accounts, but found {}",
            all_accounts.len()
        );

        // Optional: Print out the accounts for debugging
        for account in &all_accounts {
            println!(
                "Account - ID: {}, School ID: {}, Name: {} {}",
                account.id,
                account.school_id,
                account.first_name.clone().unwrap_or_default(),
                account.last_name.clone().unwrap_or_default()
            );
        }

        Ok(())
    }
}