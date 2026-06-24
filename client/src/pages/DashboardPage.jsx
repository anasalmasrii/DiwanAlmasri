/**
 * صفحة لوحة المعلومات
 * =====================
 * ملخص سريع مع بطاقات الإحصائيات ومعاينة المتخلفين
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { arabicMonths } from '../components/Header';

export default function DashboardPage() {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, defaultersRes] = await Promise.all([
        apiFetch('/api/dashboard'),
        apiFetch('/api/dashboard/defaulters'),
      ]);

      const statsData = await statsRes.json();
      const defaultersData = await defaultersRes.json();

      setStats(statsData);
      setDefaulters(defaultersData.defaulters || []);
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

  if (!stats) return null;

  const monthName = arabicMonths[(stats.currentMonth || 1) - 1];

  return (
    <div>
      {/* بطاقات الإحصائيات */}
      <div className="stats-grid">
        <StatCard
          icon="👥"
          value={stats.totalMembers}
          label="إجمالي الأعضاء النشطين"
          color="gold"
        />
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="💰"
            value={stats.monthlyRevenueTotal}
            label={`إجمالي إيرادات ${monthName}`}
            color="green"
            suffix="د.أ"
          />
        </Link>
        <StatCard
          icon="💵"
          value={stats.monthlyRevenueSubscriptions}
          label="إيرادات الاشتراكات"
          color="blue"
          suffix="د.أ"
        />
        <StatCard
          icon="🎁"
          value={stats.monthlyRevenueContributions}
          label="إيرادات المساهمات"
          color="gold"
          suffix="د.أ"
        />
        <StatCard
          icon="✅"
          value={stats.paidSubscriptionsCount}
          label={`المسددون للاشتراك (${monthName})`}
          color="blue"
        />
        <StatCard
          icon="✨"
          value={stats.paidContributionsCount}
          label="المسددون للمساهمات"
          color="gold"
        />
        <StatCard
          icon={stats.isAfterDeadline ? '🚨' : '⏳'}
          value={stats.unpaidCount}
          label={
            stats.isAfterDeadline
              ? 'متخلفين عن السداد'
              : 'لم يسددوا بعد'
          }
          color="red"
        />
      </div>

      {/* تنبيه الموعد النهائي */}
      <div className={`deadline-banner ${stats.isAfterDeadline ? 'after' : 'before'}`}>
        <span className="deadline-icon">{stats.isAfterDeadline ? '🔴' : '🟡'}</span>
        <span>
          {stats.isAfterDeadline
            ? `انتهى الموعد النهائي للسداد (يوم 25 من ${monthName}). الأعضاء غير المسددين يُعتبرون متخلفين.`
            : `الموعد النهائي للسداد: يوم 25 من ${monthName}. لا يزال هناك وقت للسداد.`}
        </span>
      </div>

      {/* قائمة مختصرة للمتخلفين */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span>⚠️</span>
            <span>
              {stats.isAfterDeadline
                ? `المتخلفين عن سداد ${monthName}`
                : `لم يسددوا بعد - ${monthName}`}
            </span>
          </h2>
          <Link to="/defaulters" className="btn btn-secondary btn-sm">
            عرض الكل ←
          </Link>
        </div>

        {defaulters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-text">جميع الأعضاء سددوا اشتراكاتهم!</div>
            <div className="empty-state-sub">لا يوجد متخلفين عن السداد</div>
          </div>
        ) : (
          <div>
            {defaulters.slice(0, 5).map((d) => (
              <div key={d.id} className="defaulter-item">
                <div className="defaulter-info">
                  <div className="defaulter-name">{d.full_name}</div>
                  <div className="defaulter-phone">{d.phone_number || 'لا يوجد رقم'}</div>
                </div>
                <div className="defaulter-meta">
                  <span className="badge badge-gold">
                    {d.total_payments} دفعة سابقة
                  </span>
                </div>
              </div>
            ))}
            {defaulters.length > 5 && (
              <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                <Link to="/defaulters" className="btn btn-secondary btn-sm">
                  عرض جميع المتخلفين ({defaulters.length})
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
