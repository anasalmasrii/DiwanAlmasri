const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('diwan.db');
db.all(`
  SELECT m.full_name,
    (
      (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', m.join_date) as integer)) * 12 
      + (cast(strftime('%m', 'now') as integer) - cast(strftime('%m', m.join_date) as integer)) 
      + 1 
      - (SELECT COUNT(*) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك')
    ) as months_owed,
    (SELECT GROUP_CONCAT(month) FROM payments WHERE member_id = m.id AND payment_type = 'اشتراك' AND year = 2026) as paid_months
  FROM members m
`, (err, rows) => {
  console.log(err || rows);
});
