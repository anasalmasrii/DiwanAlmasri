/**
 * مسارات لوحة المعلومات والمتخلفين عن السداد
 * =============================================
 * إحصائيات سريعة + منطق تحديد المتخلفين بناءً على موعد يوم 25
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticateToken);

/**
 * GET /api/dashboard
 * إحصائيات لوحة المعلومات الرئيسية
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  try {
    // إجمالي الأعضاء النشطين
    const totalResult = await db.get(
      "SELECT COUNT(*) as count FROM members WHERE status = 'active'"
    );
    const totalMembers = totalResult ? parseInt(totalResult.count, 10) : 0;

    // إجمالي المبالغ المحصلة هذا الشهر (اشتراكات)
    const revenueSubResult = await db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'",
      [currentMonth, currentYear]
    );
    const monthlyRevenueSubscriptions = revenueSubResult ? parseFloat(revenueSubResult.total) : 0;

    // إجمالي المبالغ المحصلة هذا الشهر (مساهمات)
    const revenueContribResult = await db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE month = ? AND year = ? AND payment_type = 'مساهمة'",
      [currentMonth, currentYear]
    );
    const monthlyRevenueContributions = revenueContribResult ? parseFloat(revenueContribResult.total) : 0;

    // إجمالي الإيرادات
    const monthlyRevenueTotal = monthlyRevenueSubscriptions + monthlyRevenueContributions;

    // عدد الأعضاء الذين سددوا هذا الشهر (اشتراكات فقط)
    const paidResult = await db.get(
      "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'",
      [currentMonth, currentYear]
    );
    const paidSubscriptionsCount = paidResult ? parseInt(paidResult.count, 10) : 0;

    // عدد الأعضاء الذين دفعوا مساهمات هذا الشهر
    const paidContribResult = await db.get(
      "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE month = ? AND year = ? AND payment_type = 'مساهمة'",
      [currentMonth, currentYear]
    );
    const paidContributionsCount = paidContribResult ? parseInt(paidContribResult.count, 10) : 0;

    const unpaidResult = await db.get(`
      SELECT COUNT(*) as count FROM members m
      WHERE m.id NOT IN (
        SELECT member_id FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'
      )
    `, [currentMonth, currentYear]);
    const unpaidCount = unpaidResult ? parseInt(unpaidResult.count, 10) : 0;

    const isAfterDeadline = currentDay > 25;

    res.json({
      totalMembers,
      monthlyRevenueTotal,
      monthlyRevenueSubscriptions,
      monthlyRevenueContributions,
      paidSubscriptionsCount,
      paidContributionsCount,
      unpaidCount,
      isAfterDeadline,
      currentMonth,
      currentYear,
      currentDay
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

/**
 * GET /api/dashboard/defaulters
 * قائمة المتخلفين عن السداد للشهر الحالي
 */
router.get('/defaulters', async (req, res) => {
  const db = getDb();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  try {
    const defaulters = await db.all(`
      SELECT m.*,
        (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments
      FROM members m
      LEFT JOIN payments p
        ON m.id = p.member_id
        AND p.month = ?
        AND p.year = ?
      WHERE p.id IS NULL
      ORDER BY m.full_name
    `, [currentMonth, currentYear]);

    res.json({
      defaulters,
      isAfterDeadline: currentDay > 25,
      currentMonth,
      currentYear,
      deadline: `${currentYear}-${String(currentMonth).padStart(2, '0')}-25`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

export default router;
