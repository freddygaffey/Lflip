"""Seed the database with a test parent and learner for development."""

import sqlite3
import uuid
import time
import bcrypt
from config import DATABASE

PASSWORD = "test1234"
NOW_MS = int(time.time() * 1000)

parent_id = str(uuid.uuid4())
learner_id = str(uuid.uuid4())
link_id = str(uuid.uuid4())

pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

conn = sqlite3.connect(DATABASE)
conn.execute("PRAGMA foreign_keys = ON")

try:
    conn.execute(
        "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (parent_id, "parent@test.com", pw_hash, "Fill parent (testing)", "parent", NOW_MS),
    )
    conn.execute(
        "INSERT INTO users (id, email, password_hash, name, role, licence_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (learner_id, "learner@test.com", pw_hash, "Fill learner (testing)", "learner", "TEST-L-001", NOW_MS),
    )
    conn.execute(
        "INSERT INTO parent_links (id, parent_id, learner_id, created_at) VALUES (?, ?, ?, ?)",
        (link_id, parent_id, learner_id, NOW_MS),
    )
    conn.commit()
    print("Seeded successfully!")
    print(f"  Parent  : Fill parent (testing)  | email: parent@test.com | password: {PASSWORD}")
    print(f"  Learner : Fill learner (testing)  | email: learner@test.com | password: {PASSWORD}")
    print(f"  They are linked via parent_links.")
except sqlite3.IntegrityError as e:
    print(f"Skipped (already exists?): {e}")
finally:
    conn.close()
