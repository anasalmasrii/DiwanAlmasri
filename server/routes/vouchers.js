import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// جلب جميع السندات
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v
      JOIN members m ON v.member_id = m.id
      ORDER BY v.voucher_date DESC, v.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إضافة سند جديد
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { voucher_type, amount, member_id, description, voucher_date } = req.body;
    
    if (!voucher_type || !amount || !member_id || !voucher_date) {
      return res.status(400).json({ error: 'البيانات الأساسية مطلوبة (النوع، المبلغ، العضو، التاريخ)' });
    }
    
    const result = await db.run(
      'INSERT INTO vouchers (voucher_type, amount, member_id, description, voucher_date) VALUES (?, ?, ?, ?, ?)',
      [voucher_type, parseFloat(amount), parseInt(member_id), description || '', voucher_date]
    );
    
    const newVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [result.lastInsertRowid]);
    res.json(newVoucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تحديث سند
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { voucher_type, amount, member_id, description, voucher_date } = req.body;
    
    if (!voucher_type || !amount || !member_id || !voucher_date) {
      return res.status(400).json({ error: 'البيانات الأساسية مطلوبة' });
    }
    
    await db.run(
      'UPDATE vouchers SET voucher_type = ?, amount = ?, member_id = ?, description = ?, voucher_date = ? WHERE id = ?',
      [voucher_type, parseFloat(amount), parseInt(member_id), description || '', voucher_date, id]
    );
    
    const updatedVoucher = await db.get(`
      SELECT v.*, m.full_name as member_name 
      FROM vouchers v 
      JOIN members m ON v.member_id = m.id 
      WHERE v.id = ?
    `, [id]);
    res.json(updatedVoucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حذف سند
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    await db.run('DELETE FROM vouchers WHERE id = ?', [id]);
    res.json({ message: 'تم حذف السند بنجاح', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
