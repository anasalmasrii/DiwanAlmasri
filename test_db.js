import dbModule from './server/db.js';

async function run() {
  await dbModule.initDatabase();
  const db = dbModule.getDb();
  
  const currentYear = 2026;
  const currentMonth = 6;
  const q = null;
  const pattern = q ? `%${q}%` : null;

  const baseQuery = `
    SELECT m.*,
      (SELECT COUNT(*) FROM payments WHERE member_id = m.id) as total_payments,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك') as total_subscriptions,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id AND payment_type = 'مساهمة') as total_contributions,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك' AND year = ?) as yearly_subscriptions,
      (SELECT GROUP_CONCAT(month) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك' AND year = ?) as paid_months,
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
    const members = await db.all(baseQuery + ` ORDER BY m.created_at DESC`, [currentYear, currentYear, currentMonth, currentYear]);
    console.log("Success! Members count:", members.length);
    console.log("First member:", members[0]);
  } catch (err) {
    console.error("Error executing query:", err);
  }
}

run();
