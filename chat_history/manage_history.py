import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)
connection = sqlite3.connect("chatbot_sessions.db")
cursor = connection.cursor()
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])


def get_db_connection():
    connection = sqlite3.connect("chatbot_sessions.db")
    connection.row_factory = sqlite3.Row  # Return rows as dictionaries for easier JSON conversion
    return connection

# API to add a new session
@app.route('/add_session', methods=['POST'])
def add_session():
    try:
        user_id = request.json.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO session (user_id) VALUES (?)", (user_id,))
        connection.commit()
        session_id = cursor.lastrowid
        connection.close()

        return jsonify({"message": "Session added successfully", "session_id": session_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API to add a message
@app.route('/add_message', methods=['POST'])
def add_message():
    try:
        data = request.json
        session_id = data.get('session_id')
        content = data.get('content')
        is_from_user = data.get('is_from_user')

        if not all([session_id, content, is_from_user is not None]):
            return jsonify({"error": "session_id, content, and is_from_user are required"}), 400

        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO message (content, is_from_user, session_id) VALUES (?, ?, ?)",
                       (content, is_from_user, session_id))
        connection.commit()
        connection.close()

        return jsonify({"message": "Message added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API to get messages from a session
@app.route('/get_messages/<int:session_id>', methods=['GET'])
def get_messages(session_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT content, is_from_user, created_at FROM message WHERE session_id = ?", (session_id,))
        messages = cursor.fetchall()
        connection.close()

        # Convert rows to a list of dictionaries
        messages_list = [dict(message) for message in messages]
        return jsonify({"messages": messages_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8889, debug=True)