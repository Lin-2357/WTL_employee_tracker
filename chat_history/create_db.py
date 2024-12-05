import sqlite3

# Connect to SQLite database (or create it if it doesn't exist)
connection = sqlite3.connect("chatbot_sessions.db")

# Create a cursor object to execute SQL commands
cursor = connection.cursor()

# Create the session table
cursor.execute("""
CREATE TABLE IF NOT EXISTS session (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Create the message table
cursor.execute("""
CREATE TABLE IF NOT EXISTS message (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    is_from_user BOOLEAN NOT NULL,
    session_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES session (session_id)
)
""")

# Commit changes and close the connection
connection.commit()
connection.close()

print("Database and tables created successfully.")
