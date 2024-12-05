import csv
import pymysql

# Database connection
db = pymysql.connect(
    host="localhost",
    user="root",
    password="@Ljy20020910",
    database="wtl_employee_tracker"
)

cursor = db.cursor()

# Read the CSV file
csv_file = "data\项目单20241205.csv"  # Path to your CSV file

with open(csv_file, 'r', encoding='utf-8', errors='ignore') as file:
    reader = csv.reader(file)

    for row in reader:
        team_name = row[0].split(' ')[0]

        # Check if the team already exists
        cursor.execute("SELECT name FROM team WHERE name = %s", (team_name,))
        team = cursor.fetchone()

        if team:
            team_id = team[0]
        else:
            # Insert new team
            cursor.execute("INSERT INTO team (uuid, name) VALUES (UUID(), %s)", (team_name,))
            print(team_name)
            team_id = cursor.lastrowid

    db.commit()

print("CSV data has been loaded into the database.")
cursor.close()
db.close()
