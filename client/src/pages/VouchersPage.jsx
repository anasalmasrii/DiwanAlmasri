import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// ============================================================
// تبويب السندات والفواتير
// ============================================================
function VouchersTab({ apiFetch }) {
  const [vouchers, setVouchers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formError, setFormError] = useState('');
  const now = new Date();

  const [form, setForm] = useState({
    voucher_type: 'receipt',
    amount: '',
    member_id: '',
    description: '',
    voucher_date: now.toISOString().split('T')[0],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.all([apiFetch('/api/vouchers'), apiFetch('/api/members')]);
      setVouchers(Array.isArray(await vRes.json()) ? await (await apiFetch('/api/vouchers')).json() : []);
      setMembers(Array.isArray(await mRes.json()) ? await (await apiFetch('/api/members')).json() : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const reloadData = async () => {
    try {
      const [vRes, mRes] = await Promise.all([apiFetch('/api/vouchers'), apiFetch('/api/members')]);
      const vData = await vRes.json();
      const mData = await mRes.json();
      setVouchers(Array.isArray(vData) ? vData : []);
      setMembers(Array.isArray(mData) ? mData : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { reloadData(); }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingVoucher(null);
    setFormError('');
    setForm({ voucher_type: 'receipt', amount: '', member_id: '', description: '', voucher_date: now.toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEditModal = (v) => {
    setEditingVoucher(v);
    setFormError('');
    setForm({ voucher_type: v.voucher_type, amount: v.amount, member_id: v.member_id, description: v.description || '', voucher_date: v.voucher_date ? v.voucher_date.split('T')[0] : '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.member_id || !form.voucher_date) { setFormError('يرجى تعبئة جميع الحقول المطلوبة'); return; }
    try {
      const isEditing = !!editingVoucher;
      const res = await apiFetch(isEditing ? `/api/vouchers/${editingVoucher.id}` : '/api/vouchers', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), member_id: parseInt(form.member_id) }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || 'خطأ في الحفظ'); return; }
      showToast(isEditing ? 'تم تعديل السند بنجاح' : 'تم إضافة السند بنجاح');
      setShowModal(false);
      reloadData();
    } catch { setFormError('حدث خطأ أثناء الحفظ'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/vouchers/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف السند بنجاح');
      setDeleteConfirm(null);
      reloadData();
    } catch { showToast('حدث خطأ أثناء الحذف', 'error'); }
  };

  const getTypeName = (t) => ({ receipt: 'سند قبض', payment: 'سند صرف', invoice: 'فاتورة نقدي' }[t] || t);
  const getTypeBadge = (t) => ({ receipt: 'badge-active', payment: 'badge-danger', invoice: 'badge-warning' }[t] || '');

  const filtered = useMemo(() => vouchers.filter(v => {
    const matchType = filterType === 'all' || v.voucher_type === filterType;
    const q = searchQuery.toLowerCase();
    return matchType && (!q || (v.member_name || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
  }), [vouchers, filterType, searchQuery]);

  const totalReceipt = filtered.filter(v => v.voucher_type === 'receipt').reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const totalPayment = filtered.filter(v => v.voucher_type === 'payment').reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const totalInvoice = filtered.filter(v => v.voucher_type === 'invoice').reduce((s, v) => s + parseFloat(v.amount || 0), 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      {/* إحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي سندات القبض', val: totalReceipt, color: 'var(--success)' },
          { label: 'إجمالي سندات الصرف', val: totalPayment, color: 'var(--danger)' },
          { label: 'إجمالي الفواتير النقدية', val: totalInvoice, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: s.color }}>
              {s.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
            </span>
          </div>
        ))}
      </div>

      {/* فلاتر */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">نوع السند</label>
              <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">الكل</option>
                <option value="receipt">سند قبض</option>
                <option value="payment">سند صرف</option>
                <option value="invoice">فاتورة نقدي</option>
              </select>
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label className="form-label">بحث</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input type="text" className="form-input" style={{ paddingRight: '36px' }} placeholder="ابحث باسم العضو أو البيان..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" onClick={openAddModal}>➕ إضافة سند</button>
            </div>
          </div>
        </div>
      </div>

      {/* جدول */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}><span>📋</span><span>سجل السندات ({filtered.length})</span></h3>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-text">لا توجد سندات لعرضها</div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th>العضو</th><th>المبلغ</th><th>البيان</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {filtered.map((v, idx) => (
                  <tr key={v.id}>
                    <td data-label="#">{idx + 1}</td>
                    <td data-label="التاريخ">{v.voucher_date ? v.voucher_date.split('T')[0] : '—'}</td>
                    <td data-label="النوع"><span className={`badge ${getTypeBadge(v.voucher_type)}`}>{getTypeName(v.voucher_type)}</span></td>
                    <td data-label="العضو" style={{ fontWeight: 600 }}>{v.member_name || '—'}</td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: v.voucher_type === 'receipt' ? 'var(--success)' : 'var(--danger)' }}>
                      {parseFloat(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
                    </td>
                    <td data-label="البيان">{v.description || '—'}</td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(v)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(v)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال إضافة/تعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingVoucher ? '✏️ تعديل السند' : '➕ إضافة سند جديد'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">نوع السند *</label>
                  <select className="form-select" value={form.voucher_type} onChange={e => setForm({ ...form, voucher_type: e.target.value })} required>
                    <option value="receipt">🟢 سند قبض</option>
                    <option value="payment">🔴 سند صرف</option>
                    <option value="invoice">🟡 فاتورة نقدي</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">العضو *</label>
                  <select className="form-select" value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} required>
                    <option value="">-- اختر العضو --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.national_id ? ` — ${m.national_id}` : ''}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input type="number" className="form-input" placeholder="0.00" step="0.001" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-input" value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">البيان / الوصف</label>
                  <textarea className="form-input" placeholder="وصف العملية..." rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
                {formError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>⚠️ {formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editingVoucher ? '💾 حفظ التعديلات' : '➕ إضافة السند'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال الحذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ حذف السند</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف هذا السند؟</p>
              <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.1rem' }}>{getTypeName(deleteConfirm.voucher_type)} — {deleteConfirm.member_name}</p>
              <p style={{ color: 'var(--text-muted)' }}>المبلغ: {parseFloat(deleteConfirm.amount).toLocaleString('en-US')} د.أ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ نعم، احذف</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

// ============================================================
// تبويب الذمم على الديوان
// ============================================================
function DebtsTab({ apiFetch }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [payConfirm, setPayConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('unpaid');
  const [formError, setFormError] = useState('');
  const now = new Date();

  const [form, setForm] = useState({ amount: '', description: '', creditor_name: '', debt_date: now.toISOString().split('T')[0] });

  useEffect(() => { loadDebts(); }, []);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/debts');
      const data = await res.json();
      setDebts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
    setForm({ amount: debt.amount, description: debt.description, creditor_name: debt.creditor_name || '', debt_date: debt.debt_date ? debt.debt_date.split('T')[0] : '' });
    setFormError('');
    setEditingDebt(debt);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.description || !form.debt_date) { setFormError('يرجى تعبئة جميع الحقول المطلوبة'); return; }
    try {
      const isEditing = !!editingDebt;
      const res = await apiFetch(isEditing ? `/api/debts/${editingDebt.id}` : '/api/debts', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || 'خطأ في الحفظ'); return; }
      showToast(isEditing ? 'تم تعديل الذمة بنجاح' : 'تم إضافة الذمة بنجاح');
      setShowModal(false);
      loadDebts();
    } catch { setFormError('حدث خطأ أثناء الحفظ'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/debts/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف الذمة بنجاح');
      setDeleteConfirm(null);
      loadDebts();
    } catch { showToast('حدث خطأ أثناء الحذف', 'error'); }
  };

  const handlePay = async () => {
    if (!payConfirm) return;
    try {
      await apiFetch(`/api/debts/${payConfirm.id}/pay`, { method: 'PUT', body: JSON.stringify({ status: 'paid' }) });
      showToast('تم تسجيل سداد الذمة بنجاح');
      setPayConfirm(null);
      loadDebts();
    } catch { showToast('حدث خطأ أثناء السداد', 'error'); }
  };

  const filtered = debts.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.description.toLowerCase().includes(q) || (e.creditor_name || '').toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      {/* إجمالي */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي الذمم ({filterStatus === 'all' ? 'الكل' : filterStatus === 'unpaid' ? 'غير مسددة' : 'مسددة'})</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--danger)' }}>
            {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
          </span>
        </div>
      </div>

      {/* فلاتر */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">الحالة</label>
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
                <input type="text" className="form-input" style={{ paddingRight: '36px' }} placeholder="ابحث بالبيان أو الجهة الدائنة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" onClick={openAddModal}>➕ إضافة ذمة</button>
            </div>
          </div>
        </div>
      </div>

      {/* جدول */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}><span>📋</span><span>سجل الذمم ({filtered.length})</span></h3>
          {filtered.length > 0 && (
            <div style={{ fontWeight: 'bold', color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
              الإجمالي: {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
            </div>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📜</div><div className="empty-state-text">لا توجد ذمم لعرضها</div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead><tr><th>#</th><th>البيان / الوصف</th><th>الجهة الدائنة</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th><th>تاريخ السداد</th><th>الإجراءات</th></tr></thead>
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
                      {debt.status === 'paid' ? <span className="badge badge-active">✔ مسددة</span> : <span className="badge badge-danger">⏳ غير مسددة</span>}
                    </td>
                    <td data-label="تاريخ السداد">{debt.paid_date ? debt.paid_date.split('T')[0] : '—'}</td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        {debt.status === 'unpaid' && <button className="btn btn-primary btn-sm" onClick={() => setPayConfirm(debt)}>💵 تسديد</button>}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(debt)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(debt)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال إضافة/تعديل */}
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
                  <input type="text" className="form-input" placeholder="سبب الاستدانة..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">الجهة الدائنة</label>
                  <input type="text" className="form-input" placeholder="من هو الدائن؟" value={form.creditor_name} onChange={e => setForm({ ...form, creditor_name: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input type="number" className="form-input" placeholder="0.00" step="0.001" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-input" value={form.debt_date} onChange={e => setForm({ ...form, debt_date: e.target.value })} required />
                  </div>
                </div>
                {formError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>⚠️ {formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editingDebt ? '💾 حفظ التعديلات' : '➕ إضافة الذمة'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال التسديد */}
      {payConfirm && (
        <div className="modal-overlay" onClick={() => setPayConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💵 تسديد الذمة</h3>
              <button className="modal-close" onClick={() => setPayConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من تسديد الذمة:</p>
              <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>"{payConfirm.description}"</p>
              <p style={{ color: 'var(--text-muted)' }}>المبلغ: {parseFloat(payConfirm.amount).toLocaleString('en-US')} د.أ</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handlePay}>✔️ نعم، تم السداد</button>
              <button className="btn btn-secondary" onClick={() => setPayConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال الحذف */}
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

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

// ============================================================
// الصفحة الرئيسية — نظام المحاسبة
// ============================================================
export default function VouchersPage() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('vouchers');

  const tabs = [
    { id: 'vouchers', label: '🧾 السندات والفواتير' },
    { id: 'debts',    label: '📜 الذمم على الديوان' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><span>💼</span><span>النظام المحاسبي</span></h2>
          <p className="page-description">إدارة السندات والفواتير والذمم المالية في مكان واحد</p>
        </div>
      </div>

      {/* تبويبات */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويب النشط */}
      {activeTab === 'vouchers' && <VouchersTab apiFetch={apiFetch} />}
      {activeTab === 'debts'    && <DebtsTab apiFetch={apiFetch} />}
    </div>
  );
}
