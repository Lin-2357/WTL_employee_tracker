import bcrypt
import pymysql

# Database connection
db = pymysql.connect(
    host="localhost",
    user="root",
    password="@Ljy20020910",
    database="wtl_employee_tracker"
)

cursor = db.cursor()

# Query to get all employees
cursor.execute("SELECT uuid, name FROM employee")
employees = cursor.fetchall()

# Query to get all user employee_ids
cursor.execute("SELECT employee_id FROM users")
existing_users = {row[0] for row in cursor.fetchall()}  # Convert to a set for fast lookup

# Default password
default_password = "wtl1234"

for uuid, name in employees:
    if uuid not in existing_users:
        # Generate bcrypt hash for the default password
        password_hash = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Insert new user
        cursor.execute(
            "INSERT INTO users (uuid, username, password_hash, role, employee_id) VALUES (UUID(), %s, %s, %s, %s)",
            (name, password_hash, "level_1", uuid)
        )

# Commit changes to the database
db.commit()

print("User table has been updated.")
cursor.close()
db.close()
