import express from 'express';
import { getDb, saveDatabase } from '../db.js';

const router = express.Router();

// ── جلب رقم السند التالي حسب النوع ──────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const db = getDb();
    const { type } = req.query; // receipt | payment
    let sql = 'SELECT MAX(voucher_number) as max_num FROM vouchers';
    const params = [];
    if (type) {
      sql += ' WHERE voucher_type = ?';
      params.push(type);
    }
    const row = await db.get(sql, params);
    const next = parseInt(row?.max_num || 0, 10) + 1;
    res.json({ next_number: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── جلب جميع السندات ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v
      LEFT JOIN members m ON v.member_id = m.id
      ORDER BY v.voucher_date DESC, v.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── إضافة سند جديد ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { voucher_type, voucher_number, amount, member_id, party_name, description, voucher_date } = req.body;
    
    if (!voucher_type || !amount || !voucher_date) {
      return res.status(400).json({ error: 'البيانات الأساسية مطلوبة (النوع، المبلغ، التاريخ)' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً موجباً' });
    }

    const safeVoucherNumber = (voucher_number !== undefined && voucher_number !== null && voucher_number !== '' && !isNaN(parseInt(voucher_number, 10))) 
      ? parseInt(voucher_number, 10) 
      : null;

    const safeMemberId = (member_id !== undefined && member_id !== null && member_id !== '' && !isNaN(parseInt(member_id, 10))) 
      ? parseInt(member_id, 10) 
      : null;

    const safePartyName = party_name ? String(party_name).trim() : null;
    const safeDescription = description ? String(description).trim() : '';

    const result = await db.run(
      'INSERT INTO vouchers (voucher_type, voucher_number, amount, member_id, party_name, description, voucher_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [voucher_type, safeVoucherNumber, numAmount, safeMemberId, safePartyName, safeDescription, voucher_date]
    );

    if (typeof saveDatabase === 'function') saveDatabase();
    
    const newVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      LEFT JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [result.lastInsertRowid]);
    res.json(newVoucher);
  } catch (err) {
    console.error('Error in POST /api/vouchers:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── تحديث سند ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { voucher_type, voucher_number, amount, member_id, party_name, description, voucher_date } = req.body;
    
    if (!voucher_type || !amount || !voucher_date) {
      return res.status(400).json({ error: 'البيانات الأساسية مطلوبة' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً موجباً' });
    }

    const safeVoucherNumber = (voucher_number !== undefined && voucher_number !== null && voucher_number !== '' && !isNaN(parseInt(voucher_number, 10))) 
      ? parseInt(voucher_number, 10) 
      : null;

    const safeMemberId = (member_id !== undefined && member_id !== null && member_id !== '' && !isNaN(parseInt(member_id, 10))) 
      ? parseInt(member_id, 10) 
      : null;

    const safePartyName = party_name ? String(party_name).trim() : null;
    const safeDescription = description ? String(description).trim() : '';

    await db.run(
      'UPDATE vouchers SET voucher_type = ?, voucher_number = ?, amount = ?, member_id = ?, party_name = ?, description = ?, voucher_date = ? WHERE id = ?',
      [voucher_type, safeVoucherNumber, numAmount, safeMemberId, safePartyName, safeDescription, voucher_date, id]
    );

    if (typeof saveDatabase === 'function') saveDatabase();
    
    const updatedVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      LEFT JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [id]);
    res.json(updatedVoucher);
  } catch (err) {
    console.error('Error in PUT /api/vouchers:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── حذف سند ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
    if (typeof saveDatabase === 'function') saveDatabase();
    res.json({ message: 'تم حذف السند بنجاح', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

