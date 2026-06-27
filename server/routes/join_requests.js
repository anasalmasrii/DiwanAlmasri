import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. مسار عام لاستقبال الطلبات الجديدة من الزوار
router.post('/public/register', async (req, res) => {
  const { full_name, national_id, date_of_birth, phone_number, qualification } = req.body;
  
  if (!full_name || !phone_number) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم ورقم الهاتف على الأقل' });
  }

  try {
    const db = getDb();
    
    // Check if member already exists by national_id or name
    let existing;
    if (db.isPg) {
      if (national_id) {
        const { rows } = await db.query('SELECT id FROM members WHERE national_id = $1', [national_id]);
        existing = rows[0];
      }
      if (!existing) {
        const { rows } = await db.query('SELECT id FROM members WHERE full_name = $1', [full_name]);
        existing = rows[0];
      }
    } else {
      if (national_id) {
        existing = db.get('SELECT id FROM members WHERE national_id = ?', [national_id]);
      }
      if (!existing) {
        existing = db.get('SELECT id FROM members WHERE full_name = ?', [full_name]);
      }
    }

    if (existing) {
      return res.status(400).json({ error: 'العضو مسجل مسبقاً في النظام' });
    }

    if (db.isPg) {
      await db.query(
        'INSERT INTO join_requests (full_name, national_id, date_of_birth, phone_number, qualification) VALUES ($1, $2, $3, $4, $5)',
        [full_name, national_id || null, date_of_birth || null, phone_number, qualification || null]
      );
    } else {
      db.run(
        'INSERT INTO join_requests (full_name, national_id, date_of_birth, phone_number, qualification) VALUES (?, ?, ?, ?, ?)',
        [full_name, national_id || null, date_of_birth || null, phone_number, qualification || null]
      );
      import('../db.js').then(m => m.saveDatabase());
    }

    res.status(201).json({ message: 'تم استلام طلب الانضمام بنجاح. سيتم مراجعته قريباً.' });
  } catch (err) {
    console.error('Error submitting join request:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إرسال الطلب' });
  }
});

// 2. جلب كافة الطلبات (للإدمن فقط)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    let requests;
    if (db.isPg) {
      const { rows } = await db.query("SELECT * FROM join_requests WHERE status = 'pending' ORDER BY id DESC");
      requests = rows;
    } else {
      requests = db.all("SELECT * FROM join_requests WHERE status = 'pending' ORDER BY id DESC");
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. الموافقة على الطلب (تحويله إلى عضو نشط)
router.post('/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    let request;
    if (db.isPg) {
      const { rows } = await db.query('SELECT * FROM join_requests WHERE id = $1', [id]);
      request = rows[0];
    } else {
      request = db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
    }

    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    if (db.isPg) {
      await db.query('BEGIN');
      await db.query(
        'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, qualification) VALUES ($1, $2, $3, $4, $5)',
        [request.full_name, request.national_id, request.date_of_birth, request.phone_number, request.qualification]
      );
      await db.query("UPDATE join_requests SET status = 'approved' WHERE id = $1", [id]);
      await db.query('COMMIT');
    } else {
      db.exec('BEGIN TRANSACTION');
      db.run(
        'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, qualification) VALUES (?, ?, ?, ?, ?)',
        [request.full_name, request.national_id, request.date_of_birth, request.phone_number, request.qualification]
      );
      db.run("UPDATE join_requests SET status = 'approved' WHERE id = ?", [id]);
      db.exec('COMMIT');
      import('../db.js').then(m => m.saveDatabase());
    }

    res.json({ message: 'تمت الموافقة على الطلب بنجاح وتم إضافة العضو' });
  } catch (err) {
    console.error(err);
    if (getDb().isPg) await getDb().query('ROLLBACK');
    else getDb().exec('ROLLBACK');
    res.status(500).json({ error: 'حدث خطأ أثناء الموافقة' });
  }
});

// 4. رفض الطلب (أو حذفه)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    if (db.isPg) {
      await db.query("UPDATE join_requests SET status = 'rejected' WHERE id = $1", [id]);
    } else {
      db.run("UPDATE join_requests SET status = 'rejected' WHERE id = ?", [id]);
      import('../db.js').then(m => m.saveDatabase());
    }
    res.json({ message: 'تم رفض الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء الرفض' });
  }
});

export default router;
