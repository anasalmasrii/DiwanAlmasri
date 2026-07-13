import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { arabicMonths } from '../components/Header';

const now = new Date();
const years = [];
for (let y = 2024; y <= now.getFullYear() + 1; y++) years.push(y);

const emptyForm = {
  contributor_name: '',
  amount: '',
  contribution_date: now.toISOString().split('T')[0],
  notes: '',
};

export default function ExternalContributionsPage() {
  const { apiFetch } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/external-contributions?';
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filterYear) url += `year=${filterYear}`;
      const res = await apiFetch(url);
      const data = await res.json();
      setContributions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, apiFetch]);

  useEffect(() => {
    loadData();
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
      contribution_date: item.contribution_date ? item.contribution_date.split('T')[0] : '',
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
      showToast(editingItem ? 'تم تعديل المساهمة بنجاح' : 'تم تسجيل المساهمة بنجاح');
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

  const filtered = contributions.filter(c =>
    !searchQuery || c.contributor_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* رأس الصفحة */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>🤝</span>
            <span>مساهمات خارج الأعضاء</span>
          </h2>
          <p className="page-description">تسجيل وتتبع مساهمات الأشخاص من خارج الأعضاء</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ تسجيل مساهمة جديدة
        </button>
      </div>

      {/* الفلاتر */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">الشهر</label>
              <select
                className="form-select"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
              >
                <option value="">الكل</option>
                {arabicMonths.map((name, i) => (
                  <option key={i} value={i + 1}>شهر {i + 1} ({name})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">السنة</label>
              <select
                className="form-select"
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
              >
                <option value="">الكل</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '200px' }}>
              <label className="form-label">بحث</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="ابحث بالاسم أو الملاحظات..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>📋</span>
            <span>
              مساهمات {filterMonth ? `شهر ${filterMonth}` : 'جميع الأشهر'} {filterYear ? `لسنة ${filterYear}` : ''} ({filtered.length} مساهمة)
            </span>
          </h3>
          {filtered.length > 0 && (
            <div style={{ fontWeight: 'bold', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              المجموع: {totalAmount.toFixed(3)} د.أ
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤝</div>
            <div className="empty-state-text">لا توجد مساهمات خارجية</div>
            <div className="empty-state-sub">ابدأ بتسجيل أول مساهمة</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
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
                {filtered.map((c, idx) => (
                  <tr key={c.id}>
                    <td data-label="#" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td data-label="اسم المساهم" style={{ fontWeight: 600 }}>{c.contributor_name}</td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {parseFloat(c.amount).toLocaleString('en-US')} د.أ
                    </td>
                    <td data-label="تاريخ المساهمة">
                      {c.contribution_date ? c.contribution_date.split('T')[0] : '—'}
                    </td>
                    <td data-label="ملاحظات" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {c.notes || '—'}
                    </td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(c)}
                          title="تعديل"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(c)}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال الإضافة/التعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🤝 {editingItem ? 'تعديل مساهمة' : 'تسجيل مساهمة جديدة'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">اسم المساهم *</label>
                    <input
                      className="form-input"
                      value={form.contributor_name}
                      onChange={e => setForm({ ...form, contributor_name: e.target.value })}
                      placeholder="أدخل اسم المساهم الكامل"
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
                  {editingItem ? '💾 حفظ التعديلات' : '🤝 تسجيل المساهمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال الحذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🗑️ تأكيد الحذف</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف مساهمة <strong>{deleteConfirm.contributor_name}</strong> بقيمة <strong>{deleteConfirm.amount} د.أ</strong>؟</p>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>⚠️ لا يمكن التراجع عن هذا الإجراء</p>
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
