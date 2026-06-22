/**
 * وسيط المصادقة والصلاحيات JWT
 * ==============================
 * يتحقق من رمز الوصول ويحمل بيانات المستخدم والصلاحيات من القاعدة
 */

import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

export const JWT_SECRET = 'diwan-al-masri-secret-key-2026';

/**
 * التحقق من رمز الوصول JWT
 * يحمل بيانات المستخدم الكاملة من القاعدة (بما فيها الصلاحيات المحدثة)
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // تحميل بيانات المستخدم الحالية من القاعدة (لضمان تحديث الصلاحيات فوراً)
    const db = getDb();
    const user = await db.get('SELECT id, username, full_name, role, permissions FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(403).json({ error: 'المستخدم غير موجود' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'رمز الدخول غير صالح أو منتهي الصلاحية' });
  }
}

/**
 * وسيط التحقق من صلاحية محددة
 * المسؤول الرئيسي (super_admin) يملك جميع الصلاحيات تلقائياً
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next();

    if (req.user.permissions[permission]) return next();

    return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذا القسم' });
  };
}

/**
 * وسيط التحقق من كون المستخدم مسؤول رئيسي
 */
export function requireSuperAdmin(req, res, next) {
  if (req.user.role === 'super_admin') return next();
  return res.status(403).json({ error: 'هذا الإجراء متاح للمسؤول الرئيسي فقط' });
}
