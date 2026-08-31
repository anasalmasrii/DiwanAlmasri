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
// تبويب الفواتير النقدية
// ============================================================
function InvoicesTab({ apiFetch }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState('');
  const now = new Date();

  const emptyItem = () => ({ item_description: '', quantity: 1, unit_price: 0 });
  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: now.toISOString().split('T')[0],
    payment_type: 'cash',
    customer_name: '',
    notes: '',
    items: [emptyItem()],
  });

  useEffect(() => { loadInvoices(); fetchNextNumber(); }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/invoices');
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchNextNumber = async () => {
    try {
      const res = await apiFetch('/api/invoices/next-number');
      const data = await res.json();
      setForm(f => ({ ...f, invoice_number: data.next_number }));
    } catch (err) { console.error(err); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = async () => {
    const res = await apiFetch('/api/invoices/next-number');
    const data = await res.json();
    setEditingInvoice(null);
    setFormError('');
    setForm({
      invoice_number: data.next_number,
      invoice_date: now.toISOString().split('T')[0],
      payment_type: 'cash',
      customer_name: '',
      notes: '',
      items: [emptyItem()],
    });
    setShowModal(true);
  };

  const openEditModal = async (invoice) => {
    const res = await apiFetch(`/api/invoices/${invoice.id}`);
    const data = await res.json();
    setEditingInvoice(data);
    setFormError('');
    setForm({
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date ? data.invoice_date.split('T')[0] : '',
      payment_type: data.payment_type || 'cash',
      customer_name: data.customer_name || '',
      notes: data.notes || '',
      items: data.items && data.items.length > 0 ? data.items : [emptyItem()],
    });
    setShowModal(true);
  };

  const openPrint = async (invoice) => {
    const res = await apiFetch(`/api/invoices/${invoice.id}`);
    const data = await res.json();
    setPrintInvoice(data);
    setShowPrint(true);
  };

  const updateItem = (idx, field, value) => {
    const updated = form.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setForm({ ...form, items: updated });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const grandTotal = form.items.reduce((s, item) => s + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.customer_name || !form.invoice_date) { setFormError('اسم العميل والتاريخ مطلوبان'); return; }
    const validItems = form.items.filter(i => i.item_description.trim());
    if (validItems.length === 0) { setFormError('أدخل عنصراً واحداً على الأقل'); return; }
    try {
      const isEditing = !!editingInvoice;
      const res = await apiFetch(isEditing ? `/api/invoices/${editingInvoice.id}` : '/api/invoices', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, items: validItems }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || 'خطأ في الحفظ'); return; }
      showToast(isEditing ? 'تم تعديل الفاتورة بنجاح' : 'تم إنشاء الفاتورة بنجاح');
      setShowModal(false);
      loadInvoices();
    } catch { setFormError('حدث خطأ أثناء الحفظ'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/invoices/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف الفاتورة بنجاح');
      setDeleteConfirm(null);
      loadInvoices();
    } catch { showToast('حدث خطأ أثناء الحذف', 'error'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      {/* رأس القسم */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={openAddModal}>➕ فاتورة جديدة</button>
      </div>

      {/* قائمة الفواتير */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ margin: 0 }}><span>🧾</span><span>الفواتير النقدية ({invoices.length})</span></h3>
        </div>
        {invoices.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-text">لا توجد فواتير بعد</div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>العميل</th><th>نوع الدفع</th><th>الإجمالي</th><th>الإجراءات</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td data-label="رقم الفاتورة" style={{ fontWeight: 700, color: 'var(--accent)' }}>#{inv.invoice_number}</td>
                    <td data-label="التاريخ">{inv.invoice_date ? inv.invoice_date.split('T')[0] : '—'}</td>
                    <td data-label="العميل" style={{ fontWeight: 600 }}>{inv.customer_name}</td>
                    <td data-label="نوع الدفع">
                      <span className={`badge ${inv.payment_type === 'cash' ? 'badge-active' : 'badge-warning'}`}>
                        {inv.payment_type === 'cash' ? '💵 نقداً' : '📋 ذمم'}
                      </span>
                    </td>
                    <td data-label="الإجمالي" style={{ fontWeight: 700 }}>
                      {parseFloat(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ
                    </td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-primary btn-sm" onClick={() => openPrint(inv)} title="طباعة">🖨️</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(inv)} title="تعديل">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(inv)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال إنشاء / تعديل الفاتورة */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingInvoice ? '✏️ تعديل الفاتورة' : '➕ فاتورة جديدة'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* معلومات الفاتورة */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">رقم الفاتورة *</label>
                    <input type="number" className="form-input" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-input" value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع الدفع</label>
                    <select className="form-select" value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}>
                      <option value="cash">💵 نقداً</option>
                      <option value="credit">📋 ذمم</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">المطلوب من السادة (اسم العميل) *</label>
                  <input type="text" className="form-input" placeholder="اسم العميل أو الجهة..." value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required />
                </div>

                {/* جدول العناصر */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>عناصر الفاتورة *</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ إضافة عنصر</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                          <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>البيان / الصنف</th>
                          <th style={{ padding: '8px', border: '1px solid var(--border)', width: '80px', textAlign: 'center' }}>الكمية</th>
                          <th style={{ padding: '8px', border: '1px solid var(--border)', width: '120px', textAlign: 'center' }}>سعر الوحدة</th>
                          <th style={{ padding: '8px', border: '1px solid var(--border)', width: '120px', textAlign: 'center' }}>الإجمالي</th>
                          <th style={{ padding: '8px', border: '1px solid var(--border)', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, idx) => {
                          const rowTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
                          return (
                            <tr key={idx}>
                              <td style={{ border: '1px solid var(--border)', padding: '4px' }}>
                                <input type="text" className="form-input" style={{ margin: 0, border: 'none', background: 'transparent', padding: '4px 8px' }} placeholder="اسم الصنف أو الخدمة" value={item.item_description} onChange={e => updateItem(idx, 'item_description', e.target.value)} />
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px' }}>
                                <input type="number" className="form-input" style={{ margin: 0, border: 'none', background: 'transparent', padding: '4px', textAlign: 'center' }} min="0" step="any" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px' }}>
                                <input type="number" className="form-input" style={{ margin: 0, border: 'none', background: 'transparent', padding: '4px', textAlign: 'center' }} min="0" step="any" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '8px', textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>
                                {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                              </td>
                              <td style={{ border: '1px solid var(--border)', padding: '4px', textAlign: 'center' }}>
                                {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.1rem' }}>✕</button>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3" style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'left', fontWeight: 700 }}>المجموع الكلي</td>
                          <td style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
                            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ
                          </td>
                          <td style={{ border: '1px solid var(--border)' }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-input" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
                </div>

                {formError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px', padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>⚠️ {formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editingInvoice ? '💾 حفظ التعديلات' : '✅ إنشاء الفاتورة'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال الطباعة */}
      {showPrint && printInvoice && (
        <div className="modal-overlay" onClick={() => setShowPrint(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', background: 'white', color: '#000' }}>
            <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }} id="print-area">
              {/* رأس الفاتورة */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem' }}>رقم: <strong>{printInvoice.invoice_number}</strong></div>
                  <div style={{ fontSize: '0.9rem' }}>التاريخ: <strong>{printInvoice.invoice_date ? printInvoice.invoice_date.split('T')[0] : ''}</strong></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>فاتورة Invoice</h2>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.85rem' }}>
                    <label><input type="radio" readOnly checked={printInvoice.payment_type === 'cash'} /> نقداً Cash</label>
                    <label><input type="radio" readOnly checked={printInvoice.payment_type === 'credit'} /> ذمم Credit</label>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>ديوان المصري</div>
              </div>

              {/* اسم العميل */}
              <div style={{ marginBottom: '12px', fontSize: '0.95rem', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
                <span>المطلوب من السادة: </span><strong>{printInvoice.customer_name}</strong>
              </div>

              {/* جدول العناصر */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'right' }}>البيان</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', width: '70px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', width: '110px', textAlign: 'center' }}>الإفرادي</th>
                    <th style={{ border: '1px solid #ccc', padding: '6px', width: '110px', textAlign: 'center' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(printInvoice.items || []).map((item, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px' }}>{item.item_description}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{parseFloat(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 3 })}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', fontWeight: 600 }}>{parseFloat(item.total).toLocaleString('en-US', { minimumFractionDigits: 3 })}</td>
                    </tr>
                  ))}
                  {/* صفوف فارغة للشكل */}
                  {Array.from({ length: Math.max(0, 5 - (printInvoice.items || []).length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ border: '1px solid #ccc', padding: '12px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #ccc' }}></td>
                      <td style={{ border: '1px solid #ccc' }}></td>
                      <td style={{ border: '1px solid #ccc' }}></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f5f5f5' }}>
                    <td colSpan="3" style={{ border: '1px solid #ccc', padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>المجموع / Total</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>
                      {parseFloat(printInvoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {printInvoice.notes && <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '12px' }}>ملاحظات: {printInvoice.notes}</div>}

              {/* التوقيع */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '0.85rem' }}>
                <div>توقيع المستلم: ____________________</div>
                <div>توقيع المسؤول: ____________________</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '12px', background: 'var(--bg-secondary)' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ طباعة</button>
              <button className="btn btn-secondary" onClick={() => setShowPrint(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال الحذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🗑️ حذف الفاتورة</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف الفاتورة رقم <strong style={{ color: 'var(--accent)' }}>#{deleteConfirm.invoice_number}</strong>؟</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>العميل: {deleteConfirm.customer_name}</p>
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
    { id: 'vouchers', label: '📋 السندات' },
    { id: 'debts',    label: '📜 الذمم' },
    { id: 'invoices', label: '🧾 الفواتير النقدية' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><span>💼</span><span>النظام المحاسبي</span></h2>
          <p className="page-description">إدارة السندات والذمم والفواتير المالية في مكان واحد</p>
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
      {activeTab === 'vouchers'  && <VouchersTab apiFetch={apiFetch} />}
      {activeTab === 'debts'     && <DebtsTab apiFetch={apiFetch} />}
      {activeTab === 'invoices'  && <InvoicesTab apiFetch={apiFetch} />}
    </div>
  );
}
