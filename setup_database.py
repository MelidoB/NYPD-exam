import sqlite3
import json

# --- CONFIGURATION ---
JSON_FILE = 'questions.json'
DB_FILE = 'quiz.db'

# --- LOAD DATA FROM JSON ---
print(f"Loading questions from {JSON_FILE}...")
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# --- CONNECT TO DATABASE (will create the file if it doesn't exist) ---
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()
print(f"Connected to database {DB_FILE}.")

# --- CREATE TABLE ---
# We drop the table first to ensure we start fresh each time we run the script.
cursor.execute("DROP TABLE IF EXISTS questions")
cursor.execute("""
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    passage TEXT,
    question TEXT NOT NULL,
    choices TEXT NOT NULL, -- Storing choices as a JSON string
    answer TEXT NOT NULL
);
""")
print("Table 'questions' created successfully.")

# --- INSERT DATA ---
question_count = 0
for section_key, questions_list in data.items():
    for question_data in questions_list:
        # Convert the list of choices into a JSON string to store in a single field
        choices_json = json.dumps(question_data.get("choices", []))
        
        cursor.execute("""
        INSERT INTO questions (section, passage, question, choices, answer)
        VALUES (?, ?, ?, ?, ?)
        """, (
            section_key,
            question_data.get("passage"), # Use .get() for optional fields
            question_data.get("question"),
            choices_json,
            question_data.get("answer")
        ))
        question_count += 1

# --- COMMIT CHANGES AND CLOSE CONNECTION ---
conn.commit()
conn.close()

print("-" * 20)
print(f"Success! Inserted {question_count} questions into {DB_FILE}.")
print("You can now run the main Flask application.")