import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

console.log('Starting payment table migration...');

try {
  db.exec('BEGIN TRANSACTION;');

  // 1. Create new table without UNIQUE constraint
  db.exec(`
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
  `);

  // 2. Copy data
  db.exec(`
    INSERT INTO payments_new (id, member_id, month, year, amount, payment_date, payment_type, notes, created_at)
    SELECT id, member_id, month, year, amount, payment_date, payment_type, notes, created_at FROM payments
  `);

  // 3. Drop old table
  db.exec('DROP TABLE payments;');

  // 4. Rename new table
  db.exec('ALTER TABLE payments_new RENAME TO payments;');

  db.exec('COMMIT;');
  console.log('Migration completed successfully!');
} catch (error) {
  db.exec('ROLLBACK;');
  console.error('Migration failed:', error);
}

db.close();
