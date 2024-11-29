from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import bcrypt

# Flask app and database setup
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@localhost/wtl_employee_tracker'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Activate the application context
with app.app_context():
    # Hash the new password
    new_password = "eric1234"
    employeeID = '6d64aa1b-a6f0-11ef-b88d-30c9abb7563e'
    bcrypt_hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(bcrypt_hashed_password)

    # Update the password in the users table
    with db.engine.connect() as connection:
        connection.execute(
            text("""
            INSERT INTO users (uuid, username, password_hash, employee_id, role)
            VALUES (UUID(), :username, :hashed_password, :employeeid, :level)
            """),
            {"hashed_password": bcrypt_hashed_password, "username": "Eric", "level": "level_3", "employeeid": employeeID}
        )
        connection.commit()
    print("Password updated successfully!")