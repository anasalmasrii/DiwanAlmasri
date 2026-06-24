/**
 * مسارات إدارة المصاريف والصيانة
 * =================================
 * CRUD للمصاريف المالية للديوان
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { getDb, saveDatabase } from '../db.js';

const router = Router();
router.use(authenticateToken);
router.use(requirePermission('expenses'));

/**
 * GET /api/expenses
 * جلب جميع المصاريف مع إمكانية الفلترة
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const { month, year } = req.query;

  try {
    let sql = 'SELECT * FROM expenses';
    const params = [];
    const conditions = [];

    if (month) { conditions.push('month = ?'); params.push(parseInt(month)); }
    if (year) { conditions.push('year = ?'); params.push(parseInt(year)); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY expense_date DESC';

    const expenses = await db.all(sql, params);
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * GET /api/expenses/summary
 * ملخص المصاريف الإجمالية
 */
router.get('/summary', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');
    const total = result ? parseFloat(result.total) : 0;
    res.json({ totalExpenses: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * POST /api/expenses
 * إضافة مصروف جديد
 */
router.post('/', async (req, res) => {
  const db = getDb();
  const { amount, description, expense_date, category } = req.body;

  if (!amount || !description || !expense_date) {
    return res.status(400).json({ error: 'المبلغ والوصف والتاريخ مطلوبة' });
  }

  try {
    const dateObj = new Date(expense_date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const result = await db.run(
      'INSERT INTO expenses (amount, description, expense_date, month, year, category) VALUES (?, ?, ?, ?, ?, ?)',
      [parseFloat(amount), description, expense_date, month, year, category || 'عام']
    );

    if (saveDatabase) saveDatabase();
    const expense = await db.get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid || result.lastID]);
    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء المصروف' });
  }
});

/**
 * PUT /api/expenses/:id
 * تعديل مصروف
 */
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { amount, description, expense_date, category } = req.body;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [Number(id)]);
    if (!existing) return res.status(404).json({ error: 'المصروف غير موجود' });

    const dateObj = new Date(expense_date || existing.expense_date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    await db.run(
      'UPDATE expenses SET amount = ?, description = ?, expense_date = ?, month = ?, year = ?, category = ? WHERE id = ?',
      [
        parseFloat(amount ?? existing.amount),
        description ?? existing.description,
        expense_date ?? existing.expense_date,
        month, year,
        category ?? existing.category,
        Number(id)
      ]
    );

    if (saveDatabase) saveDatabase();
    const updated = await db.get('SELECT * FROM expenses WHERE id = ?', [Number(id)]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في التعديل' });
  }
});

/**
 * DELETE /api/expenses/:id
 * حذف مصروف
 */
router.delete('/:id', async (req, res) => {
  const db = getDb();
  try {
    const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [Number(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'المصروف غير موجود' });

    await db.run('DELETE FROM expenses WHERE id = ?', [Number(req.params.id)]);
    if (saveDatabase) saveDatabase();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

export default router;
