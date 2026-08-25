import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// جلب جميع الذمم
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const debts = await db.all("SELECT * FROM debts ORDER BY status DESC, debt_date DESC");
    res.json(debts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الذمم' });
  }
});

// إضافة ذمة جديدة
router.post('/', async (req, res) => {
  try {
    const { amount, description, creditor_name, debt_date } = req.body;
    if (!amount || !description || !debt_date) {
      return res.status(400).json({ error: 'يرجى تعبئة الحقول المطلوبة' });
    }

    const db = getDb();
    await db.run(
      "INSERT INTO debts (amount, description, creditor_name, debt_date, status) VALUES (?, ?, ?, ?, 'unpaid')",
      [amount, description, creditor_name || null, debt_date]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة الذمة' });
  }
});

// تعديل حالة السداد (دفع الذمة)
router.put('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_date } = req.body;
    
    const db = getDb();
    await db.run(
      "UPDATE debts SET status = ?, paid_date = ? WHERE id = ?",
      [status, status === 'paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير حالة الذمة' });
  }
});

// تعديل تفاصيل الذمة
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, creditor_name, debt_date } = req.body;
    
    if (!amount || !description || !debt_date) {
      return res.status(400).json({ error: 'يرجى تعبئة الحقول المطلوبة' });
    }

    const db = getDb();
    await db.run(
      "UPDATE debts SET amount = ?, description = ?, creditor_name = ?, debt_date = ? WHERE id = ?",
      [amount, description, creditor_name || null, debt_date, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تعديل الذمة' });
  }
});

// حذف الذمة
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.run("DELETE FROM debts WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الذمة' });
  }
});

export default router;
