import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'diwan.db')

print('Connecting to database:', db_path)
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute('BEGIN TRANSACTION;')

    # Create new table
    cursor.execute("""
    CREATE TABLE payments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_type TEXT DEFAULT 'اشتراك',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
    """)

    # Copy data
    cursor.execute("""
    INSERT INTO payments_new (id, member_id, month, year, amount, payment_date, payment_type, notes, created_at)
    SELECT id, member_id, month, year, amount, payment_date, payment_type, notes, created_at FROM payments
    """)

    # Drop old and rename
    cursor.execute('DROP TABLE payments;')
    cursor.execute('ALTER TABLE payments_new RENAME TO payments;')

    conn.commit()
    print('Migration successful!')
except Exception as e:
    conn.rollback()
    print('Migration failed:', str(e))
finally:
    conn.close()
