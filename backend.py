from flask import Flask, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, JWTManager
from sqlalchemy import text
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import json
import os
from sqlalchemy.ext.automap import automap_base
import requests

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# SQLite database configuration
basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'data/wtl_employee_tracker.db')}"  # Change to SQLite
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'dkhfkasdhkjvhxcvhueh439erd7fy87awye79yr79'
db = SQLAlchemy(app)
jwt = JWTManager(app)  # Initialize JWT manager

class Users(db.Model):
    __tablename__ = 'users'
    uuid = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    employee_id = db.Column(db.String(36), db.ForeignKey('employee.uuid'), nullable=False)
    role = db.Column(db.String(20), nullable=False)

class Employee(db.Model):
    __tablename__ = 'employee'
    uuid = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(255), nullable=True)
    alias = db.Column(db.String(255), nullable=True)
    position = db.Column(db.Text, nullable=True)
    subdepartment = db.Column(db.String(255), nullable=True)

class Project(db.Model):
    __tablename__ = 'project'
    uuid = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    team_id = db.Column(db.String(36), db.ForeignKey('team.uuid'), nullable=True)
    address = db.Column(db.Text, nullable=True)
    project_type = db.Column('type', db.String(100), nullable=True)  # Renamed to avoid Python keyword
    area = db.Column(db.Float, nullable=True)
    sign_date = db.Column(db.Date, nullable=True)
    expected_completion_date = db.Column(db.Date, nullable=True)
    revenue = db.Column(db.Numeric(15, 2), nullable=True)
    revenue_note = db.Column(db.Text, nullable=True)
    client_id = db.Column(db.String(36), nullable=True)

class WorkHour(db.Model):
    __tablename__ = 'work_hour'
    uuid = db.Column(db.String(36), primary_key=True)
    is_reversed = db.Column(db.Boolean, default=False)
    task_description = db.Column(db.Text, nullable=True)
    is_standardized = db.Column(db.Boolean, default=True)
    project_id = db.Column(db.String(36), db.ForeignKey('project.uuid'), nullable=True)
    employee_id = db.Column(db.String(36), db.ForeignKey('employee.uuid'), nullable=True)
    hour = db.Column(db.Numeric(10, 2), nullable=True)

class Team(db.Model):
    __tablename__ = 'team'
    uuid = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)

class TeamAssignment(db.Model):
    __tablename__ = 'team_assignment'
    uuid = db.Column(db.String(36), primary_key=True)
    team_id = db.Column(db.String(36), db.ForeignKey('team.uuid'), nullable=True)
    employee_id = db.Column(db.String(36), db.ForeignKey('employee.uuid'), nullable=True)

class Client(db.Model):
    __tablename__ = 'client'
    uuid = db.Column(db.String(36), primary_key=True)
    source = db.Column(db.String(255), nullable=True)
    company = db.Column(db.String(255), nullable=True)
    contact = db.Column(db.String(255), nullable=True)
    background = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)

    
@app.before_request
def enable_foreign_keys():
    db.session.execute(text('PRAGMA foreign_keys=ON'))


# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = Users.query.filter_by(username=data['username']).first()
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        identity = json.dumps({'employee_id': str(user.employee_id), 'role': str(user.role)})
        access_token = create_access_token(identity=identity)
        return jsonify({'access_token': access_token}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/query', methods=['POST'])
@jwt_required()
def execute_query():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    role = user_identity['role']
    
    # User's query
    user_query = request.json.get('query').replace("`", '')
    user_query = user_query[user_query.index('SELECT'):] if 'WITH' not in user_query else user_query[user_query.index('WITH') + 4]

    # Define base CTEs
    query_masks = {
        "level_1": """
        WITH 
        employee AS (
            SELECT * FROM employee
            WHERE uuid = :employee_id
        ),
        team_assignment AS (
            SELECT * FROM team_assignment
            WHERE employee_id = :employee_id
        ),
        project AS (
            SELECT * FROM project
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
            )
        ),
        client AS (
            SELECT * FROM client
            WHERE uuid IN (
                SELECT client_id FROM project
            )
        )
        """,
        "level_2": """
        WITH 
        employee AS (
            SELECT * FROM employee
            WHERE uuid IN (
                SELECT employee_id
                FROM team_assignment
                WHERE team_id IN (
                    SELECT team_id
                    FROM team_assignment
                    WHERE employee_id = :employee_id
                )
            )
        ),
        team_assignment AS (
            SELECT * FROM team_assignment
            WHERE team_id IN (
                SELECT team_id
                FROM team_assignment
                WHERE employee_id = :employee_id
            )
        ),
        project AS (
            SELECT * FROM project
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
            )
        ),
        client AS (
            SELECT * FROM client
            WHERE uuid IN (
                SELECT client_id FROM project
            )
        )
        """,
        "level_3": """
        WITH 
        employee AS (
            SELECT * FROM employee
            WHERE department = (
                SELECT department
                FROM employee
                WHERE uuid = :employee_id
            )
        ),
        team_assignment AS (
            SELECT * FROM team_assignment
            WHERE employee_id IN (
                SELECT uuid FROM employee
            )
        ),
        project AS (
            SELECT * FROM project
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
            )
        ),
        client AS (
            SELECT * FROM client
            WHERE uuid IN (
                SELECT client_id FROM project
            )
        )
        """,
        "level_4": """WITH _ AS (SELECT 1)"""  # Admin sees all
    }

    # Dynamically build the CTE query
    full_query = f"{query_masks[role]} {user_query}"
    print(text(full_query))

    # Execute the query securely
    result = db.session.execute(text(full_query), {"employee_id": employee_id})
    return jsonify([row._asdict() for row in result])

@app.route('/create', methods=['GET'])
@jwt_required()
def create_session():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    session = requests.post(
        'http://127.0.0.1:8010/create_session', 
        headers={'Content-Type': 'application/json'}, 
        json={"user_id": employee_id}
    )
    return session, 200

if __name__ == '__main__':
    print("Tables in SQLAlchemy:", db.metadata.tables.keys())
    app.run(host='0.0.0.0', port=8888, debug=True)
