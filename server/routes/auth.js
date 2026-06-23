/**
 * مسارات المصادقة
 * ================
 * تسجيل الدخول + التحقق + تغيير كلمة المرور
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * تسجيل الدخول — يرجع JWT مع بيانات المستخدم والصلاحيات
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const cleanUsername = username.trim();

  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [cleanUsername]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}'),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

/**
 * GET /api/auth/me
 * التحقق من صلاحية الجلسة وإرجاع بيانات المستخدم المحدثة
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get(
      'SELECT id, username, full_name, role, permissions, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    res.json({
      ...user,
      permissions: JSON.parse(user.permissions || '{}'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * PUT /api/auth/password
 * تغيير كلمة المرور الخاصة (يتطلب كلمة المرور الحالية)
 */
router.put('/password', authenticateToken, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
  }

  if (new_password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' });
  }

  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * PUT /api/auth/profile
 * تعديل الملف الشخصي (الاسم)
 */
router.put('/profile', authenticateToken, async (req, res) => {
  const { full_name } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'الاسم مطلوب' });
  }

  try {
    const db = getDb();
    await db.run('UPDATE users SET full_name = ? WHERE id = ?', [full_name.trim(), req.user.id]);

    res.json({ message: 'تم تحديث الملف الشخصي بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

export default router;
