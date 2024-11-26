import sqlite3
import uuid
import random
import string

# SQLite database path
DB_PATH = '/home/ssd-ubuntu2/.config/nameoftheapp/latest_db_nov_27v1.db'

def generate_random_school_id():
    """Generate a random 8-character alphanumeric string for school_id."""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def insert_school_accounts():
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Sample data to insert (id as UUID and school_id as random string)
        accounts_to_insert = [
            (str(uuid.uuid4()), generate_random_school_id(), 'John', 'Doe', 'Smith'),
            (str(uuid.uuid4()), generate_random_school_id(), 'Jane', 'Mary', 'Johnson'),
            (str(uuid.uuid4()), generate_random_school_id(), 'Michael', 'Lee', 'Taylor'),
            (str(uuid.uuid4()), generate_random_school_id(), 'Emily', 'Anne', 'Brown')
        ]

        # Insert data into the school_accounts table
        cursor.executemany("""
            INSERT INTO school_accounts (id, school_id, first_name, middle_name, last_name)
            VALUES (?, ?, ?, ?, ?);
        """, accounts_to_insert)

        # Commit the transaction
        conn.commit()
        print("Data inserted successfully.")

    except Exception as e:
        print(f'Error occurred: {str(e)}')
    
    finally:
        # Close connection
        if conn:
            conn.close()

if __name__ == "__main__":
    insert_school_accounts()
