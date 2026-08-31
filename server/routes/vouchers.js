import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// ── جلب رقم السند التالي حسب النوع ──────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const db = getDb();
    const { type } = req.query; // receipt | payment
    let sql = 'SELECT MAX(voucher_number) as max_num FROM vouchers';
    if (type) sql += ` WHERE voucher_type = '${type}'`;
    const row = await db.get(sql);
    const next = (row?.max_num || 0) + 1;
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
    
    const result = await db.run(
      'INSERT INTO vouchers (voucher_type, voucher_number, amount, member_id, party_name, description, voucher_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [voucher_type, voucher_number || null, parseFloat(amount), member_id ? parseInt(member_id) : null, party_name || null, description || '', voucher_date]
    );
    
    const newVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      LEFT JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [result.lastInsertRowid]);
    res.json(newVoucher);
  } catch (err) {
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
    
    await db.run(
      'UPDATE vouchers SET voucher_type = ?, voucher_number = ?, amount = ?, member_id = ?, party_name = ?, description = ?, voucher_date = ? WHERE id = ?',
      [voucher_type, voucher_number || null, parseFloat(amount), member_id ? parseInt(member_id) : null, party_name || null, description || '', voucher_date, id]
    );
    
    const updatedVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      LEFT JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [id]);
    res.json(updatedVoucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── حذف سند ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف السند بنجاح', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
