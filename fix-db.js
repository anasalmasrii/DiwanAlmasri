import { initDatabase, getDb, saveDatabase } from './server/db.js';

async function fixColumns() {
  await initDatabase();
  const db = getDb();
  
  console.log('Fixing columns...');
  // Move name from national_id to full_name, clear national_id and phone_number
  db.run("UPDATE members SET full_name = national_id, national_id = '', phone_number = '' WHERE national_id != '' AND full_name NOT LIKE '%المصري%'");
  
  saveDatabase();
  console.log('Done fixing columns!');
}

fixColumns().catch(console.error);
