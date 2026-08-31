import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function VouchersPage() {
  const { apiFetch } = useAuth();
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.all([
        apiFetch('/api/vouchers'),
        apiFetch('/api/members'),
      ]);
      const vData = await vRes.json();
      const mData = await mRes.json();
      setVouchers(Array.isArray(vData) ? vData : []);
      setMembers(Array.isArray(mData) ? mData : []);
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
    setEditingVoucher(null);
    setFormError('');
    setForm({
      voucher_type: 'receipt',
      amount: '',
      member_id: '',
      description: '',
      voucher_date: now.toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setFormError('');
    setForm({
      voucher_type: voucher.voucher_type,
      amount: voucher.amount,
      member_id: voucher.member_id,
      description: voucher.description || '',
      voucher_date: voucher.voucher_date ? voucher.voucher_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.member_id || !form.voucher_date) {
      setFormError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      const isEditing = !!editingVoucher;
      const url = isEditing ? `/api/vouchers/${editingVoucher.id}` : '/api/vouchers';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), member_id: parseInt(form.member_id) }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'خطأ في الحفظ');
        return;
      }

      showToast(isEditing ? 'تم تعديل السند بنجاح' : 'تم إضافة السند بنجاح');
      setShowModal(false);
      loadData();
    } catch {
      setFormError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/vouchers/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف السند بنجاح');
      setDeleteConfirm(null);
      loadData();
    } catch {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'receipt': return 'سند قبض';
      case 'payment': return 'سند صرف';
      case 'invoice': return 'فاتورة نقدي';
      default: return type;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'receipt': return 'badge-active';
      case 'payment': return 'badge-danger';
      case 'invoice': return 'badge-warning';
      default: return '';
    }
  };

  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const matchesType = filterType === 'all' || v.voucher_type === filterType;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (v.member_name || '').toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [vouchers, filterType, searchQuery]);

  const totalReceipt = filtered.filter(v => v.voucher_type === 'receipt').reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const totalPayment = filtered.filter(v => v.voucher_type === 'payment').reduce((s, v) => s + parseFloat(v.amount || 0), 0);
  const totalInvoice = filtered.filter(v => v.voucher_type === 'invoice').reduce((s, v) => s + parseFloat(v.amount || 0), 0);

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
            <span>🧾</span>
            <span>السندات المحاسبية والفواتير</span>
          </h2>
          <p className="page-description">إدارة سندات القبض والصرف والفواتير النقدية مرتبطةً بالأعضاء</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ إضافة سند جديد
        </button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="stats-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي سندات القبض</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
            {totalReceipt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
          </span>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي سندات الصرف</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--danger)' }}>
            {totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
          </span>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي الفواتير النقدية</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--warning)' }}>
            {totalInvoice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
          </span>
        </div>
      </div>

      {/* فلاتر البحث */}
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
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="ابحث باسم العضو أو البيان..."
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
            <span>سجل السندات ({filtered.length})</span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-text">لا توجد سندات لعرضها</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>العضو</th>
                  <th>المبلغ</th>
                  <th>البيان</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((voucher, idx) => (
                  <tr key={voucher.id}>
                    <td data-label="#">{idx + 1}</td>
                    <td data-label="التاريخ">{voucher.voucher_date ? voucher.voucher_date.split('T')[0] : '—'}</td>
                    <td data-label="النوع">
                      <span className={`badge ${getTypeBadge(voucher.voucher_type)}`}>
                        {getTypeName(voucher.voucher_type)}
                      </span>
                    </td>
                    <td data-label="العضو" style={{ fontWeight: 600 }}>{voucher.member_name || '—'}</td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: voucher.voucher_type === 'receipt' ? 'var(--success)' : 'var(--danger)' }}>
                      {parseFloat(voucher.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} د.أ
                    </td>
                    <td data-label="البيان">{voucher.description || '—'}</td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(voucher)} title="تعديل">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(voucher)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال الإضافة / التعديل */}
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
                  <select
                    className="form-select"
                    value={form.voucher_type}
                    onChange={e => setForm({ ...form, voucher_type: e.target.value })}
                    required
                  >
                    <option value="receipt">🟢 سند قبض</option>
                    <option value="payment">🔴 سند صرف</option>
                    <option value="invoice">🟡 فاتورة نقدي</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">العضو *</label>
                  <select
                    className="form-select"
                    value={form.member_id}
                    onChange={e => setForm({ ...form, member_id: e.target.value })}
                    required
                  >
                    <option value="">-- اختر العضو --</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}{member.national_id ? ` — ${member.national_id}` : ''}
                      </option>
                    ))}
                  </select>
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
                      value={form.voucher_date}
                      onChange={e => setForm({ ...form, voucher_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البيان / الوصف</label>
                  <textarea
                    className="form-input"
                    placeholder="وصف العملية..."
                    rows="3"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    style={{ resize: 'vertical' }}
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
                  {editingVoucher ? '💾 حفظ التعديلات' : '➕ إضافة السند'}
                </button>
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
              <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.1rem' }}>
                {getTypeName(deleteConfirm.voucher_type)} — {deleteConfirm.member_name}
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                المبلغ: {parseFloat(deleteConfirm.amount).toLocaleString('en-US')} د.أ
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ نعم، احذف</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* رسالة Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
