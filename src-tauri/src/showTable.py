import sqlite3

# SQLite database path
DB_PATH = '/home/ssd-ubuntu2/.config/nameoftheapp/latest_db_nov_27.db'

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

if __name__ == "__main__":
    show_tables_and_columns()
