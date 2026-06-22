/**
 * مكون الرأسية
 * =============
 * يعرض عنوان الصفحة الحالية والتاريخ وزر القائمة للجوال
 */

import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const pageTitles = {
  '/dashboard': 'لوحة المعلومات',
  '/members': 'إدارة الأعضاء',
  '/payments': 'الاشتراكات والدفعات',
  '/defaulters': 'المتخلفين عن السداد',
};

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const now = new Date();

  const title = pageTitles[location.pathname] || 'ديوان المصري';
  const dateStr = `${now.getDate()} ${arabicMonths[now.getMonth()]} ${now.getFullYear()}`;

  const [theme, setTheme] = useState(() => localStorage.getItem('diwan_theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('diwan_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="hamburger" onClick={onMenuClick} aria-label="فتح القائمة">
          ☰
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleTheme} 
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            transition: 'all var(--transition-fast)'
          }}
          title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="header-date">
          <span>📅</span>
          <span>{dateStr}</span>
        </div>
      </div>
    </header>
  );
}

export { arabicMonths };
