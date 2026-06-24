/**
 * صفحة إدارة الأعضاء
 * ====================
 * حقول محدثة: الاسم، الرقم الوطني، تاريخ الميلاد، الهاتف
 * الحالة تُحسب تلقائياً بناءً على السداد
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { arabicMonths } from '../components/Header';
import * as XLSX from 'xlsx';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';
registerLocale('ar', ar);

export default function MembersPage() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  // استيراد Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importMapping, setImportMapping] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    date_of_birth: '',
    phone_number: '',
    join_date: new Date().toISOString().split('T')[0],
  });

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    member_id: '',
    member_name: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'اشتراك',
    notes: '',
  });

  // حالة الموعد النهائي
  const isAfterDeadline = new Date().getDate() > 25;

  const loadMembers = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/members?q=${encodeURIComponent(searchQuery)}`
        : '/api/members';
      const res = await apiFetch(url);
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error('خطأ في تحميل الأعضاء:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, apiFetch]);

  useEffect(() => {
    const timer = setTimeout(loadMembers, 300);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setForm({ full_name: '', national_id: '', date_of_birth: '', phone_number: '', join_date: new Date().toISOString().split('T')[0] });
    setEditingMember(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setForm({
      full_name: member.full_name,
      national_id: member.national_id || '',
      date_of_birth: member.date_of_birth || '',
      phone_number: member.phone_number || '',
      join_date: member.join_date || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openPaymentModal = (member) => {
    setPaymentForm({
      member_id: member.id,
      member_name: member.full_name,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'اشتراك',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await apiFetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        showToast('تم تعديل بيانات العضو بنجاح');
      } else {
        await apiFetch('/api/members', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        showToast('تم إضافة العضو بنجاح');
      }
      setShowModal(false);
      resetForm();
      loadMembers();
    } catch (err) {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify(paymentForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل تسجيل الدفعة');
      }

      setShowPaymentModal(false);
      loadMembers(); // refresh member balances
      showToast('تم تسجيل الدفعة بنجاح');
    } catch (err) {
      console.error('Payment error:', err);
      showToast(err.message || 'حدث خطأ أثناء محاولة تسجيل الدفعة.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiFetch(`/api/members/${deleteConfirm.id}`, { method: 'DELETE' });
      showToast('تم حذف العضو بنجاح');
      setDeleteConfirm(null);
      loadMembers();
    } catch (err) {
      console.error(err);
      showToast('فشل حذف العضو', 'error');
    }
  };


  const getStatusBadge = (member) => {
    if (member.payment_status === 'paid') {
      return <span className="badge badge-active">🟢 مسدد</span>;
    }
    if (isAfterDeadline) {
      return <span className="badge badge-inactive">🔴 متخلف</span>;
    }
    return <span className="badge badge-warning">🟡 بانتظار السداد</span>;
  };

  // ===== Excel =====
  const guessMapping = (headers) => {
    const mapping = { full_name: '', national_id: '', date_of_birth: '', phone_number: '' };
    for (const h of headers) {
      const lower = h.toLowerCase();
      if ((lower.includes('اسم') || lower.includes('name') || lower.includes('عضو')) && !mapping.full_name)
        mapping.full_name = h;
      else if ((lower.includes('وطني') || lower.includes('هوية') || lower.includes('national') || lower.includes('id')) && !mapping.national_id)
        mapping.national_id = h;
      else if ((lower.includes('ميلاد') || lower.includes('birth') || lower.includes('تاريخ')) && !mapping.date_of_birth)
        mapping.date_of_birth = h;
      else if ((lower.includes('هاتف') || lower.includes('جوال') || lower.includes('phone') || lower.includes('رقم') || lower.includes('mobile')) && !mapping.phone_number)
        mapping.phone_number = h;
    }
    return mapping;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (jsonData.length === 0) { showToast('الملف فارغ', 'error'); return; }
        const headers = Object.keys(jsonData[0]);
        setImportData({ rows: jsonData, headers, sheetName });
        setImportMapping(guessMapping(headers));
        setImportResult(null);
      } catch { showToast('خطأ في قراءة الملف', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const str = val.toString().trim();
    const dateObj = new Date(str);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000)
      return new Date((num - 25569) * 86400 * 1000).toISOString().split('T')[0];
    return null;
  };

  const handleImport = async () => {
    if (!importData || !importMapping.full_name) {
      showToast('يرجى تحديد عمود الاسم', 'error');
      return;
    }
    setImportLoading(true);
    const membersList = importData.rows.map((row) => ({
      full_name: row[importMapping.full_name] || '',
      national_id: importMapping.national_id ? (row[importMapping.national_id] || '').toString() : '',
      date_of_birth: importMapping.date_of_birth ? parseDate(row[importMapping.date_of_birth]) : null,
      phone_number: importMapping.phone_number ? (row[importMapping.phone_number] || '').toString() : '',
    }));
    try {
      const res = await apiFetch('/api/members/bulk', {
        method: 'POST',
        body: JSON.stringify({ members: membersList }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.success > 0) { showToast(`تم استيراد ${result.success} عضو!`); loadMembers(); }
    } catch { showToast('خطأ أثناء الاستيراد', 'error'); }
    finally { setImportLoading(false); }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportData(null);
    setImportMapping({});
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><span>👥</span><span>إدارة الأعضاء</span></h2>
          <p className="page-description">إضافة وتعديل وحذف أعضاء الديوان</p>
        </div>
        <div className="header-actions">

          <button id="import-excel-btn" className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            📥 استيراد من Excel
          </button>
          <button id="add-member-btn" className="btn btn-primary" onClick={openAddModal}>
            ➕ إضافة عضو جديد
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><span>📋</span><span>قائمة الأعضاء ({members.length})</span></h3>
          <div className="search-box">
            <input id="member-search" type="text" className="form-input" placeholder="بحث بالاسم أو الرقم الوطني أو الهاتف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">{searchQuery ? 'لا توجد نتائج' : 'لا يوجد أعضاء بعد'}</div>
            <div className="empty-state-sub">{searchQuery ? 'جرب كلمات بحث مختلفة' : 'ابدأ بإضافة أعضاء أو استيرادهم من Excel'}</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم الكامل</th>
                  <th>الرقم الوطني</th>
                  <th>تاريخ الميلاد</th>
                  <th>رقم الهاتف</th>
                  <th>حالة السداد</th>
                  <th>الأشهر المتراكمة</th>
                  <th>ما دفعه (د.أ)</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => (
                  <tr key={member.id}>
                    <td data-label="#" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td data-label="الاسم">
                      <div 
                        className="member-name-link"
                        onClick={() => navigate('/payments', { state: { memberId: member.id } })}
                        title="عرض سجل الدفعات"
                      >
                        {member.full_name}
                      </div>
                    </td>
                    <td data-label="الرقم الوطني" style={{ direction: 'ltr', textAlign: 'right' }}>{member.national_id || '—'}</td>
                    <td data-label="تاريخ الميلاد">{member.date_of_birth || '—'}</td>
                    <td data-label="رقم الهاتف" style={{ direction: 'ltr', textAlign: 'right' }}>{member.phone_number || '—'}</td>
                    <td data-label="حالة السداد">{getStatusBadge(member)}</td>
                    <td data-label="الأشهر المتراكمة"><span className={`payment-count ${member.months_owed > 0 ? 'badge-danger' : 'badge-success'}`} style={{ color: member.months_owed > 0 ? 'var(--danger)' : 'var(--success)' }}>{Math.max(0, member.months_owed)} أشهر</span></td>
                    <td data-label="ما دفعه (د.أ)" style={{ fontWeight: 700, color: 'var(--success)' }}>{member.total_paid_amount || 0} د.أ</td>
                    <td data-label="الإجراءات">
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={() => openPaymentModal(member)} title="إضافة دفعة">💰</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(member)} title="تعديل">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(member)} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة/تعديل */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingMember ? '✏️ تعديل بيانات العضو' : '➕ إضافة عضو جديد'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم الكامل *</label>
                  <input id="member-name" type="text" className="form-input" placeholder="أدخل الاسم الكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">الرقم الوطني</label>
                  <input id="member-national-id" type="text" className="form-input" placeholder="أدخل الرقم الوطني" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} style={{ direction: 'ltr', textAlign: 'right' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">تاريخ الميلاد</label>
                    <DatePicker
                      selected={form.date_of_birth ? new Date(form.date_of_birth) : null}
                      onChange={(date) => setForm({ ...form, date_of_birth: date ? date.toLocaleDateString('en-CA') : '' })}
                      dateFormat="yyyy/MM/dd"
                      locale="ar"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      className="form-input"
                      isClearable
                      placeholderText="اختر تاريخ الميلاد"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input id="member-phone" type="tel" className="form-input" placeholder="مثال: 0791234567" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} style={{ direction: 'ltr', textAlign: 'right' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الانضمام / بداية الاشتراك *</label>
                  <DatePicker
                    selected={form.join_date ? new Date(form.join_date) : null}
                    onChange={(date) => setForm({ ...form, join_date: date ? date.toLocaleDateString('en-CA') : '' })}
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
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editingMember ? '💾 حفظ التعديلات' : '➕ إضافة العضو'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة استيراد Excel */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📥 استيراد أعضاء من ملف Excel</h3>
              <button className="modal-close" onClick={closeImportModal}>✕</button>
            </div>
            <div className="modal-body">
              {!importResult && (
                <>
                  <div className="form-group">
                    <label className="form-label">اختر ملف Excel (.xlsx, .xls)</label>
                    <input ref={fileInputRef} id="excel-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="form-input" style={{ padding: '10px' }} />
                  </div>
                  <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: '0.85rem', color: 'var(--accent)' }}>
                    <strong>💡 تعليمات:</strong>
                    <ul style={{ marginTop: '8px', paddingRight: '20px', lineHeight: 2 }}>
                      <li>الأعمدة المدعومة: <strong>الاسم الكامل</strong> (مطلوب)، الرقم الوطني، تاريخ الميلاد، رقم الهاتف</li>
                      <li>النظام يتعرف تلقائياً على الأعمدة</li>
                    </ul>
                  </div>
                  {importData && (
                    <>
                      <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.85rem', color: 'var(--success)' }}>
                        ✅ تم قراءة <strong>{importData.rows.length}</strong> صف من ورقة "{importData.sheetName}"
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '8px' }}>🔗 تعيين الأعمدة</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">الاسم الكامل *</label>
                          <select className="form-select" value={importMapping.full_name} onChange={(e) => setImportMapping({ ...importMapping, full_name: e.target.value })}>
                            <option value="">— اختر —</option>
                            {importData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">الرقم الوطني</label>
                          <select className="form-select" value={importMapping.national_id} onChange={(e) => setImportMapping({ ...importMapping, national_id: e.target.value })}>
                            <option value="">— لا يوجد —</option>
                            {importData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">تاريخ الميلاد</label>
                          <select className="form-select" value={importMapping.date_of_birth} onChange={(e) => setImportMapping({ ...importMapping, date_of_birth: e.target.value })}>
                            <option value="">— لا يوجد —</option>
                            {importData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">رقم الهاتف</label>
                          <select className="form-select" value={importMapping.phone_number} onChange={(e) => setImportMapping({ ...importMapping, phone_number: e.target.value })}>
                            <option value="">— لا يوجد —</option>
                            {importData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '8px' }}>👁️ معاينة (أول 5 صفوف)</h4>
                      <div className="table-wrapper" style={{ maxHeight: '200px', overflow: 'auto' }}>
                        <table className="data-table">
                          <thead><tr><th>#</th>{importData.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                          <tbody>
                            {importData.rows.slice(0, 5).map((row, i) => (
                              <tr key={i}><td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                {importData.headers.map((h) => <td key={h}>{row[h] instanceof Date ? row[h].toLocaleDateString() : row[h]?.toString() || ''}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
              {importResult && (
                <div>
                  <div className="confirm-dialog" style={{ marginBottom: '16px' }}>
                    <div className="confirm-icon">{importResult.failed === 0 ? '🎉' : '⚠️'}</div>
                    <div className="confirm-name" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{importResult.message}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{importResult.success}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>تم الاستيراد</div>
                    </div>
                    <div style={{ background: importResult.failed > 0 ? 'var(--danger-bg)' : 'var(--bg-glass)', border: `1px solid ${importResult.failed > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: importResult.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{importResult.failed}</div>
                      <div style={{ fontSize: '0.85rem', color: importResult.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>فشل</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!importResult ? (
                <>
                  <button className="btn btn-primary" onClick={handleImport} disabled={!importData || !importMapping.full_name || importLoading}>
                    {importLoading ? '⏳ جاري الاستيراد...' : `📥 استيراد ${importData ? importData.rows.length : 0} عضو`}
                  </button>
                  <button className="btn btn-secondary" onClick={closeImportModal}>إلغاء</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={closeImportModal}>✅ تم</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* حذف */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-body">
              <div className="confirm-dialog">
                <div className="confirm-icon">⚠️</div>
                <div className="confirm-text">هل أنت متأكد من حذف هذا العضو؟</div>
                <div className="confirm-name">{deleteConfirm.full_name}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>سيتم حذف جميع بيانات الدفعات المرتبطة نهائياً.</p>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ حذف نهائي</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تسجيل الدفعة السريعة */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تسجيل دفعة لـ {paymentForm.member_name}</h2>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.أ) *</label>
                    <input type="text" inputMode="decimal" className="form-input" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required style={{ direction: 'ltr', textAlign: 'right' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ الدفع *</label>
                    <DatePicker
                      selected={paymentForm.payment_date ? new Date(paymentForm.payment_date) : null}
                      onChange={(date) => setPaymentForm({ ...paymentForm, payment_date: date ? date.toLocaleDateString('en-CA') : '' })}
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
                    <label className="form-label">الشهر *</label>
                    <select className="form-select" value={paymentForm.month} onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })} required>
                      {arabicMonths.map((name, i) => (
                        <option key={i + 1} value={i + 1}>شهر {i + 1} ({name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">السنة *</label>
                    <input type="number" className="form-input" value={paymentForm.year} onChange={(e) => setPaymentForm({ ...paymentForm, year: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">نوع الدفع *</label>
                    <select className="form-select" value={paymentForm.payment_type} onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })} required>
                      <option value="اشتراك">اشتراك</option>
                      <option value="مساهمة">مساهمة</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات (اختياري)</label>
                    <input type="text" className="form-input" placeholder="أي ملاحظات حول الدفعة" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">💰 تسجيل الدفعة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (<div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</div>)}
    </div>
  );
}
