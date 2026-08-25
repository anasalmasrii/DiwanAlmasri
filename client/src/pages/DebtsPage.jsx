import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DebtsPage() {
  const { apiFetch } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [payConfirm, setPayConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('unpaid');

  const now = new Date();

  const [form, setForm] = useState({
    amount: '',
    description: '',
    creditor_name: '',
    debt_date: now.toISOString().split('T')[0]
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/debts');
      const data = await res.json();
      setDebts(Array.isArray(data) ? data : []);
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
    setForm({ amount: '', description: '', creditor_name: '', debt_date: now.toISOString().split('T')[0] });
    setFormError('');
    setEditingDebt(null);
    setShowModal(true);
  };

  const openEditModal = (debt) => {
    setForm({
      amount: debt.amount,
      description: debt.description,
      creditor_name: debt.creditor_name || '',
      debt_date: debt.debt_date ? debt.debt_date.split('T')[0] : '',
    });
    setFormError('');
    setEditingDebt(debt);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.description || !form.debt_date) {
      setFormError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      const isEditing = !!editingDebt;
      const url = isEditing ? `/api/debts/${editingDebt.id}` : '/api/debts';
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

      showToast(isEditing ? 'تم تعديل الذمة بنجاح' : 'تم إضافة الذمة بنجاح');
      setShowModal(false);
      loadDebts();
    } catch {
      setFormError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/debts/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف الذمة بنجاح');
      setDeleteConfirm(null);
      loadDebts();
    } catch {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handlePay = async () => {
    if (!payConfirm) return;
    try {
      await apiFetch(`/api/debts/${payConfirm.id}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paid' })
      });
      showToast('تم تسجيل سداد الذمة بنجاح');
      setPayConfirm(null);
      loadDebts();
    } catch {
      showToast('حدث خطأ أثناء السداد', 'error');
    }
  };

  const filtered = debts.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.description.toLowerCase().includes(q) || (e.creditor_name || '').toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>📜</span>
            <span>ذمم على الديوان</span>
          </h2>
          <p className="page-description">إدارة الديون والذمم المستحقة على الديوان</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ إضافة ذمة جديدة
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">حالة الذمة</label>
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="unpaid">غير مسددة</option>
                <option value="paid">مسددة</option>
                <option value="all">الكل</option>
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
                  placeholder="ابحث بالبيان أو الجهة الدائنة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>📋</span>
            <span>سجل الذمم ({filtered.length})</span>
          </h3>
          {filtered.length > 0 && (
            <div style={{ fontWeight: 'bold', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              الإجمالي: {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <div className="empty-state-text">لا توجد ذمم لعرضها</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>البيان / الوصف</th>
                  <th>الجهة الدائنة</th>
                  <th>التاريخ</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>تاريخ السداد</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((debt, idx) => (
                  <tr key={debt.id} style={{ opacity: debt.status === 'paid' ? 0.7 : 1 }}>
                    <td data-label="#">{idx + 1}</td>
                    <td data-label="البيان" style={{ fontWeight: 600 }}>{debt.description}</td>
                    <td data-label="الجهة الدائنة">{debt.creditor_name || '—'}</td>
                    <td data-label="التاريخ">{debt.debt_date ? debt.debt_date.split('T')[0] : '—'}</td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      {parseFloat(debt.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
                    </td>
                    <td data-label="الحالة">
                      {debt.status === 'paid' ? (
                        <span className="badge badge-active">✔ مسددة</span>
                      ) : (
                        <span className="badge badge-danger">⏳ غير مسددة</span>
                      )}
                    </td>
                    <td data-label="تاريخ السداد">{debt.paid_date ? debt.paid_date.split('T')[0] : '—'}</td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        {debt.status === 'unpaid' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setPayConfirm(debt)} title="تسديد الذمة">💵 تسديد</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(debt)} title="تعديل">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(debt)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingDebt ? '✏️ تعديل الذمة' : '➕ إضافة ذمة جديدة'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">البيان / الوصف *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="سبب الاستدانة..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الجهة الدائنة</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="من هو الدائن؟"
                    value={form.creditor_name}
                    onChange={e => setForm({ ...form, creditor_name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      step="0.001"
                      min="0"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.debt_date}
                      onChange={e => setForm({ ...form, debt_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {formError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>
                    ⚠️ {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingDebt ? '💾 حفظ التعديلات' : '➕ إضافة الذمة'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payConfirm && (
        <div className="modal-overlay" onClick={() => setPayConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💵 تسديد الذمة</h3>
              <button className="modal-close" onClick={() => setPayConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من تسديد الذمة:</p>
              <p style={{ fontWeight: 700, color: 'var(--main)', fontSize: '1.1rem' }}>"{payConfirm.description}"</p>
              <p style={{ color: 'var(--text-muted)' }}>المبلغ: {parseFloat(payConfirm.amount).toLocaleString('en-US')} د.أ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handlePay}>✔️ نعم، تم السداد</button>
              <button className="btn btn-secondary" onClick={() => setPayConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ حذف الذمة</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف الذمة:</p>
              <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.1rem' }}>"{deleteConfirm.description}"</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ نعم، احذف</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
