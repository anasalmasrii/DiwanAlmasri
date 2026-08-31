import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// ── جلب رقم الفاتورة التالي ─────────────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const db = getDb();
    const row = await db.get('SELECT MAX(invoice_number) as max_num FROM invoices');
    const next = (row?.max_num || 0) + 1;
    res.json({ next_number: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── جلب جميع الفواتير ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const invoices = await db.all('SELECT * FROM invoices ORDER BY invoice_date DESC, created_at DESC');
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── جلب فاتورة واحدة مع عناصرها ─────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    const items = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
    res.json({ ...invoice, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── إضافة فاتورة جديدة ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { invoice_number, invoice_date, payment_type, customer_name, notes, items } = req.body;

    if (!customer_name || !invoice_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'اسم العميل، التاريخ، والعناصر مطلوبة' });
    }

    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);

    const result = await db.run(
      'INSERT INTO invoices (invoice_number, invoice_date, payment_type, customer_name, total, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [invoice_number, invoice_date, payment_type || 'cash', customer_name, total, notes || '']
    );

    const invoiceId = result.lastInsertRowid;

    for (const item of items) {
      const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
      await db.run(
        'INSERT INTO invoice_items (invoice_id, item_description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.item_description, parseFloat(item.quantity || 0), parseFloat(item.unit_price || 0), itemTotal]
      );
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    const savedItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    res.json({ ...invoice, items: savedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── تعديل فاتورة ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { invoice_number, invoice_date, payment_type, customer_name, notes, items } = req.body;

    if (!customer_name || !invoice_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'اسم العميل، التاريخ، والعناصر مطلوبة' });
    }

    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);

    await db.run(
      'UPDATE invoices SET invoice_number = ?, invoice_date = ?, payment_type = ?, customer_name = ?, total = ?, notes = ? WHERE id = ?',
      [invoice_number, invoice_date, payment_type || 'cash', customer_name, total, notes || '', id]
    );

    // حذف العناصر القديمة وإعادة إدخالها
    await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of items) {
      const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
      await db.run(
        'INSERT INTO invoice_items (invoice_id, item_description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [id, item.item_description, parseFloat(item.quantity || 0), parseFloat(item.unit_price || 0), itemTotal]
      );
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    const savedItems = await db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    res.json({ ...invoice, items: savedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── حذف فاتورة ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ترحيل فاتورة للمصاريف ────────────────────────────────────
router.post('/:id/transfer', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    if (invoice.is_transferred) {
      return res.status(400).json({ error: 'تم ترحيل هذه الفاتورة مسبقاً' });
    }

    const description = `فاتورة #${invoice.invoice_number} — ${invoice.customer_name}`;
    const expenseDate = invoice.invoice_date || new Date().toISOString().split('T')[0];
    const dateObj = new Date(expenseDate);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    await db.run(
      'INSERT INTO expenses (amount, description, expense_date, month, year, category) VALUES (?, ?, ?, ?, ?, ?)',
      [parseFloat(invoice.total || 0), description, expenseDate, month, year, 'فواتير']
    );

    await db.run('UPDATE invoices SET is_transferred = 1 WHERE id = ?', [id]);

    res.json({ success: true, message: 'تم ترحيل الفاتورة إلى المصاريف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
