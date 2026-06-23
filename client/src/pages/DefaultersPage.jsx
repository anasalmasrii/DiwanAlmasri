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
            <span>
              {isAfterDeadline ? 'المتخلفين عن السداد' : 'لم يسددوا بعد'}
            </span>
          </h2>
          <p className="page-description">
            {monthName} {data.currentYear} — {defaulters.length} عضو
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadDefaulters}>
          🔄 تحديث
        </button>
      </div>

      {/* تنبيه الموعد النهائي */}
      <div className={`deadline-banner ${isAfterDeadline ? 'after' : 'before'}`}>
        <span className="deadline-icon">{isAfterDeadline ? '🔴' : '🟡'}</span>
        <div>
          <strong style={{ display: 'block', marginBottom: '4px' }}>
            {isAfterDeadline
              ? '⛔ انتهى الموعد النهائي للسداد!'
              : '⏳ الموعد النهائي لم يحن بعد'}
          </strong>
          <span>
            {isAfterDeadline
              ? `تجاوز الأعضاء التالية أسماؤهم الموعد النهائي (25 ${monthName}) دون سداد الاشتراك الشهري.`
              : `الموعد النهائي لسداد اشتراك ${monthName} هو يوم 25. الأعضاء أدناه لم يسددوا بعد ولكن لا يزال أمامهم وقت.`}
          </span>
        </div>
      </div>

      {/* قائمة المتخلفين */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span>{isAfterDeadline ? '🚨' : '📋'}</span>
            <span>
              {isAfterDeadline
                ? `قائمة المتخلفين — ${monthName} ${data.currentYear}`
                : `لم يسددوا بعد — ${monthName} ${data.currentYear}`}
            </span>
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
                      <span
                        className={`badge ${
                          isAfterDeadline ? 'badge-inactive' : 'badge-warning'
                        }`}
                      >
                        {isAfterDeadline ? '🔴 متخلف' : '🟡 لم يسدد بعد'}
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
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
                {defaulters.length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isAfterDeadline ? 'عضو متخلف' : 'عضو لم يسدد'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>
                25 {monthName}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                الموعد النهائي
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: isAfterDeadline ? 'var(--danger)' : 'var(--warning)',
                }}
              >
                {isAfterDeadline ? '⛔' : '⏳'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isAfterDeadline ? 'تجاوز الموعد' : 'لم يحن الموعد'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
