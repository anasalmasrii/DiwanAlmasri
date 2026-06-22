/**
 * مكون بطاقة الإحصائيات
 * =======================
 * بطاقة زجاجية مع رقم متحرك وأيقونة
 */

import { useState, useEffect } from 'react';

export default function StatCard({ icon, value, label, color = 'gold', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  // رسم متحرك للعداد
  useEffect(() => {
    const numValue = Number(value) || 0;
    if (numValue === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 800; // مدة الرسوم المتحركة بالمللي ثانية
    const steps = 30;
    const stepValue = numValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(stepValue * step), numValue);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className={`stat-card ${color} animate-in`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">
        {typeof value === 'number' && !isNaN(value)
          ? displayValue.toLocaleString('ar-EG')
          : value}
        {suffix && <span style={{ fontSize: '0.5em', marginRight: '4px' }}>{suffix}</span>}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
