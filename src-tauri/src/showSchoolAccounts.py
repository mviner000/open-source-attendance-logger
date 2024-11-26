import sqlite3

# SQLite database path
DB_PATH = '/home/ssd-ubuntu2/.config/nameoftheapp/latest_db_nov_27v1.db'

def show_tables_and_columns():
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        # Print table names and columns
        if tables:
            print("Tables in the database:")
            for table in tables:
                table_name = table[0]
                print(f"\nTable: {table_name}")
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                if columns:
                    print("Columns:")
                    for column in columns:
                        print(column[1])
                else:
                    print("No columns found.")
        else:
            print("No tables found in the database.")
    
    except Exception as e:
        print(f'Error occurred: {str(e)}')
    
    finally:
        # Close connection
        if conn:
            conn.close()

def show_school_account_details():
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Fetch the count of school accounts
        cursor.execute("SELECT COUNT(*) FROM school_accounts;")
        count = cursor.fetchone()[0]
        print(f"\nTotal number of school accounts: {count}\n")

        # Fetch and print the details of each school account
        cursor.execute("SELECT * FROM school_accounts;")
        accounts = cursor.fetchall()

        if accounts:
            print("Details of each account:")
            for account in accounts:
                id, school_id, first_name, middle_name, last_name, gender, course, department, position, major, year_level, is_active, last_updated = account
                print(f"\nID: {id}")
                print(f"School ID: {school_id}")
                print(f"Name: {first_name} {middle_name} {last_name}")
                print(f"Gender: {gender}")
                print(f"Course: {course}")
                print(f"Department: {department}")
                print(f"Position: {position}")
                print(f"Major: {major}")
                print(f"Year Level: {year_level}")
                print(f"Active: {is_active}")
                print(f"Last Updated: {last_updated}")
        else:
            print("No school accounts found.")

    except Exception as e:
        print(f'Error occurred: {str(e)}')

    finally:
        # Close connection
        if conn:
            conn.close()

if __name__ == "__main__":
    show_tables_and_columns()
    show_school_account_details()
