/**
 * صفحة مصاريف وصيانة الديوان
 * ==============================
 * تسجيل وتتبع المصاريف المالية للديوان
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
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const [form, setForm] = useState({
    amount: '',
    description: '',
    expense_date: now.toISOString().split('T')[0],
    category: 'عام',
  });
  const [formError, setFormError] = useState('');

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
    setForm({ amount: '', description: '', expense_date: now.toISOString().split('T')[0], category: 'عام' });
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
    });
    setFormError('');
    setEditingExpense(expense);
    setShowModal(true);
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

      showToast(isEditing ? 'تم تعديل المصروف بنجاح' : 'تم تسجيل المصروف بنجاح');
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
          <p className="page-description">تسجيل وتتبع المصاريف والنفقات المالية للديوان</p>
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
              الإجمالي: {totalAmount.toLocaleString('ar-JO')} د.أ
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
                      {parseFloat(expense.amount).toLocaleString('ar-JO')} د.أ
                    </td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(expense)} title="تعديل">✏️</button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingExpense ? '✏️ تعديل المصروف' : '➕ تسجيل مصروف جديد'}</h3>
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
                {formError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>
                    ⚠️ {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
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
              <p style={{ color: 'var(--text-muted)' }}>المبلغ: {parseFloat(deleteConfirm.amount).toLocaleString('ar-JO')} د.أ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ نعم، احذف</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
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
