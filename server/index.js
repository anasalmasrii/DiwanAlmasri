/**
 * خادم Express الرئيسي
 * ====================
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// المسارات
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ديوان المصري - الخادم يعمل بنجاح' });
});

// خدمة ملفات الواجهة الأمامية
app.use(express.static(path.join(__dirname, '../client/dist')));

// التعامل مع مسارات React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🏛️  ديوان المصري - الخادم يعمل على المنفذ ${PORT}`);
      console.log(`   http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ خطأ في بدء الخادم:', err);
    process.exit(1);
  }
}

start();
