/**
 * صفحة المتخلفين عن السداد
 * ==========================
 * عرض الأعضاء الذين لم يسددوا اشتراك الشهر الحالي
 * مع تمييز حالة الموعد النهائي (قبل/بعد يوم 25)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { arabicMonths } from '../components/Header';

export default function DefaultersPage() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDefaulters();
  }, []);

  const loadDefaulters = async () => {
    try {
      const res = await apiFetch('/api/dashboard/defaulters');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!data) return null;

  const monthName = arabicMonths[(data.currentMonth || 1) - 1];
  const { defaulters, isAfterDeadline } = data;

  return (
    <div>
      {/* رأس الصفحة */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>⚠️</span>
            <span>المتخلفين عن السداد</span>
          </h2>
          <p className="page-description">
            {monthName} {data.currentYear} — {defaulters.length} عضو متأخر
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadDefaulters}>
          🔄 تحديث
        </button>
      </div>

      {/* تنبيه الاستحقاق */}
      <div className="deadline-banner after">
        <span className="deadline-icon">🔴</span>
        <div>
          <strong style={{ display: 'block', marginBottom: '4px' }}>
            اشتراكات متأخرة
          </strong>
          <span>
            تستحق الاشتراكات بداية كل شهر. الأعضاء أدناه متأخرين عن سداد اشتراك {monthName}.
          </span>
        </div>
      </div>

      {/* قائمة المتخلفين */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>🚨</span>
            <span>قائمة المتخلفين — {monthName} {data.currentYear}</span>
          </h3>
          <span className={`badge ${isAfterDeadline ? 'badge-inactive' : 'badge-warning'}`}>
            {defaulters.length} عضو
          </span>
        </div>

        {defaulters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">ممتاز! جميع الأعضاء سددوا اشتراكاتهم</div>
            <div className="empty-state-sub">
              لا يوجد متخلفين عن سداد اشتراك {monthName}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم الكامل</th>
                  <th>رقم الهاتف</th>
                  <th>تاريخ الانضمام</th>
                  <th>إجمالي الدفعات السابقة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((member, idx) => (
                  <tr key={member.id}>
                    <td data-label="#" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td data-label="الاسم الكامل" style={{ fontWeight: 600 }}>{member.full_name}</td>
                    <td data-label="رقم الهاتف" style={{ direction: 'ltr', textAlign: 'right' }}>
                      {member.phone_number || '—'}
                    </td>
                    <td data-label="تاريخ الانضمام">{member.join_date ? member.join_date.split('T')[0] : '—'}</td>
                    <td data-label="إجمالي الدفعات السابقة">
                      <span className="payment-count">{member.total_payments || 0}</span>
                    </td>
                    <td data-label="الحالة">
                      <span className="badge badge-inactive">
                        🔴 متخلف
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ملخص */}
      <div
        className="card"
        style={{ marginTop: '20px' }}
      >
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              gap: '20px',
              textAlign: 'center',
              justifyContent: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
                {defaulters.length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                عضو متخلف
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
