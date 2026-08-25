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

    // إجمالي المصاريف الكلية
    const expensesResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM expenses");
    const totalExpenses = expensesResult ? parseFloat(expensesResult.total) : 0;

    // إجمالي المساهمات الخارجية الكلية
    const extContribResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM external_contributions");
    const totalExternalContributions = extContribResult ? parseFloat(extContribResult.total) : 0;
    const externalContributorsCount = extContribResult ? parseInt(extContribResult.count, 10) : 0;

    // إجمالي أموال الصندوق الكلية (تشمل مدفوعات الأعضاء والمساهمات الخارجية)
    const treasuryResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
    const totalTreasury = (treasuryResult ? parseFloat(treasuryResult.total) : 0) + totalExternalContributions;

    // إجمالي الذمم غير المسددة
    let totalUnpaidDebts = 0;
    try {
      const unpaidDebtsResult = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE status = 'unpaid'");
      totalUnpaidDebts = unpaidDebtsResult ? parseFloat(unpaidDebtsResult.total) : 0;
    } catch (e) {
      console.error("Error fetching debts:", e);
    }

    let monthlyRevenueSubscriptions = 0;
    let monthlyRevenueContributions = 0;
    let monthlyExternalContributions = 0;
    let paidSubscriptionsCount = 0;
    let paidContributionsCount = 0;
    let unpaidCount = 0;
    let isAfterDeadline = currentDay > 25; // Default for specific month

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
      monthlyExternalContributions = totalExternalContributions;
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

      // Update isAfterDeadline based on if the selected month is past
      const currentRealMonth = now.getMonth() + 1;
      if (monthNum < currentRealMonth) isAfterDeadline = true;
      else if (monthNum > currentRealMonth) isAfterDeadline = false;
      else isAfterDeadline = currentDay > 25;

      const extMonthlyRes = await db.get(
        "SELECT COALESCE(SUM(amount), 0) as total FROM external_contributions WHERE cast(strftime('%m', contribution_date) as integer) = ? AND cast(strftime('%Y', contribution_date) as integer) = ?",
        [monthNum, currentYear]
      );
      monthlyExternalContributions = extMonthlyRes ? parseFloat(extMonthlyRes.total) : 0;
    }

    const monthlyRevenueTotal = monthlyRevenueSubscriptions + monthlyRevenueContributions + monthlyExternalContributions;

    res.json({
      totalMembers,
      monthlyRevenueTotal,
      monthlyRevenueSubscriptions,
      monthlyRevenueContributions,
      totalTreasury,
      totalExpenses,
      totalExternalContributions,
      externalContributorsCount,
      totalUnpaidDebts,
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
    let isAfterDeadline = currentDay > 25;
    let deadline = '';

    if (filterMonth === 'all') {
      defaulters = await db.all(`
        SELECT * FROM (
          SELECT m.*,
            (
              (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', m.join_date) as integer)) * 12 
              + (cast(strftime('%m', 'now') as integer) - cast(strftime('%m', m.join_date) as integer)) 
              + 1 
              - (SELECT COUNT(*) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك')
            ) as months_owed
          FROM members m
          WHERE m.status = 'active'
        )
        WHERE months_owed > 0
        ORDER BY full_name
      `);
      isAfterDeadline = false;
    } else {
      const monthNum = parseInt(filterMonth, 10);
      defaulters = await db.all(`
        SELECT m.*,
          (
            (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', m.join_date) as integer)) * 12 
            + (cast(strftime('%m', 'now') as integer) - cast(strftime('%m', m.join_date) as integer)) 
            + 1 
            - (SELECT COUNT(*) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك')
          ) as months_owed
        FROM members m
        LEFT JOIN payments p
          ON m.id = p.member_id
          AND p.month = ?
          AND p.year = ?
          AND p.payment_type = 'اشتراك'
        WHERE m.status = 'active' AND p.id IS NULL
        ORDER BY m.full_name
      `, [monthNum, currentYear]);
      
      const currentRealMonth = now.getMonth() + 1;
      if (monthNum < currentRealMonth) isAfterDeadline = true;
      else if (monthNum > currentRealMonth) isAfterDeadline = false;
      else isAfterDeadline = currentDay > 25;

      deadline = `${currentYear}-${String(monthNum).padStart(2, '0')}-25`;
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
