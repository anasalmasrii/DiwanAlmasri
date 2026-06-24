/**
 * إعداد قاعدة البيانات (يدعم SQLite للتطوير و PostgreSQL للإنتاج)
 * ==============================================================
 */

import initSqlJs from 'sql.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'diwan.db');

let sqliteDb;
let pgPool;
const isPg = !!process.env.DATABASE_URL;

/**
 * الحصول على أسماء أعمدة جدول (SQLite فقط)
 */
function getColumnNames(tableName) {
  if (isPg) return [];
  const result = sqliteDb.exec(`PRAGMA table_info(${tableName})`);
  if (result.length === 0) return [];
  return result[0].values.map(row => row[1]);
}

/**
 * تهيئة قاعدة البيانات
 */
export async function initDatabase() {
  if (isPg) {
    console.log('🔗 جاري الاتصال بقاعدة بيانات PostgreSQL...');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // إنشاء الجداول في PostgreSQL
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL DEFAULT 'مسؤول',
        role VARCHAR(50) CHECK(role IN ('super_admin', 'admin')) DEFAULT 'admin',
        permissions TEXT DEFAULT '{"dashboard":true,"members":true,"payments":true,"defaulters":true}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        national_id VARCHAR(50),
        date_of_birth DATE,
        phone_number VARCHAR(50),
        join_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date DATE NOT NULL,
        payment_type VARCHAR(50) DEFAULT 'اشتراك',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        expense_date DATE NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        category VARCHAR(100) DEFAULT 'عام',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // التحقق من وجود المسؤول الرئيسي
    const { rows } = await pgPool.query("SELECT id FROM users WHERE username = 'admin'");
    if (rows.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await pgPool.query(
        "INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES ($1, $2, $3, $4, $5)",
        ['admin', hash, 'المسؤول الرئيسي', 'super_admin', JSON.stringify({ dashboard: true, members: true, payments: true, defaulters: true, expenses: true })]
      );
      console.log('✅ تم إنشاء المسؤول الرئيسي في PostgreSQL (admin / admin123)');
    } else {
      await pgPool.query("UPDATE users SET role = 'super_admin' WHERE username = 'admin' AND role != 'super_admin'");
    }

    console.log('✅ تم تهيئة قاعدة بيانات PostgreSQL بنجاح');
    return pgPool;
  }

  // SQLite Flow
  console.log('📁 جاري تهيئة قاعدة بيانات SQLite المحلية...');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  sqliteDb.run('PRAGMA foreign_keys = ON');

  // إنشاء الجداول
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT 'مسؤول',
      role TEXT CHECK(role IN ('super_admin', 'admin')) DEFAULT 'admin',
      permissions TEXT DEFAULT '{"dashboard":true,"members":true,"payments":true,"defaulters":true}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      national_id TEXT,
      date_of_birth DATE,
      phone_number TEXT,
      join_date DATE NOT NULL DEFAULT (date('now')),
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS payments (
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

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      expense_date DATE NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      category TEXT DEFAULT 'عام',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  runMigrations();

  const existingAdmin = getDbSync().get("SELECT id FROM users WHERE username = 'admin'");
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 10);
    getDbSync().run(
      "INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)",
      ['admin', hash, 'المسؤول الرئيسي', 'super_admin', JSON.stringify({ dashboard: true, members: true, payments: true, defaulters: true })]
    );
    console.log('✅ تم إنشاء المسؤول الرئيسي (admin / admin123)');
  } else {
    getDbSync().run("UPDATE users SET role = 'super_admin' WHERE username = 'admin' AND role != 'super_admin'");
  }

  saveDatabase();
  console.log('✅ تم تهيئة قاعدة بيانات SQLite بنجاح');
  return sqliteDb;
}

