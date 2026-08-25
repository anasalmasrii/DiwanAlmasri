/**
 * صفحة مصاريف وصيانة الديوان
 * ==============================
 * تسجيل وتتبع المصاريف المالية للديوان وإرفاق الفواتير والإيصالات
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['عام', 'صيانة', 'فواتير', 'مشتريات', 'إيجار', 'نقل', 'أخرى'];

export default function ExpensesPage() {
  const { apiFetch } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState('');

  const [form, setForm] = useState({
    amount: '',
    description: '',
    expense_date: now.toISOString().split('T')[0],
    category: 'عام',
    receipt_url: '',
  });
  const [formError, setFormError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const years = [];
  for (let y = 2020; y <= now.getFullYear() + 1; y++) years.push(y);

  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  useEffect(() => {
    loadExpenses();
  }, [filterMonth, filterYear]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let url = '/api/expenses?';
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filterYear) url += `year=${filterYear}`;
      const res = await apiFetch(url);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setForm({ amount: '', description: '', expense_date: now.toISOString().split('T')[0], category: 'عام', receipt_url: '' });
    setFormError('');
    setEditingExpense(null);
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    setForm({
      amount: expense.amount,
      description: expense.description,
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
      category: expense.category || 'عام',
      receipt_url: expense.receipt_url || '',
    });
    setFormError('');
    setEditingExpense(expense);
    setShowModal(true);
  };

  // معالجة اختيار صورة وتقليص حجمها
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح');
      return;
    }

    setUploadingImage(true);
    setFormError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setForm(prev => ({ ...prev, receipt_url: dataUrl }));
        setUploadingImage(false);
      };
      img.onerror = () => {
        setFormError('فشل قراءة صورة الفاتورة');
        setUploadingImage(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setFormError('حدث خطأ في تحميل الصورة');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.description || !form.expense_date) {
      setFormError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      const isEditing = !!editingExpense;
      const url = isEditing ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'خطأ في الحفظ');
        return;
      }

      showToast(isEditing ? 'تم تعديل المصروف والفاتورة بنجاح' : 'تم تسجيل المصروف بنجاح');
      setShowModal(false);
      loadExpenses();
    } catch {
      setFormError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/expenses/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف المصروف بنجاح');
      setDeleteConfirm(null);
      loadExpenses();
    } catch {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const filtered = expenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.description.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const categoryColor = {
    'صيانة': 'badge-warning',
    'فواتير': 'badge-info',
    'مشتريات': 'badge-active',
    'إيجار': 'badge-gold',
    'نقل': 'badge-info',
    'أخرى': 'badge-inactive',
    'عام': 'badge-warning',
  };

  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div>
      {/* رأس الصفحة */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>🛠️</span>
            <span>مصاريف وصيانة الديوان</span>
          </h2>
          <p className="page-description">تسجيل وتتبع المصاريف المالية للديوان وإرفاق إيصالات الفواتير</p>
        </div>
        <button id="add-expense-btn" className="btn btn-primary" onClick={openAddModal}>
          ➕ تسجيل مصروف جديد
        </button>
      </div>

      {/* الفلاتر */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">الشهر</label>
              <select className="form-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">الكل</option>
                {arabicMonths.map((name, i) => (
                  <option key={i} value={i + 1}>شهر {i + 1} ({name})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">السنة</label>
              <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">الكل</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">التصنيف</label>
              <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">الكل</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label className="form-label">بحث</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="ابحث بالوصف أو التصنيف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* جدول المصاريف */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>📋</span>
            <span>سجل المصاريف ({filtered.length} مصروف)</span>
          </h3>
          {filtered.length > 0 && (
            <div style={{ fontWeight: 'bold', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              الإجمالي: {totalAmount.toLocaleString('en-US')} د.أ
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛠️</div>
            <div className="empty-state-text">لا توجد مصاريف مسجلة</div>
            <div className="empty-state-sub">ابدأ بتسجيل مصاريف الديوان</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الوصف / البيان</th>
                  <th>التصنيف</th>
                  <th>التاريخ</th>
                  <th>الشهر</th>
                  <th>المبلغ</th>
                  <th>الفاتورة / الإيصال</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense, idx) => (
                  <tr key={expense.id}>
                    <td data-label="#" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td data-label="الوصف" style={{ fontWeight: 600 }}>{expense.description}</td>
                    <td data-label="التصنيف">
                      <span className={`badge ${categoryColor[expense.category] || 'badge-warning'}`}>{expense.category || 'عام'}</span>
                    </td>
                    <td data-label="التاريخ">{expense.expense_date ? expense.expense_date.split('T')[0] : '—'}</td>
                    <td data-label="الشهر">
                      <span className="badge badge-info">شهر {expense.month} ({expense.year})</span>
                    </td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      {parseFloat(expense.amount).toLocaleString('en-US')} د.أ
                    </td>
                    <td data-label="الفاتورة">
                      {expense.receipt_url ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '4px', fontSize: '0.8rem', color: '#0284c7' }}
                          onClick={() => setViewReceiptUrl(expense.receipt_url)}
                          title="عرض الفاتورة المرفقة"
                        >
                          🖼️ معاينة الفاتورة
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '4px', fontSize: '0.75rem', color: '#b45309', background: '#fef3c7', borderColor: '#fde68a' }}
                          onClick={() => openEditModal(expense)}
                          title="إرفاق صورة فاتورة لهذا المصروف"
                        >
                          📎 إرفاق صورة
                        </button>
                      )}
                    </td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(expense)} title="تعديل المصروف والفاتورة">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(expense)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة الإضافة / التعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingExpense ? '✏️ تعديل المصروف والفاتورة' : '➕ تسجيل مصروف جديد'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الوصف / البيان *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: إصلاح مكيف، شراء كراسي، فاتورة كهرباء..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.000"
                      step="0.001"
                      min="0"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التصنيف</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الصرف *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.expense_date}
                    onChange={e => setForm({ ...form, expense_date: e.target.value })}
                    required
                  />
                </div>

                {/* حقل رفع وإرفاق صورة الفاتورة */}
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">صورة الفاتورة / الإيصال المرفق</label>
                  {form.receipt_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px' }}>
                      <img
                        src={form.receipt_url}
                        alt="صورة الفاتورة"
                        style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #86efac', cursor: 'pointer' }}
                        onClick={() => setViewReceiptUrl(form.receipt_url)}
                      />
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534' }}>✔ تم إرفاق صورة الفاتورة</div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#15803d', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                            onClick={() => setViewReceiptUrl(form.receipt_url)}
                          >
                            👁️ معاينة الصورة
                          </button>
                          <label style={{ color: '#b45309', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
                            🔄 تغيير الصورة
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => setForm({ ...form, receipt_url: '' })}
                        title="إزالة صورة الفاتورة"
                      >
                        ❌ إزالة
                      </button>
                    </div>
                  ) : (
                    <div style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center', position: 'relative', background: 'rgba(0,0,0,0.015)', cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>⏳ جاري معالجة ورفع الصورة...</div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>📷</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>اضغط هنا لإرفاق / رفع صورة الفاتورة</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>يدعم كافة صيغ الصور (JPG, PNG, WebP)</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {formError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>
                    ⚠️ {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
                  {editingExpense ? '💾 حفظ التعديلات' : '➕ تسجيل المصروف'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ حذف المصروف</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف المصروف:</p>
              <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.1rem' }}>"{deleteConfirm.description}"</p>
              <p style={{ color: 'var(--text-muted)' }}>المبلغ: {parseFloat(deleteConfirm.amount).toLocaleString('en-US')} د.أ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ نعم، احذف</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة صورة الفاتورة المكبرة */}
      {viewReceiptUrl && (
        <div className="modal-overlay" onClick={() => setViewReceiptUrl(null)} style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '700px', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: '#334155' }}>
              <h3 className="modal-title" style={{ color: '#fff' }}>🖼️ معاينة صورة الفاتورة / الإيصال</h3>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setViewReceiptUrl(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '16px' }}>
              <img
                src={viewReceiptUrl}
                alt="إيصال الفاتورة"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectContain: 'contain', borderRadius: '10px', border: '1px solid #475569', margin: '0 auto' }}
              />
            </div>
            <div className="modal-footer" style={{ borderColor: '#334155', justifyContent: 'center' }}>
              <a
                href={viewReceiptUrl}
                download="invoice_receipt.jpg"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                📥 تحميل الصورة
              </a>
              <button className="btn btn-secondary" onClick={() => setViewReceiptUrl(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* إشعار Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
