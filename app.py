import sqlite3
import json
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
DATABASE_FILE = 'quiz.db'

def get_db_connection():
    """Create a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    # This allows you to access columns by name (like a dictionary)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Serve the homepage."""
    return render_template('index.html')

@app.route('/quiz')
def quiz():
    """Serve the main quiz page."""
    return render_template('quiz.html')

@app.route('/api/sections')
def get_sections():
    """Provide a list of unique sections and their question counts."""
    conn = get_db_connection()
    # Query for distinct sections and the count of questions in each
    sections_data = conn.execute("""
        SELECT section, COUNT(id) as question_count
        FROM questions
        GROUP BY section
    """).fetchall()
    conn.close()
    
    # Format the data for the frontend
    sections = {
        row['section']: {
            # --- THIS IS THE CORRECTED PART ---
            # Replaced the buggy `.replace()` with the correct `.title()` method
            'displayName': row['section'].replace('_', ' ').title(),
            'count': row['question_count']
        } 
        for row in sections_data
    }
    return jsonify(sections)


@app.route('/api/questions')
def get_questions():
    """Provide questions for a specific section."""
    section = request.args.get('section') # Get section from URL parameter
    if not section:
        return jsonify({"error": "Section parameter is required"}), 400

    conn = get_db_connection()
    questions_data = conn.execute(
        "SELECT * FROM questions WHERE section = ?", (section,)
    ).fetchall()
    conn.close()

    # Convert the database rows into a list of dictionaries
    questions_list = []
    for row in questions_data:
        questions_list.append({
            "passage": row["passage"],
            "question": row["question"],
            # Parse the JSON string from the DB back into a Python list
            "choices": json.loads(row["choices"]), 
            "answer": row["answer"]
        })
        
    return jsonify(questions_list)


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)