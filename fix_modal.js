const fs = require('fs');
const file = 'c:/Users/anasm/.gemini/antigravity/scratch/diwan-al-masri/client/src/pages/VouchersPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// The corrupted text blocks in the file
const corruptedModal = `{expenseConfirm && (
        <div className="modal-overlay" onClick={() => setExpenseConfirm(null)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📤 إضافة الفاتورة للمصاريف</h3>
              <button className="modal-close" onClick={() => setExpenseConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px' }}>سيتم إنشاء مصروف جديد بالمعلومات التالية:</p>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: '0.95rem' }}>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>البيان:</span> <strong>فاتورة #{expenseConfirm.invoice_number} — {expenseConfirm.customer_name}</strong></div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>المبلغ:</span> <strong style={{ color: 'var(--danger)' }}>{parseFloat(expenseConfirm.total || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ</strong></div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>التاريخ:</span> <strong>{expenseConfirm.invoice_date ? expenseConfirm.invoice_date.split('T')[0] : '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>الفئة:</span> <strong>فواتير</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleAddToExpenses}>✅ نعم، أضف للمصاريف</button>
              <button className="btn btn-secondary" onClick={() => setExpenseConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}`;

// We don't have exactly this text because the script I ran with Powershell injected corrupted chars.
// So let's find the boundaries and replace the whole block.
const startMarker = '{expenseConfirm && (';
const endMarker = '{deleteConfirm && (';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const fixedModal = `{expenseConfirm && (
        <div className="modal-overlay" onClick={() => setExpenseConfirm(null)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📤 إضافة الفاتورة للمصاريف</h3>
              <button className="modal-close" onClick={() => setExpenseConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px' }}>سيتم إنشاء مصروف جديد بالمعلومات التالية:</p>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: '0.95rem', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>البيان:</span> <strong>فاتورة #{expenseConfirm.invoice_number} — {expenseConfirm.customer_name}</strong></div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>المبلغ:</span> <strong style={{ color: 'var(--danger)' }}>{parseFloat(expenseConfirm.total || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ</strong></div>
                <div style={{ marginBottom: '6px' }}><span style={{ color: 'var(--text-muted)' }}>التاريخ:</span> <strong>{expenseConfirm.invoice_date ? expenseConfirm.invoice_date.split('T')[0] : '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>الفئة:</span> <strong>فواتير</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleAddToExpenses}>✅ نعم، أضف للمصاريف</button>
              <button className="btn btn-secondary" onClick={() => setExpenseConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      `;
    content = content.substring(0, startIndex) + fixedModal + content.substring(endIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed modal successfully.');
} else {
    console.log('Could not find modal bounds.');
}

// Ensure the handleAddToExpenses text is completely clean
const funcStart = 'const handleAddToExpenses = async () => {';
const funcEnd = 'if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;';
const cleanFunc = `const handleAddToExpenses = async () => {
    if (!expenseConfirm) return;
    try {
      const inv = expenseConfirm;
      const description = "فاتورة #" + inv.invoice_number + " — " + inv.customer_name;
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(inv.total || 0),
          description,
          expense_date: inv.invoice_date ? inv.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
          category: 'فواتير',
        }),
      });
      if (!res.ok) { const d = await res.json(); showToast(d.error || 'خطأ في الإضافة', 'error'); return; }
      showToast('تمت إضافة الفاتورة للمصاريف بنجاح');
      setExpenseConfirm(null);
    } catch { showToast('حدث خطأ أثناء الإضافة', 'error'); }
  };

  `;

let sIndex = content.indexOf(funcStart);
let eIndex = content.indexOf(funcEnd);

if (sIndex !== -1 && eIndex !== -1) {
    content = content.substring(0, sIndex) + cleanFunc + content.substring(eIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed function successfully.');
} else {
    console.log('Could not find function bounds.');
}

