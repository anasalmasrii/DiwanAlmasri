/**
 * سكربت ترحيل البيانات من SQLite إلى PostgreSQL
 * ============================================
 * يقوم بقراءة البيانات من diwan.db وإدخالها في قاعدة بيانات Neon/Supabase السحابية
 */

import initSqlJs from 'sql.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تأكد من وضع الرابط السحابي الخاص بك هنا قبل التشغيل
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ خطأ: يجب تعيين DATABASE_URL (رابط قاعدة بيانات PostgreSQL السحابية)');
  console.error('مثال (في Windows): set DATABASE_URL=postgres://user:pass@host/db');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, '..', 'diwan.db');

async function migrate() {
  console.log('🚀 بدء عملية الترحيل من SQLite إلى PostgreSQL...');

  // 1. الاتصال بـ PostgreSQL
  const pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // مطلوب لـ Neon و Supabase
  });

  try {
    // التحقق من الاتصال
    await pgPool.query('SELECT 1');
    console.log('✅ تم الاتصال بقاعدة بيانات PostgreSQL بنجاح.');
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة بيانات PostgreSQL:', err.message);
    process.exit(1);
  }

  // 2. إنشاء الجداول في PostgreSQL إذا لم تكن موجودة
  console.log('🛠️ جاري إعداد الجداول...');
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

  // تنظيف الجداول القديمة لتجنب التكرار
  await pgPool.query('TRUNCATE TABLE payments CASCADE');
  await pgPool.query('TRUNCATE TABLE members CASCADE');
  await pgPool.query('TRUNCATE TABLE users CASCADE');

  // 3. قراءة بيانات SQLite
  console.log('📁 جاري قراءة البيانات من diwan.db...');
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ خطأ: ملف diwan.db غير موجود. لا يوجد بيانات للترحيل.');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const sqliteDb = new SQL.Database(fileBuffer);

  // دالة مساعدة لقراءة SQLite
  const getSqliteData = (query) => {
    const result = sqliteDb.exec(query);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  };

  const users = getSqliteData('SELECT * FROM users');
  const members = getSqliteData('SELECT * FROM members');
  const payments = getSqliteData('SELECT * FROM payments');

  console.log(`📊 تم العثور على: ${users.length} مستخدمين، ${members.length} أعضاء، ${payments.length} دفعات.`);

  // 4. إدخال المستخدمين
  console.log('⏳ جاري ترحيل المستخدمين...');
  for (const user of users) {
    await pgPool.query(
      'INSERT INTO users (id, username, password_hash, full_name, role, permissions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, user.username, user.password_hash, user.full_name || 'مسؤول', user.role || 'admin', user.permissions, user.created_at]
    );
  }

  // 5. إدخال الأعضاء
  console.log('⏳ جاري ترحيل الأعضاء...');
  for (const member of members) {
    await pgPool.query(
      'INSERT INTO members (id, full_name, national_id, date_of_birth, phone_number, join_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [member.id, member.full_name, member.national_id, member.date_of_birth, member.phone_number, member.join_date, member.status, member.created_at, member.updated_at]
    );
  }

  // 6. إدخال الدفعات
  console.log('⏳ جاري ترحيل الدفعات...');
  for (const payment of payments) {
    await pgPool.query(
      'INSERT INTO payments (id, member_id, month, year, amount, payment_date, payment_type, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [payment.id, payment.member_id, payment.month, payment.year, payment.amount, payment.payment_date, payment.payment_type, payment.notes, payment.created_at]
    );
  }

  // 7. تحديث Sequences في PostgreSQL
  console.log('⚙️ جاري تحديث العدادات (Sequences)...');
  await pgPool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
  await pgPool.query(`SELECT setval('members_id_seq', (SELECT MAX(id) FROM members))`);
  await pgPool.query(`SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments))`);

  console.log('🎉 تمت عملية الترحيل بنجاح 100%!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ حدث خطأ غير متوقع:', err);
  process.exit(1);
});
