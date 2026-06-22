/**
 * مسارات الدفعات/الاشتراكات
 * ==========================
 * تسجيل وعرض وحذف الدفعات الشهرية
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticateToken);

/**
 * POST /api/payments
 * تسجيل دفعة شهرية لعضو
 */
router.post('/', async (req, res) => {
  const db = getDb();
  const { member_id, month, year, amount, payment_date, payment_type, notes } = req.body;

  if (!member_id || !month || !year || !amount || !payment_date) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    const member = await db.get('SELECT * FROM members WHERE id = ?', [Number(member_id)]);
    if (!member) {
      return res.status(404).json({ error: 'العضو غير موجود' });
    }

    const pType = payment_type || 'اشتراك';

    if (pType === 'اشتراك') {
      const existing = await db.get(
        "SELECT id FROM payments WHERE member_id = ? AND month = ? AND year = ? AND (payment_type = 'اشتراك' OR payment_type IS NULL)",
        [Number(member_id), Number(month), Number(year)]
      );
      if (existing) {
        return res.status(409).json({ error: 'تم تسجيل اشتراك لهذا العضو في هذا الشهر مسبقاً' });
      }
    }

    const result = await db.run(
      'INSERT INTO payments (member_id, month, year, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Number(member_id), Number(month), Number(year), Number(amount), payment_date, payment_type || 'اشتراك', notes || '']
    );

    const payment = await db.get(`
      SELECT p.*, m.full_name as member_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
    `, [result.lastInsertRowid]);
    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تسجيل الدفعة' });
  }
});

/**
 * GET /api/payments
 * عرض الدفعات مع إمكانية التصفية حسب الشهر/السنة/العضو
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const { month, year, member_id } = req.query;

  let query = `
    SELECT p.*, m.full_name as member_name
    FROM payments p
    JOIN members m ON p.member_id = m.id
  `;
  const conditions = [];
  const params = [];

  if (month) { conditions.push('p.month = ?'); params.push(Number(month)); }
  if (year) { conditions.push('p.year = ?'); params.push(Number(year)); }
  if (member_id) { conditions.push('p.member_id = ?'); params.push(Number(member_id)); }

  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY p.year DESC, p.month DESC, p.payment_date DESC';

  try {
    const payments = await db.all(query, params);
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * DELETE /api/payments/:id
 * حذف دفعة
 */
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM payments WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'الدفعة غير موجودة' });
    }

    await db.run('DELETE FROM payments WHERE id = ?', [Number(id)]);
    res.json({ message: 'تم حذف الدفعة بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * PUT /api/payments/:id
 * تعديل دفعة موجودة
 */
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { amount, payment_date, payment_type, notes } = req.body;

  if (!amount || !payment_date) {
    return res.status(400).json({ error: 'مبلغ الدفعة وتاريخها مطلوبان' });
  }

  try {
    const existing = await db.get('SELECT * FROM payments WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'الدفعة غير موجودة' });
    }

    const pType = payment_type || 'اشتراك';

    if (pType === 'اشتراك' && existing.payment_type !== 'اشتراك') {
      const duplicate = await db.get(
        "SELECT id FROM payments WHERE member_id = ? AND month = ? AND year = ? AND id != ? AND (payment_type = 'اشتراك' OR payment_type IS NULL)",
        [existing.member_id, existing.month, existing.year, Number(id)]
      );
      if (duplicate) {
        return res.status(409).json({ error: 'يوجد اشتراك مسجل مسبقاً لهذا الشهر' });
      }
    }

    await db.run(
      'UPDATE payments SET amount = ?, payment_date = ?, payment_type = ?, notes = ? WHERE id = ?',
      [Number(amount), payment_date, pType, notes || '', Number(id)]
    );

    const payment = await db.get(`
      SELECT p.*, m.full_name as member_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
    `, [Number(id)]);
    
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تعديل الدفعة' });
  }
});

export default router;
