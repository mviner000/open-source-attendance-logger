import sqlite3
import uuid
import random
import string

# SQLite database path
DB_PATH = '/home/ssd-ubuntu2/.config/nameoftheapp/latest_db_nov_27.db'

def generate_random_school_id():
    """Generate a random 8-character alphanumeric string for school_id."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def insert_data():
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # First, create a semester
        semester_id = str(uuid.uuid4())
        semester_label = "2023-2024 Second Semester"
        
        # Insert the semester
        cursor.execute("""
            INSERT INTO semesters (id, label)
            VALUES (?, ?);
        """, (semester_id, semester_label))
        
        print(f"Created semester with ID: {semester_id}")

        # Sample data to insert with more fields
        accounts_to_insert = [
            (str(uuid.uuid4()), generate_random_school_id(), 'John', 'Doe', 'Smith', 
             0, 'Computer Science', 'Engineering', 'Student', 'Software Engineering', '3rd Year', 1, semester_id),
            (str(uuid.uuid4()), generate_random_school_id(), 'Jane', 'Mary', 'Johnson',
             1, 'Information Technology', 'Engineering', 'Student', 'Network Security', '2nd Year', 1, semester_id),
            (str(uuid.uuid4()), generate_random_school_id(), 'Michael', 'Lee', 'Taylor',
             0, 'Civil Engineering', 'Engineering', 'Student', 'Structural Design', '4th Year', 1, semester_id),
            (str(uuid.uuid4()), generate_random_school_id(), 'Emily', 'Anne', 'Brown',
             1, 'Electronics Engineering', 'Engineering', 'Student', 'Robotics', '3rd Year', 1, semester_id)
        ]

        # Insert data into the school_accounts table with all fields
        cursor.executemany("""
            INSERT INTO school_accounts (
                id, school_id, first_name, middle_name, last_name,
                gender, course, department, position, major, year_level,
                is_active, last_updated_semester_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, accounts_to_insert)

        # Commit the transaction
        conn.commit()
        print("Data inserted successfully.")

        # Verify the insertions
        cursor.execute("SELECT COUNT(*) FROM semesters")
        semester_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM school_accounts")
        accounts_count = cursor.fetchone()[0]
        
        print(f"Verification:")
        print(f"- Semesters in database: {semester_count}")
        print(f"- School accounts in database: {accounts_count}")

    except Exception as e:
        print(f'Error occurred: {str(e)}')
    
    finally:
        # Close connection
        if conn:
            conn.close()

if __name__ == "__main__":
    insert_data()