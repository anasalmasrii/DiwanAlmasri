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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, defaultersRes] = await Promise.all([
        apiFetch(`/api/dashboard?month=${selectedMonth}`),
        apiFetch(`/api/dashboard/defaulters?month=${selectedMonth}`),
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

  const monthName = stats.currentMonth === 'all' ? 'جميع الأشهر' : arabicMonths[(stats.currentMonth || 1) - 1];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>لوحة المعلومات</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>اختر الشهر:</label>
          <select 
            className="form-control" 
            style={{ 
              width: '150px', 
              backgroundColor: '#1a1f36', 
              color: '#e2e8f0', 
              border: '1px solid #2d3748',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">جميع الأشهر</option>
            {arabicMonths.map((m, i) => (
              <option key={i+1} value={i+1}>{i+1} - {m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="stats-grid">
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="💰"
            value={stats.totalTreasury}
            label="إجمالي الصندوق (قبل المصاريف)"
            color="blue"
            suffix="د.أ"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} title="صافي الصندوق = إجمالي الإيرادات - إجمالي المصاريف">
          <StatCard
            icon="🏦"
            value={stats.netTreasury ?? stats.totalTreasury}
            label="صافي الصندوق (بعد المصاريف)"
            color="green"
            suffix="د.أ"
          />
        </Link>
        <Link to="/expenses" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="🛠️"
            value={stats.totalExpenses ?? 0}
            label="إجمالي المصاريف والصيانة"
            color="red"
            suffix="د.أ"
          />
        </Link>
        <Link to="/members" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="👥"
            value={stats.totalMembers}
            label="إجمالي الأعضاء النشطين"
            color="gold"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="💰"
            value={stats.monthlyRevenueTotal}
            label={stats.currentMonth === 'all' ? 'إجمالي إيرادات جميع الأشهر' : `إجمالي إيرادات شهر ${stats.currentMonth}`}
            color="green"
            suffix="د.أ"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="💵"
            value={stats.monthlyRevenueSubscriptions}
            label="إيرادات الاشتراكات"
            color="blue"
            suffix="د.أ"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="🎁"
            value={stats.monthlyRevenueContributions}
            label="إيرادات المساهمات"
            color="gold"
            suffix="د.أ"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="✅"
            value={stats.paidSubscriptionsCount}
            label={`المسددون للاشتراك (شهر ${stats.currentMonth})`}
            color="blue"
          />
        </Link>
        <Link to="/payments" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon="✨"
            value={stats.paidContributionsCount}
            label="المسددون للمساهمات"
            color="gold"
          />
        </Link>
        <Link to="/defaulters" style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          <StatCard
            icon={stats.currentMonth === 'all' ? '⚠️' : (stats.isAfterDeadline ? '🚨' : '⏳')}
            value={stats.unpaidCount}
            label={
              stats.currentMonth === 'all'
                ? 'متخلفين عن السداد كلياً'
                : (stats.isAfterDeadline
                  ? 'متخلفين عن السداد'
                  : 'لم يسددوا بعد')
            }
            color="red"
          />
        </Link>
      </div>

      {/* تنبيه الموعد النهائي */}
      {stats.currentMonth !== 'all' && (
        <div className={`deadline-banner ${stats.isAfterDeadline ? 'after' : 'before'}`}>
          <span className="deadline-icon">{stats.isAfterDeadline ? '🔴' : '🟡'}</span>
          <span>
            {stats.isAfterDeadline
              ? `انتهى الموعد النهائي للسداد (يوم 25 من ${monthName}). الأعضاء غير المسددين يُعتبرون متخلفين.`
              : `الموعد النهائي للسداد: يوم 25 من ${monthName}. لا يزال هناك وقت للسداد.`}
          </span>
        </div>
      )}

      {/* قائمة مختصرة للمتخلفين */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span>⚠️</span>
            <span>
              {stats.currentMonth === 'all'
                ? 'لم يسددوا أي اشتراك إطلاقاً'
                : (stats.isAfterDeadline
                  ? `المتخلفين عن سداد ${monthName}`
                  : `لم يسددوا بعد - ${monthName}`)
              }
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
