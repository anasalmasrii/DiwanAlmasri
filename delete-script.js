import { initDatabase, getDb, saveDatabase } from './server/db.js';

async function fixDatabase() {
  await initDatabase();
  const db = getDb();
  
  const toDelete = db.all("SELECT id, full_name, national_id FROM members WHERE national_id LIKE '%عن روح%' OR full_name LIKE '%عن روح%'");
  
  for (const m of toDelete) {
    console.log(`Deleting ID: ${m.id}, Name: ${m.full_name}, NatID: ${m.national_id}`);
    db.run("DELETE FROM payments WHERE member_id = ?", [m.id]);
    db.run("DELETE FROM members WHERE id = ?", [m.id]);
  }
  
  // Also delete the header row that got imported: 'الرقم' and 'المجموع الكلي الإجمالي'
  const garbage = db.all("SELECT id FROM members WHERE full_name IN ('الرقم', 'المجموع الكلي الإجمالي')");
  for (const m of garbage) {
    db.run("DELETE FROM payments WHERE member_id = ?", [m.id]);
    db.run("DELETE FROM members WHERE id = ?", [m.id]);
  }
  
  saveDatabase();
  console.log('Fixed DB.');
}

fixDatabase().catch(console.error);
