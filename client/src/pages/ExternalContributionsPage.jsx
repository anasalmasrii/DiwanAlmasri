import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

const emptyForm = {
  contributor_name: '',
  amount: '',
  contribution_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function ExternalContributionsPage() {
  const { apiFetch } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filterMonth) params.set('month', filterMonth);
      if (filterYear) params.set('year', filterYear);
      const res = await apiFetch(`/api/external-contributions?${params}`);
      const data = await res.json();
      setContributions(Array.isArray(data) ? data : []);
      const total = (Array.isArray(data) ? data : []).reduce((s, c) => s + (c.amount || 0), 0);
      setTotalAmount(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterMonth, filterYear, apiFetch]);

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      contributor_name: item.contributor_name,
      amount: item.amount,
      contribution_date: item.contribution_date,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingItem) {
        res = await apiFetch(`/api/external-contributions/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        res = await apiFetch('/api/external-contributions', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'حدث خطأ');
      }
      setShowModal(false);
      loadData();
      showToast(editingItem ? 'تم تعديل المساهمة بنجاح' : 'تم إضافة المساهمة بنجاح');
    } catch (err) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/external-contributions/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadData();
      showToast('تم حذف المساهمة بنجاح');
    } catch {
      showToast('فشل الحذف', 'error');
    }
  };

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y++) years.push(y);

  return (
    <div className="page-container">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 9999 }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🤝 المساهمات الخارجية</h1>
          <p className="page-subtitle">تسجيل مساهمات الأشخاص من خارج الأعضاء</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ إضافة مساهمة
        </button>
      </div>

      {/* Summary card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🤝</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>إجمالي المساهمات الخارجية</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{totalAmount.toFixed(3)} <span style={{ fontSize: '0.9rem' }}>د.أ</span></div>
        </div>
        <div className="stat-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>👤</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>عدد المساهمين</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{contributions.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="🔍 بحث بالاسم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select className="form-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">جميع الأشهر</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ minWidth: 110 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>⏳ جاري التحميل...</div>
      ) : contributions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <p>لا توجد مساهمات خارجية مسجلة</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المساهم</th>
                <th>المبلغ</th>
                <th>تاريخ المساهمة</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.contributor_name}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{c.amount} د.أ</td>
                  <td>{c.contribution_date}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.notes || '—'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(c)} title="تعديل">✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(c)} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🤝 {editingItem ? 'تعديل مساهمة' : 'إضافة مساهمة خارجية'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">اسم المساهم *</label>
                    <input
                      className="form-input"
                      value={form.contributor_name}
                      onChange={e => setForm({ ...form, contributor_name: e.target.value })}
                      placeholder="أدخل اسم المساهم"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="form-input"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.000"
                      required
                      style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ المساهمة *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.contribution_date}
                      onChange={e => setForm({ ...form, contribution_date: e.target.value })}
                      required
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <input
                      className="form-input"
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="أي ملاحظات إضافية..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? '💾 حفظ التعديلات' : '🤝 إضافة المساهمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🗑️ تأكيد الحذف</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف مساهمة <strong>{deleteConfirm.contributor_name}</strong> بقيمة <strong>{deleteConfirm.amount} د.أ</strong>؟</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
              <button className="btn btn-danger" onClick={handleDelete}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