function runMigrations() {
  if (isPg) return;
  const userCols = getColumnNames('users');
  if (!userCols.includes('full_name')) { try { sqliteDb.run("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT 'مسؤول'"); } catch(e) {} }
  if (!userCols.includes('role')) { try { sqliteDb.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'"); } catch(e) {} }
  if (!userCols.includes('permissions')) { try { sqliteDb.run("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{\"dashboard\":true,\"members\":true,\"payments\":true,\"defaulters\":true}'"); } catch(e) {} }

  const memberCols = getColumnNames('members');
  if (!memberCols.includes('national_id')) { try { sqliteDb.run("ALTER TABLE members ADD COLUMN national_id TEXT"); } catch(e) {} }
  if (!memberCols.includes('date_of_birth')) { try { sqliteDb.run("ALTER TABLE members ADD COLUMN date_of_birth DATE"); } catch(e) {} }
  if (!memberCols.includes('phone_number')) { try { sqliteDb.run("ALTER TABLE members ADD COLUMN phone_number TEXT"); } catch(e) {} }

  const paymentCols = getColumnNames('payments');
  if (!paymentCols.includes('payment_type')) { try { sqliteDb.run("ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'اشتراك'"); } catch(e) {} }
  if (!paymentCols.includes('notes')) { try { sqliteDb.run("ALTER TABLE payments ADD COLUMN notes TEXT"); } catch(e) {} }

  saveDatabase();
}

export function saveDatabase() {
  if (!isPg && sqliteDb) {
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * تحويل استعلامات SQLite إلى PostgreSQL ديناميكياً
 */
function convertSqlForPg(sql) {
  let count = 0;
  let converted = sql.replace(/\?/g, () => {
    count++;
    return `$${count}`;
  });

  // Convert strftime logic
  converted = converted.replace(/cast\(strftime\('%Y',\s*'now'\)\s*as\s*integer\)/gi, "EXTRACT(YEAR FROM CURRENT_DATE)::integer");
  converted = converted.replace(/cast\(strftime\('%m',\s*'now'\)\s*as\s*integer\)/gi, "EXTRACT(MONTH FROM CURRENT_DATE)::integer");
  converted = converted.replace(/cast\(strftime\('%Y',\s*([a-zA-Z0-9_\.]+)\)\s*as\s*integer\)/gi, "EXTRACT(YEAR FROM $1)::integer");
  converted = converted.replace(/cast\(strftime\('%m',\s*([a-zA-Z0-9_\.]+)\)\s*as\s*integer\)/gi, "EXTRACT(MONTH FROM $1)::integer");

  // Convert date('now')
  converted = converted.replace(/date\('now'\)/gi, "CURRENT_DATE");
  
  // STRFTIME fallback
  converted = converted.replace(/strftime\('%Y',\s*'now'\)/gi, "EXTRACT(YEAR FROM CURRENT_DATE)");
  converted = converted.replace(/strftime\('%m',\s*'now'\)/gi, "EXTRACT(MONTH FROM CURRENT_DATE)");
  
  return converted;
}

/**
 * دالة متزامنة للاستخدام الداخلي في التهيئة (لـ SQLite فقط)
 */
function getDbSync() {
  return {
    all(sql, params = []) {
      const result = sqliteDb.exec(sql, params);
      if (result.length === 0) return [];
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    },
    get(sql, params = []) {
      const rows = this.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    run(sql, params = []) {
      sqliteDb.run(sql, params);
      const lastId = sqliteDb.exec('SELECT last_insert_rowid() as id');
      const changes = sqliteDb.exec('SELECT changes() as cnt');
      saveDatabase();
      return {
        lastInsertRowid: lastId[0]?.values[0]?.[0] || 0,
        changes: changes[0]?.values[0]?.[0] || 0,
      };
    }
  };
}

/**
 * الواجهة الموحدة للتواصل مع قاعدة البيانات (تستخدم Async/Await)
 */
export function getDb() {
  if (isPg) {
    return {
      async all(sql, params = []) {
        try {
          const { rows } = await pgPool.query(convertSqlForPg(sql), params);
          return rows;
        } catch (err) {
          console.error('PG DB Error (all):', err.message, sql);
          throw err;
        }
      },
      async get(sql, params = []) {
        const rows = await this.all(sql, params);
        return rows.length > 0 ? rows[0] : null;
      },
      async run(sql, params = []) {
        try {
          const pgSql = convertSqlForPg(sql);
          let runSql = pgSql;
          if (runSql.trim().toUpperCase().startsWith('INSERT') && !runSql.toUpperCase().includes('RETURNING')) {
            runSql = runSql + ' RETURNING id';
          }
          
          const res = await pgPool.query(runSql, params);
          return {
            lastInsertRowid: res.rows && res.rows.length > 0 ? res.rows[0].id : 0,
            changes: res.rowCount || 0,
          };
        } catch (err) {
          console.error('PG DB Error (run):', err.message, sql);
          throw err;
        }
      }
    };
  }

  // SQLite Async Wrapper
  const syncDb = getDbSync();
  return {
    async all(sql, params = []) { return syncDb.all(sql, params); },
    async get(sql, params = []) { return syncDb.get(sql, params); },
    async run(sql, params = []) { return syncDb.run(sql, params); }
  };
}

export default { initDatabase, getDb, saveDatabase };
