/**
 * صفحة الاشتراكات والدفعات
 * ==========================
 * تسجيل الدفعات الشهرية وعرض السجل
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { arabicMonths } from '../components/Header';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';
registerLocale('ar', ar);

export default function PaymentsPage() {
  const { apiFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState('');

  // فلاتر العرض
  const now = new Date();
  const location = useLocation();
  const initialMemberFilter = location.state?.memberId || '';
  
  const [filterMonth, setFilterMonth] = useState(initialMemberFilter ? '' : now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(initialMemberFilter ? '' : now.getFullYear());
  const [filterMember, setFilterMember] = useState(initialMemberFilter);

  // حقول نموذج الدفعة
  const [form, setForm] = useState({
    member_id: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    amount: '',
    payment_date: now.toISOString().split('T')[0],
    payment_type: 'اشتراك',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filterMonth, filterYear, filterMember]);

  const loadData = async () => {
    try {
      let queryUrl = `/api/payments?`;
      if (filterMonth) queryUrl += `month=${filterMonth}&`;
      if (filterYear) queryUrl += `year=${filterYear}&`;
      if (filterMember) queryUrl += `member_id=${filterMember}`;

      const [paymentsRes, membersRes] = await Promise.all([
        apiFetch(queryUrl),
        apiFetch('/api/members'),
      ]);

      const paymentsData = await paymentsRes.json();
      const membersData = await membersRes.json();

      setPayments(paymentsData);
      setMembers(membersData);
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setForm({
      member_id: '',
      month: filterMonth,
      year: filterYear,
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'اشتراك',
      notes: '',
    });
    setFormError('');
    setEditingPayment(null);
    setShowModal(true);
  };

  const openEditModal = (payment) => {
    setForm({
      member_id: payment.member_id,
      month: payment.month,
      year: payment.year,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_type: payment.payment_type || 'اشتراك',
      notes: payment.notes || '',
    });
    setFormError('');
    setEditingPayment(payment);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.member_id || !form.amount) {
      setFormError('يرجى اختيار العضو وتحديد المبلغ');
      return;
    }

    try {
      const isEditing = !!editingPayment;
      const url = isEditing ? `/api/payments/${editingPayment.id}` : '/api/payments';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...form,
          member_id: Number(form.member_id),
          month: Number(form.month),
          year: Number(form.year),
          amount: Number(form.amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'خطأ في حفظ الدفعة');
        return;
      }

      showToast(isEditing ? 'تم تعديل الدفعة بنجاح' : 'تم تسجيل الدفعة بنجاح');
      setShowModal(false);
      setEditingPayment(null);
      loadData();
    } catch (err) {
      setFormError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await apiFetch(`/api/payments/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف الدفعة بنجاح');
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  // توليد قائمة السنوات
  const years = [];
  for (let y = 2020; y <= now.getFullYear() + 1; y++) years.push(y);

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* رأس الصفحة */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>💰</span>
            <span>الاشتراكات والدفعات</span>
          </h2>
          <p className="page-description">تسجيل وتتبع المدفوعات الشهرية للأعضاء</p>
        </div>
        <button id="add-payment-btn" className="btn btn-primary" onClick={openAddModal}>
          ➕ تسجيل دفعة جديدة
        </button>
      </div>

      {/* الفلاتر */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="form-row" style={{ maxWidth: '800px', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">الشهر</label>
              <select
                id="filter-month"
                className="form-select"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">الكل</option>
                {arabicMonths.map((name, i) => (
                  <option key={i} value={i + 1}>
                    شهر {i + 1} ({name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">السنة</label>
              <select
                id="filter-year"
                className="form-select"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">الكل</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">العضو</label>
              <select
                className="form-select"
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
              >
                <option value="">جميع الأعضاء</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* جدول الدفعات */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>📋</span>
            <span>
              دفعات {arabicMonths[filterMonth - 1]} {filterYear} ({payments.length} دفعة)
            </span>
          </h3>
          {payments.length > 0 && (
            <div style={{ fontWeight: 'bold', color: 'var(--success)', background: 'var(--success-bg, rgba(16, 185, 129, 0.1))', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              المجموع: {totalAmount.toLocaleString('ar-JO')} د.أ
            </div>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💸</div>
            <div className="empty-state-text">لا توجد دفعات لهذا الشهر</div>
            <div className="empty-state-sub">ابدأ بتسجيل دفعات الأعضاء</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم العضو</th>
                  <th>الشهر</th>
                  <th>المبلغ</th>
                  <th>النوع</th>
                  <th>تاريخ الدفع</th>
                  <th>ملاحظات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => (
                  <tr key={payment.id}>
                    <td data-label="#" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td data-label="اسم العضو" style={{ fontWeight: 600 }}>{payment.member_name}</td>
                    <td data-label="الشهر">
                      <span className="badge badge-info">
                        {arabicMonths[payment.month - 1]} {payment.year}
                      </span>
                    </td>
                    <td data-label="المبلغ" style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {payment.amount.toLocaleString('ar-JO')} د.أ
                    </td>
                    <td data-label="النوع"><span className={`badge ${payment.payment_type === 'تبرع' ? 'badge-warning' : 'badge-active'}`}>{payment.payment_type || 'اشتراك'}</span></td>
                    <td data-label="تاريخ الدفع">{payment.payment_date}</td>
                    <td data-label="ملاحظات" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={payment.notes}>
                      {payment.notes || '—'}
                    </td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(payment)}
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(payment)}
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

      {/* نافذة تسجيل دفعة جديدة */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingPayment ? 'تعديل دفعة' : 'تسجيل دفعة جديدة'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="login-error">⚠️ {formError}</div>}
                <div className="form-group">
                  <label className="form-label">العضو</label>
                <select
                  className="form-select"
                  value={form.member_id}
                  onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                  disabled={!!editingPayment}
                >
                  <option value="">-- اختر العضو --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الشهر *</label>
                    <select
                      id="payment-month"
                      className="form-select"
                      value={form.month}
                      onChange={(e) => setForm({ ...form, month: e.target.value })}
                    >
                      {arabicMonths.map((name, i) => (
                        <option key={i} value={i + 1}>
                          شهر {i + 1} ({name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">السنة *</label>
                    <select
                      id="payment-year"
                      className="form-select"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input
                      id="payment-amount"
                      type="text"
                      inputMode="decimal"
                      className="form-input"
                      placeholder="مثال: 50"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الدفع *</label>
                    <DatePicker
                      selected={form.payment_date ? new Date(form.payment_date) : null}
                      onChange={(date) => setForm({ ...form, payment_date: date ? date.toLocaleDateString('en-CA') : '' })}
                      dateFormat="yyyy/MM/dd"
                      locale="ar"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">نوع الدفع *</label>
                    <select
                      className="form-select"
                      value={form.payment_type}
                      onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                      required
                    >
                      <option value="اشتراك">اشتراك</option>
                      <option value="تبرع">تبرع</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="أي ملاحظات إضافية حول الدفعة"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingPayment ? '💾 حفظ التعديلات' : '💾 حفظ الدفعة'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* حوار تأكيد الحذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-body">
              <div className="confirm-dialog">
                <div className="confirm-icon">⚠️</div>
                <div className="confirm-text">هل أنت متأكد من حذف هذه الدفعة؟</div>
                <div className="confirm-name">
                  {deleteConfirm.member_name} — {arabicMonths[deleteConfirm.month - 1]}{' '}
                  {deleteConfirm.year}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={handleDelete}>
                🗑️ حذف نهائي
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* إشعار */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
