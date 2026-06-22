/**
 * مسارات إدارة المسؤولين
 * ========================
 * CRUD كامل لأعضاء الهيئة الإدارية (متاح للمسؤول الرئيسي فقط)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * GET /api/users
 * عرض جميع المسؤولين
 */
router.get('/', async (req, res) => {
  const db = getDb();
  try {
    const users = await db.all(
      'SELECT id, username, full_name, role, permissions, created_at FROM users ORDER BY role DESC, created_at ASC'
    );

    const result = users.map(u => ({
      ...u,
      permissions: JSON.parse(u.permissions || '{}'),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * POST /api/users
 * إنشاء مسؤول جديد (عضو هيئة إدارية)
 */
router.post('/', async (req, res) => {
  const { username, password, full_name, permissions } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور والاسم الكامل مطلوبون' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
  }

  const db = getDb();

  try {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const perms = JSON.stringify(permissions || {
      dashboard: true, members: true, payments: true, defaulters: true,
    });

    const result = await db.run(
      'INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)',
      [username, hash, full_name, 'admin', perms]
    );

    const user = await db.get(
      'SELECT id, username, full_name, role, permissions, created_at FROM users WHERE id = ?',
      [result.lastInsertRowid]
    );

    res.status(201).json({
      ...user,
      permissions: JSON.parse(user?.permissions || '{}'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء المسؤول' });
  }
});

/**
 * PUT /api/users/:id
 * تعديل بيانات مسؤول (الاسم، اسم المستخدم، الصلاحيات)
 */
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { username, full_name, permissions } = req.body;

  try {
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'المسؤول غير موجود' });
    }

    if (existing.role === 'super_admin' && Number(id) !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكن تعديل المسؤول الرئيسي' });
    }

    if (username && username !== existing.username) {
      const dup = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, Number(id)]);
      if (dup) {
        return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });
      }
    }

    const perms = permissions ? JSON.stringify(permissions) : existing.permissions;

    await db.run(
      'UPDATE users SET username = ?, full_name = ?, permissions = ? WHERE id = ?',
      [
        username || existing.username,
        full_name || existing.full_name,
        perms,
        Number(id),
      ]
    );

    const updated = await db.get(
      'SELECT id, username, full_name, role, permissions, created_at FROM users WHERE id = ?',
      [Number(id)]
    );

    res.json({
      ...updated,
      permissions: JSON.parse(updated?.permissions || '{}'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * PUT /api/users/:id/password
 * إعادة تعيين كلمة مرور مسؤول
 */
router.put('/:id/password', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
  }

  try {
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'المسؤول غير موجود' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, Number(id)]);

    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * DELETE /api/users/:id
 * حذف مسؤول
 */
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!existing) {
      return res.status(404).json({ error: 'المسؤول غير موجود' });
    }

    if (existing.role === 'super_admin') {
      return res.status(403).json({ error: 'لا يمكن حذف المسؤول الرئيسي' });
    }

    if (Number(id) === req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك حذف حسابك الخاص' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [Number(id)]);
    res.json({ message: 'تم حذف المسؤول بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

export default router;
