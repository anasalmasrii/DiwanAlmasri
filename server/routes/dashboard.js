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
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  let filterMonth = req.query.month;
  if (!filterMonth) {
    filterMonth = now.getMonth() + 1;
  }

  try {
    // إجمالي الأعضاء النشطين
    const totalResult = await db.get(
      "SELECT COUNT(*) as count FROM members WHERE status = 'active'"
    );
    const totalMembers = totalResult ? parseInt(totalResult.count, 10) : 0;

    // إجمالي أموال الصندوق الكلية (منذ البداية وحتى المسبق)
    const treasuryResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
    const totalTreasury = treasuryResult ? parseFloat(treasuryResult.total) : 0;

    // إجمالي المصاريف الكلية
    const expensesResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM expenses");
    const totalExpenses = expensesResult ? parseFloat(expensesResult.total) : 0;

    let monthlyRevenueSubscriptions = 0;
    let monthlyRevenueContributions = 0;
    let paidSubscriptionsCount = 0;
    let paidContributionsCount = 0;
    let unpaidCount = 0;
    let isAfterDeadline = true; // Always due at the start of the month

    if (filterMonth === 'all') {
      // إحصائيات لجميع الأشهر
      const revSubRes = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_type = 'اشتراك'");
      monthlyRevenueSubscriptions = revSubRes ? parseFloat(revSubRes.total) : 0;

      const revConRes = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_type = 'مساهمة'");
      monthlyRevenueContributions = revConRes ? parseFloat(revConRes.total) : 0;

      const paidSubRes = await db.get("SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE payment_type = 'اشتراك'");
      paidSubscriptionsCount = paidSubRes ? parseInt(paidSubRes.count, 10) : 0;

      const paidConRes = await db.get("SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE payment_type = 'مساهمة'");
      paidContributionsCount = paidConRes ? parseInt(paidConRes.count, 10) : 0;

      const unpaidRes = await db.get(`
        SELECT COUNT(*) as count FROM members m
        WHERE m.id NOT IN (
          SELECT member_id FROM payments WHERE payment_type = 'اشتراك'
        )
      `);
      unpaidCount = unpaidRes ? parseInt(unpaidRes.count, 10) : 0;
      isAfterDeadline = false; // No specific deadline for 'all'
    } else {
      // إحصائيات لشهر محدد
      const monthNum = parseInt(filterMonth, 10);
      
      const revSubRes = await db.get(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'",
        [monthNum, currentYear]
      );
      monthlyRevenueSubscriptions = revSubRes ? parseFloat(revSubRes.total) : 0;

      const revConRes = await db.get(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE month = ? AND year = ? AND payment_type = 'مساهمة'",
        [monthNum, currentYear]
      );
      monthlyRevenueContributions = revConRes ? parseFloat(revConRes.total) : 0;

      const paidSubRes = await db.get(
        "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'",
        [monthNum, currentYear]
      );
      paidSubscriptionsCount = paidSubRes ? parseInt(paidSubRes.count, 10) : 0;

      const paidConRes = await db.get(
        "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE month = ? AND year = ? AND payment_type = 'مساهمة'",
        [monthNum, currentYear]
      );
      paidContributionsCount = paidConRes ? parseInt(paidConRes.count, 10) : 0;

      const unpaidRes = await db.get(`
        SELECT COUNT(*) as count FROM members m
        WHERE m.id NOT IN (
          SELECT member_id FROM payments WHERE month = ? AND year = ? AND payment_type = 'اشتراك'
        )
      `, [monthNum, currentYear]);
      unpaidCount = unpaidRes ? parseInt(unpaidRes.count, 10) : 0;

      // Subscription is due at the beginning of the month
      isAfterDeadline = true;
    }

    const monthlyRevenueTotal = monthlyRevenueSubscriptions + monthlyRevenueContributions;

    res.json({
      totalMembers,
      monthlyRevenueTotal,
      monthlyRevenueSubscriptions,
      monthlyRevenueContributions,
      totalTreasury,
      totalExpenses,
      netTreasury: totalTreasury - totalExpenses,
      paidSubscriptionsCount,
      paidContributionsCount,
      unpaidCount,
      isAfterDeadline,
      currentMonth: filterMonth === 'all' ? 'all' : parseInt(filterMonth, 10),
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
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  let filterMonth = req.query.month;
  if (!filterMonth) {
    filterMonth = now.getMonth() + 1;
  }

  try {
    let defaulters = [];
    let isAfterDeadline = true;
    let deadline = '';

    if (filterMonth === 'all') {
      defaulters = await db.all(`
        SELECT m.*,
          (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments
        FROM members m
        WHERE m.id NOT IN (
          SELECT member_id FROM payments WHERE payment_type = 'اشتراك'
        )
        ORDER BY m.full_name
      `);
      isAfterDeadline = false;
    } else {
      const monthNum = parseInt(filterMonth, 10);
      defaulters = await db.all(`
        SELECT m.*,
          (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments
        FROM members m
        LEFT JOIN payments p
          ON m.id = p.member_id
          AND p.month = ?
          AND p.year = ?
          AND p.payment_type = 'اشتراك'
        WHERE p.id IS NULL
        ORDER BY m.full_name
      `, [monthNum, currentYear]);
      
      isAfterDeadline = true;

      deadline = `${currentYear}-${String(monthNum).padStart(2, '0')}-01`;
    }

    res.json({
      defaulters,
      isAfterDeadline,
      currentMonth: filterMonth === 'all' ? 'all' : parseInt(filterMonth, 10),
      currentYear,
      deadline
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

export default router;
