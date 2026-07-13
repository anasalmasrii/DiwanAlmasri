/**
 * مسارات المساهمات الخارجية (من خارج الأعضاء)
 */
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticateToken);
router.use(requirePermission('members'));

/**
 * GET /api/external-contributions
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const { q, month, year } = req.query;
  try {
    let query = 'SELECT * FROM external_contributions';
    const params = [];
    const conditions = [];

    if (q) {
      conditions.push("contributor_name LIKE ?");
      params.push(`%${q}%`);
    }

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      conditions.push("contribution_date >= ? AND contribution_date < ?");
      params.push(start, end);
    } else if (year) {
      const y = parseInt(year);
      conditions.push("contribution_date >= ? AND contribution_date < ?");
      params.push(`${y}-01-01`, `${y + 1}-01-01`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY contribution_date DESC';

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * GET /api/external-contributions/total
 */
router.get('/total', async (req, res) => {
  const db = getDb();
  const { month, year } = req.query;
  try {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM external_contributions';
    const params = [];
    const conditions = [];

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      conditions.push("contribution_date >= ? AND contribution_date < ?");
      params.push(start, end);
    } else if (year) {
      const y = parseInt(year);
      conditions.push("contribution_date >= ? AND contribution_date < ?");
      params.push(`${y}-01-01`, `${y + 1}-01-01`);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    const row = await db.get(query, params);
    res.json(row || { total: 0, count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * POST /api/external-contributions
 */
router.post('/', async (req, res) => {
  const db = getDb();
  const { contributor_name, amount, contribution_date, notes } = req.body;
  if (!contributor_name || !amount || !contribution_date) {
    return res.status(400).json({ error: 'الاسم والمبلغ والتاريخ مطلوبة' });
  }
  try {
    const result = await db.run(
      'INSERT INTO external_contributions (contributor_name, amount, contribution_date, notes) VALUES (?, ?, ?, ?)',
      [contributor_name.trim(), parseFloat(amount), contribution_date, notes || null]
    );
    const created = await db.get('SELECT * FROM external_contributions WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * PUT /api/external-contributions/:id
 */
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { contributor_name, amount, contribution_date, notes } = req.body;
  try {
    const existing = await db.get('SELECT * FROM external_contributions WHERE id = ?', [Number(id)]);
    if (!existing) return res.status(404).json({ error: 'المساهمة غير موجودة' });

    await db.run(
      'UPDATE external_contributions SET contributor_name = ?, amount = ?, contribution_date = ?, notes = ? WHERE id = ?',
      [
        contributor_name || existing.contributor_name,
        amount !== undefined ? parseFloat(amount) : existing.amount,
        contribution_date || existing.contribution_date,
        notes !== undefined ? notes : existing.notes,
        Number(id),
      ]
    );
    const updated = await db.get('SELECT * FROM external_contributions WHERE id = ?', [Number(id)]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * DELETE /api/external-contributions/:id
 */
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  try {
    const existing = await db.get('SELECT * FROM external_contributions WHERE id = ?', [Number(id)]);
    if (!existing) return res.status(404).json({ error: 'المساهمة غير موجودة' });
    await db.run('DELETE FROM external_contributions WHERE id = ?', [Number(id)]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

export default router;
