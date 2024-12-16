from flask import Flask, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, JWTManager
from sqlalchemy import text, Date
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import json
import os
from sqlalchemy.ext.automap import automap_base
import requests
import uuid
from datetime import datetime, timedelta
import zoneinfo
import tzlocal
import pymysql

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# SQLite database configuration
basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://root:%40Ljy20020910@localhost/wtl_employee_tracker"  # Change to SQLite
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'dkhfkasdhkjvhxcvhueh439erd7fy87awye79yr79'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=3)
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
    start_date = db.Column(Date, nullable=True)
    end_date = db.Column(Date, nullable=True)

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
        team AS (
            SELECT * FROM team
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
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
        team AS (
            SELECT * FROM team
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
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
        team AS (
            SELECT * FROM team
            WHERE team_id IN (
                SELECT team_id FROM team_assignment
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
    
# @app.before_request
# def refresh_login():
#     db.session.execute(text('PRAGMA foreign_keys=ON'))


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

@app.route('/list', methods=['GET'])
@jwt_required()
def listReport():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    full_query = "SELECT work_hour.uuid AS uuid, name, task_description, hour, is_reversed, is_standardized, start_date, end_date FROM work_hour LEFT JOIN project ON project.uuid = work_hour.project_id WHERE work_hour.employee_id = :employee_id"
    try:
        result = db.session.execute(text(full_query), {"employee_id": employee_id})
        return jsonify([row._asdict() for row in result])
    except Exception as _:
        print(_)
        return "query execution failed", 500

@app.route('/delete', methods=['POST'])
@jwt_required()
def delete():
    user_identity = json.loads(get_jwt_identity())
    full_query = "DELETE FROM work_hour WHERE uuid = :uuid"
    uuid = request.json.get('uuid')
    print(uuid)
    try:
        db.session.execute(text(full_query), {"uuid": uuid})
        db.session.commit()
        return {"success": 'ok'}
    except Exception as _:
        print(_)
        return "query execution failed", 500

@app.route('/query', methods=['POST'])
@jwt_required()
def execute_query():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    role = user_identity['role']
    # User's query
    user_query = request.json.get('query').replace("`", '').replace("julianday", 'TO_DAYS').replace("JULIANDAY", "TO_DAYS")
    if "SELECT" not in user_query:
        return "query invalid", 400

    user_query = user_query[user_query.index('SELECT'):] if 'WITH' not in user_query else (","+user_query[user_query.index('WITH') + 4: ])

    # Dynamically build the CTE query
    full_query = f"{query_masks[role]} {user_query}"
    print(text(full_query))

    # Execute the query securely
    try: 
        result = db.session.execute(text(full_query), {"employee_id": employee_id})
        return jsonify({'result': [row._asdict() for row in result], 'from_user_security_level': role})
    except Exception as _:
        print(_)
        return "query execution failed", 500

@app.route('/create', methods=['GET'])
@jwt_required()
def create_session():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    session = requests.post(
        'http://127.0.0.1:8010/create_session', 
        headers={'Content-Type': 'application/json'}, 
        json={"user_id": employee_id}
    ).text
    return session, 200


@app.route('/validate', methods=['GET'])
@jwt_required()
def validate():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    return {'id': employee_id}, 200


@app.route('/populate', methods=['POST'])
@jwt_required()
def populate_ID():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    role = user_identity['role']
    # User's query
    project_name = request.json.get('name')

    user_query = "SELECT team.name AS id, project.name as name from team JOIN project ON team.uuid = project.team_id WHERE project.name LIKE :given_name OR team.name LIKE :given_name"

    # Dynamically build the CTE query
    full_query = f"{user_query}"
    print(full_query)
    # Execute the query securely
    try: 
        result = db.session.execute(text(full_query), {"employee_id": employee_id, "given_name": "%"+project_name+"%"})
        return jsonify([row._asdict() for row in result])
    except Exception as _:
        return "query execution failed", 500

@app.route('/report', methods=['POST'])
@jwt_required()
def add_report():
    user_identity = json.loads(get_jwt_identity())
    employee_id = user_identity['employee_id']
    role = user_identity['role']
    dates = [int(x) for x in request.json.get('date').split("/")]
    print(dates)
    local_timezone = tzlocal.get_localzone()
    local_timezone_key = local_timezone.key
    local_tz = zoneinfo.ZoneInfo(local_timezone_key)
    now = datetime.now()
    end_date = datetime(dates[0], dates[1], dates[2], now.hour, now.minute, now.second, tzinfo=local_tz).date()
    print(datetime(dates[0], dates[1], dates[2], now.hour, now.minute, now.second, tzinfo=local_tz))
    # User's query
    project_rep = request.json.get("Array_input")
    for i in range(len(project_rep)):
        project_rep[i]['employee_id'] = employee_id
        project_rep[i]['end_date'] = end_date
        project_rep[i]['start_date'] = end_date - timedelta(days=6)
        project_rep[i]['hour'] = float(project_rep[i]['hour'])
        project_rep[i]['uuid'] = str(uuid.uuid4())
        try:
            project_uuid = str(db.session.execute(text("SELECT project.uuid AS uuid FROM project JOIN team ON project.team_id = team.uuid WHERE team.name = :id"), {"id": project_rep[i]['project_id']}).first()[0])
            print(project_uuid)
            project_rep[i]['project_uuid'] = project_uuid
        except Exception as e:
            print(e)
            return "invalid project id: "+project_rep[i]['project_id'], 500

    user_query = """INSERT INTO work_hour (uuid, employee_id, project_id, start_date, end_date, is_reversed, is_standardized, task_description, hour, stage)
    VALUES (:uuid, :employee_id, :project_uuid, :start_date, :end_date, :is_reversed, :is_standardized, :description, :hour, :stage)"""

    # Dynamically build the CTE query
    full_query = f"{user_query}"
    # Execute the query securely
    try:
        for x in project_rep:
            find_team = str(db.session.execute(text("SELECT uuid FROM team where name = :team_name"), {'team_name':x['project_id']}).first()[0])
            find_assignment = db.session.execute(text("SELECT uuid FROM team_assignment where team_id = :team_id AND employee_id = :employee_id"), {'team_id': find_team, "employee_id": x['employee_id']}).first()
            print(find_assignment)
            if (not find_assignment):
                db.session.execute(text("INSERT INTO team_assignment (uuid, team_id, employee_id) VALUES (:uuid, :team_id, :employee_id)"), {"uuid":str(uuid.uuid4()), "team_id":find_team, "employee_id":x['employee_id']})
            x.pop('project_id', None)
            db.session.execute(text(full_query), x)
        db.session.commit()
        return {"ok":True}, 200
    except Exception as _:
        print(_)
        return "submission failed", 500

if __name__ == '__main__':
    print("Tables in SQLAlchemy:", db.metadata.tables.keys())
    app.run(host='0.0.0.0', port=8888, debug=True)
