/**
 * مسارات إدارة الأعضاء
 * ======================
 * CRUD كامل مع حقول جديدة (الرقم الوطني، تاريخ الميلاد)
 * الحالة تُحسب تلقائياً بناءً على السداد
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticateToken);
router.use(requirePermission('members'));

/**
 * GET /api/members
 * عرض جميع الأعضاء مع حالة السداد المحسوبة تلقائياً
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const { q } = req.query;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const baseQuery = `
    SELECT m.*,
      (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id) as total_paid_amount,
      (
        (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', m.join_date) as integer)) * 12 
        + (cast(strftime('%m', 'now') as integer) - cast(strftime('%m', m.join_date) as integer)) 
        + 1 
        - (SELECT COUNT(*) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك')
      ) as months_owed,
      CASE
        WHEN EXISTS (SELECT 1 FROM payments WHERE member_id = m.id AND month = ? AND year = ?)
        THEN 'paid'
        ELSE 'unpaid'
      END as payment_status
    FROM members m
  `;

  try {
    if (q) {
      const pattern = `%${q}%`;
      const members = await db.all(
        baseQuery + ` WHERE m.full_name LIKE ? OR m.phone_number LIKE ? OR m.national_id LIKE ? ORDER BY m.created_at DESC`,
        [currentMonth, currentYear, pattern, pattern, pattern]
      );
      return res.json(members);
    }

    const members = await db.all(baseQuery + ` ORDER BY m.created_at DESC`, [currentMonth, currentYear]);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * POST /api/members
 * إضافة عضو جديد
 */
router.post('/', async (req, res) => {
  const db = getDb();
  const { full_name, national_id, date_of_birth, phone_number } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: 'الاسم الكامل مطلوب' });
  }

  try {
    const result = await db.run(
      'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, join_date) VALUES (?, ?, ?, ?, ?)',
      [full_name, national_id || null, date_of_birth || null, phone_number || null, req.body.join_date || new Date().toISOString().split('T')[0]]
    );

    const member = await db.get('SELECT * FROM members WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء العضو' });
  }
});

/**
 * PUT /api/members/:id
 * تعديل بيانات عضو
 */
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { full_name, national_id, date_of_birth, phone_number } = req.body;
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM members WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'العضو غير موجود' });
    }

    await db.run(
      'UPDATE members SET full_name = ?, national_id = ?, date_of_birth = ?, phone_number = ?, join_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        full_name || existing.full_name,
        national_id !== undefined ? national_id : existing.national_id,
        date_of_birth !== undefined ? date_of_birth : existing.date_of_birth,
        phone_number !== undefined ? phone_number : existing.phone_number,
        req.body.join_date !== undefined ? req.body.join_date : existing.join_date,
        Number(id),
      ]
    );

    const now = new Date();
    const updated = await db.get(`
      SELECT m.*,
        (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id) as total_paid_amount,
        (
          (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', m.join_date) as integer)) * 12 
          + (cast(strftime('%m', 'now') as integer) - cast(strftime('%m', m.join_date) as integer)) 
          + 1 
          - (SELECT COUNT(*) FROM payments WHERE member_id = m.id)
        ) as months_owed,
        CASE
          WHEN EXISTS (SELECT 1 FROM payments WHERE member_id = m.id AND month = ? AND year = ?)
          THEN 'paid' ELSE 'unpaid'
        END as payment_status
      FROM members m WHERE m.id = ?
    `, [now.getMonth() + 1, now.getFullYear(), Number(id)]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * DELETE /api/members/:id
 */
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM members WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'العضو غير موجود' });
    }

    await db.run('DELETE FROM payments WHERE member_id = ?', [Number(id)]);
    await db.run('DELETE FROM members WHERE id = ?', [Number(id)]);
    res.json({ message: 'تم حذف العضو بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * GET /api/members/:id/payments
 */
router.get('/:id/payments', async (req, res) => {
  const db = getDb();
  try {
    const payments = await db.all(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC',
      [Number(req.params.id)]
    );
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * POST /api/members/bulk
 * استيراد أعضاء دفعة واحدة
 */
router.post('/bulk', async (req, res) => {
  const db = getDb();
  const { members: membersList } = req.body;

  if (!membersList || !Array.isArray(membersList) || membersList.length === 0) {
    return res.status(400).json({ error: 'يرجى إرسال قائمة أعضاء صالحة' });
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < membersList.length; i++) {
    const m = membersList[i];
    const rowNum = i + 1;

    if (!m.full_name || !m.full_name.toString().trim()) {
      results.failed++;
      results.errors.push({ row: rowNum, error: 'الاسم الكامل مطلوب' });
      continue;
    }

    try {
      await db.run(
        'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, join_date) VALUES (?, ?, ?, ?, CURRENT_DATE)',
        [
          m.full_name.toString().trim(),
          m.national_id ? m.national_id.toString().trim() : null,
          m.date_of_birth || null,
          m.phone_number ? m.phone_number.toString().trim() : null,
        ]
      );
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ row: rowNum, name: m.full_name, error: err.message });
    }
  }

  res.json({
    message: `تم استيراد ${results.success} عضو بنجاح${results.failed > 0 ? ` (${results.failed} فشل)` : ''}`,
    ...results,
  });
});

export default router;
