import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. مسار عام لاستقبال الطلبات الجديدة من الزوار
router.post('/public/register', async (req, res) => {
  const { full_name, national_id, date_of_birth, phone_number, qualification } = req.body;
  
  if (!full_name || !national_id || !date_of_birth || !phone_number || !qualification) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة، يرجى تعبئة الاستبيان كاملاً' });
  }

  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone_number.trim())) {
    return res.status(400).json({ error: 'يرجى التأكد من رقم الهاتف (يجب أن يتكون من 10 أرقام)' });
  }

  const nameParts = full_name.trim().split(/\s+/);
  if (nameParts.length < 4) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم الرباعي كاملاً (يجب أن يتكون من 4 مقاطع على الأقل)' });
  }

  try {
    const db = getDb();

    if (db.isPg) {
      await db.query(
        'INSERT INTO join_requests (full_name, national_id, date_of_birth, phone_number, qualification) VALUES ($1, $2, $3, $4, $5)',
        [full_name, national_id || null, date_of_birth || null, phone_number, qualification || null]
      );
    } else {
      await db.run(
        'INSERT INTO join_requests (full_name, national_id, date_of_birth, phone_number, qualification) VALUES (?, ?, ?, ?, ?)',
        [full_name, national_id || null, date_of_birth || null, phone_number, qualification || null]
      );
      const m = await import('../db.js');
      m.saveDatabase();
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
      const { rows } = await db.query("SELECT * FROM join_requests WHERE status != 'rejected' ORDER BY id DESC");
      requests = rows;
    } else {
      requests = await db.all("SELECT * FROM join_requests WHERE status != 'rejected' ORDER BY id DESC");
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. الموافقة كمنتسب (تغيير الحالة إلى affiliate)
router.post('/:id/approve-affiliate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    if (db.isPg) {
      await db.query("UPDATE join_requests SET status = 'affiliate' WHERE id = $1", [id]);
    } else {
      await db.run("UPDATE join_requests SET status = 'affiliate' WHERE id = ?", [id]);
      const m = await import('../db.js');
      m.saveDatabase();
    }
    res.json({ message: 'تم تحويل الطلب إلى منتسب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء الموافقة' });
  }
});

// دالة مساعدة لتوحيد الأسماء العربية لتسهيل المطابقة
function normalizeArabicName(name) {
  if (!name) return '';
  return name
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/عبدالرحمان/g, 'عبدالرحمن')
    .replace(/عبد الرحمان/g, 'عبدالرحمن')
    .replace(/عبد الرحمن/g, 'عبدالرحمن')
    .replace(/\s+/g, ' ')
    .trim();
}

// 4. التحقق من وجود تطابق في النظام الرسمي
router.get('/:id/check-match', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    let request;
    if (db.isPg) {
      const { rows } = await db.query('SELECT * FROM join_requests WHERE id = $1', [id]);
      request = rows[0];
    } else {
      request = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
    }

    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    let match = null;
    const reqNationalId = request.national_id ? request.national_id.trim() : '';
    const normalizedReqName = normalizeArabicName(request.full_name);

    // جلب كل الأعضاء للمقارنة الذكية برمجياً
    let allMembers = [];
    if (db.isPg) {
      const { rows } = await db.query('SELECT * FROM members');
      allMembers = rows;
    } else {
      allMembers = await db.all('SELECT * FROM members');
    }

    // البحث في الأعضاء
    match = allMembers.find(m => {
      // 1. التطابق بالرقم الوطني إذا كان موجوداً
      if (reqNationalId && m.national_id && m.national_id.trim() === reqNationalId) {
        return true;
      }
      // 2. التطابق بالاسم بعد إزالة الفروقات (الهمزات، الهاء، التاء المربوطة...)
      if (normalizeArabicName(m.full_name) === normalizedReqName) {
        return true;
      }
      return false;
    });

    res.json({ match: match || null, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء البحث عن تطابق' });
  }
});

// 5. دمج البيانات (أو إضافة كعضو جديد)
router.post('/:id/merge', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { member_id } = req.body; // null if new member
  try {
    const db = getDb();
    let request;
    if (db.isPg) {
      const { rows } = await db.query('SELECT * FROM join_requests WHERE id = $1', [id]);
      request = rows[0];
    } else {
      request = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
    }

    if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (db.isPg) {
      await db.query('BEGIN');
      if (member_id) {
        // Update existing member
        await db.query(
          'UPDATE members SET national_id = COALESCE($1, national_id), date_of_birth = COALESCE($2, date_of_birth), phone_number = COALESCE($3, phone_number), qualification = COALESCE($4, qualification) WHERE id = $5',
          [request.national_id, request.date_of_birth, request.phone_number, request.qualification, member_id]
        );
      } else {
        // Create new member
        await db.query(
          'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, qualification) VALUES ($1, $2, $3, $4, $5)',
          [request.full_name, request.national_id, request.date_of_birth, request.phone_number, request.qualification]
        );
      }
      await db.query("UPDATE join_requests SET status = 'merged' WHERE id = $1", [id]);
      await db.query('COMMIT');
    } else {
      try {
        if (member_id) {
          await db.run(
            'UPDATE members SET national_id = COALESCE(?, national_id), date_of_birth = COALESCE(?, date_of_birth), phone_number = COALESCE(?, phone_number), qualification = COALESCE(?, qualification) WHERE id = ?',
            [request.national_id, request.date_of_birth, request.phone_number, request.qualification, member_id]
          );
        } else {
          await db.run(
            'INSERT INTO members (full_name, national_id, date_of_birth, phone_number, qualification) VALUES (?, ?, ?, ?, ?)',
            [request.full_name, request.national_id, request.date_of_birth, request.phone_number, request.qualification]
          );
        }
        await db.run("UPDATE join_requests SET status = 'merged' WHERE id = ?", [id]);
        const m = await import('../db.js');
        m.saveDatabase();
      } catch (err) {
        throw err;
      }
    }

    res.json({ message: member_id ? 'تم تحديث بيانات العضو بنجاح' : 'تم إضافة العضو الجديد بنجاح' });
  } catch (err) {
    console.error(err);
    if (getDb().isPg) await getDb().query('ROLLBACK');
    res.status(500).json({ error: 'حدث خطأ أثناء الدمج' });
  }
});

// 6. رفض الطلب (أو حذفه)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    if (db.isPg) {
      await db.query("UPDATE join_requests SET status = 'rejected' WHERE id = $1", [id]);
    } else {
      await db.run("UPDATE join_requests SET status = 'rejected' WHERE id = ?", [id]);
      const m = await import('../db.js');
      m.saveDatabase();
    }
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء الحذف' });
  }
});

export default router;
