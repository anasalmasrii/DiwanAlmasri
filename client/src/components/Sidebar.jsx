/**
 * مكون الشريط الجانبي
 * ====================
 * يعرض الروابط بناءً على صلاحيات المستخدم
 */

import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { logout, hasPermission, user } = useAuth();

  // الروابط المتاحة حسب الصلاحيات
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'لوحة المعلومات', perm: 'dashboard' },
    { path: '/members', icon: '👥', label: 'إدارة الأعضاء', perm: 'members' },
    { path: '/join-requests', icon: '📝', label: 'الأعضاء المنتسبين', perm: 'members' },
    { path: '/payments', icon: '💰', label: 'الاشتراكات والدفعات', perm: 'payments' },
    { path: '/defaulters', icon: '⚠️', label: 'المتخلفين عن السداد', perm: 'defaulters' },
    { path: '/expenses', icon: '🛠️', label: 'مصاريف وصيانة الديوان', perm: 'expenses' },
    { path: '/reports', icon: '📄', label: 'التقارير والطباعة', perm: null },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <Link to="/dashboard" className="sidebar-header" onClick={onClose} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div className="sidebar-logo">
          <img src="/DiwanAlmasri-logo.png" alt="شعار" className="sidebar-logo-icon" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '-15px' }} />
          <span>ديوان المصري</span>
        </div>
        <div className="sidebar-subtitle">نظام إدارة الاشتراكات</div>
      </Link>

      <nav className="sidebar-nav">
        {navItems.map((item) =>
          (!item.perm || hasPermission(item.perm)) ? (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ) : null
        )}

        {/* الإعدادات - متاحة للجميع (لتغيير كلمة المرور) والمسؤول الرئيسي (لإدارة المسؤولين) */}
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="nav-link-icon">⚙️</span>
          <span>الإعدادات</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {/* عرض اسم المستخدم */}
        <div style={{
          padding: '8px 16px',
          marginBottom: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>👤</span>
          <span>{user?.full_name || user?.username}</span>
          {user?.role === 'super_admin' && (
            <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              رئيسي
            </span>
          )}
        </div>
        <button className="logout-btn" onClick={logout}>
          <span className="nav-link-icon">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
