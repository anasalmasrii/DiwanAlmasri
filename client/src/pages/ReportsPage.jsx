/**
 * صفحة التقارير والطباعة
 * =========================
 * طباعة تقارير الأعضاء، الاشتراكات، والمصاريف
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const REPORT_TYPES = [
  { id: 'members', label: '👥 تقرير الأعضاء', description: 'قائمة بجميع الأعضاء وحالة سداداتهم' },
  { id: 'payments', label: '💰 تقرير الاشتراكات والدفعات', description: 'سجل الدفعات لشهر أو سنة محددة' },
  { id: 'defaulters', label: '⚠️ تقرير المتخلفين عن السداد', description: 'قائمة الأعضاء الذين لم يسددوا اشتراك شهر محدد' },
  { id: 'expenses', label: '🛠️ تقرير المصاريف والصيانة', description: 'سجل مصاريف الديوان' },
  { id: 'summary', label: '📊 تقرير ملخص مالي', description: 'ملخص شامل للإيرادات والمصاريف والصافي' },
];

const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function ReportsPage() {
  const { apiFetch } = useAuth();
  const printRef = useRef(null);

  const now = new Date();
  const [reportType, setReportType] = useState('members');
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generated, setGenerated] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    national_id: true,
    phone_number: true,
    join_date: true,
    subscriptions: true,
    contributions: true,
    months_owed: true,
    status: true,
  });
  const [visibleDefaulterColumns, setVisibleDefaulterColumns] = useState({
    national_id: true,
    phone_number: true,
    months_owed: true,
    amount_required: true,
    status: true,
  });
  const [excludedIds, setExcludedIds] = useState([]);
  const [summaryOptions, setSummaryOptions] = useState({
    showExpenses: false,
    showDefaulters: false,
  });
  const [paymentsOptions, setPaymentsOptions] = useState({
    paidSubscriptionsOnly: false,
    hideContributions: false,
  });

  const years = [];
  for (let y = 2020; y <= now.getFullYear() + 1; y++) years.push(y);

  const generateReport = async () => {
    setLoading(true);
    setGenerated(false);
    setExcludedIds([]);
    try {
      let data = {};

      if (reportType === 'members') {
        const res = await apiFetch(`/api/members?year=${filterYear}&month=${filterMonth}`);
        let members = await res.json();
        if (members.error) {
          data = { error: members.error };
        } else {
          if (filterStatus !== 'all' && Array.isArray(members)) {
            // filter by payment status
            members = members.filter(m => {
              const isPaid = filterMonth ? (m.payment_status === 'paid') : ((m.yearly_subscriptions || 0) > 0);
              return filterStatus === 'paid' ? isPaid : !isPaid;
            });
          }
          data = { members: Array.isArray(members) ? members : [] };
        }

      } else if (reportType === 'payments') {
        const params = `month=${filterMonth}&year=${filterYear}`;
        const res = await apiFetch(`/api/payments?${params}`);
        const payments = await res.json();
        data = { payments, month: filterMonth, year: filterYear };

      } else if (reportType === 'expenses') {
        let url = `/api/expenses?year=${filterYear}`;
        if (filterMonth) url += `&month=${filterMonth}`;
        const res = await apiFetch(url);
        const expenses = await res.json();
        data = { expenses, month: filterMonth, year: filterYear };

      } else if (reportType === 'defaulters') {
        const params = filterMonth ? `month=${filterMonth}&year=${filterYear}` : `month=all`;
        const res = await apiFetch(`/api/dashboard/defaulters?${params}`);
        const result = await res.json();
        data = { defaulters: result.defaulters || [], month: filterMonth, year: filterYear };

      } else if (reportType === 'summary') {
        const [dashRes, expRes] = await Promise.all([
          apiFetch(`/api/dashboard?month=${filterMonth}`),
          apiFetch(`/api/expenses?year=${filterYear}&month=${filterMonth}`),
        ]);
        const dash = await dashRes.json();
        const expenses = await expRes.json();
        data = { dash, expenses, month: filterMonth, year: filterYear };
      }

      setReportData(data);
      setGenerated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = () => {
    return now.toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatPaidMonths = (monthsStr) => {
    if (!monthsStr) return '—';
    const str = String(monthsStr);
    const months = [...new Set(str.split(',').map(Number))].sort((a, b) => a - b);
    if (months.length === 0) return '—';
    
    let ranges = [];
    let start = months[0];
    let end = months[0];

    for (let i = 1; i < months.length; i++) {
      if (months[i] === end + 1) {
        end = months[i];
      } else {
        if (end - start >= 3) {
          ranges.push(`${start}-${end}`);
        } else {
          for (let j = start; j <= end; j++) ranges.push(j);
        }
        start = months[i];
        end = months[i];
      }
    }
    
    if (end - start >= 3) {
      ranges.push(`${start}-${end}`);
    } else {
      for (let j = start; j <= end; j++) ranges.push(j);
    }
    
    return ranges.join('، ');
  };

  const renderReportContent = () => {
    if (!reportData) return null;
    if (reportData.error) {
      return <div className="alert alert-danger">{reportData.error}</div>;
    }

    if (reportType === 'members') {
      const allMembers = reportData.members || [];
      const baseMembers = allMembers.filter(m => !excludedIds.includes(m.id));
      const active = baseMembers.filter(m => m.status === 'active').length;
      const unpaidMembers = baseMembers.filter(m => filterMonth ? (m.payment_status !== 'paid') : ((m.yearly_subscriptions || 0) <= 0));
      const paidMembers = baseMembers.filter(m => filterMonth ? (m.payment_status === 'paid') : ((m.yearly_subscriptions || 0) > 0));
      // مجموع الاشتراكات الغير مسددة = عدد المتأخرين × 3 د.أ (للشهر المحدد) أو مجموع الأشهر المتراكمة × 3
      const totalUnpaidAmount = filterMonth
        ? unpaidMembers.length * 3
        : baseMembers.reduce((s, m) => s + (Math.max(0, m.months_owed || 0) * 3), 0);
      
      let members = baseMembers;
      if (filterStatus === 'paid') {
        members = paidMembers;
      } else if (filterStatus === 'unpaid') {
        members = unpaidMembers;
      }
      return (
        <div className="report-content">
          <div className="report-summary-row">
            <div className="report-summary-box">
              <div className="rsb-val">{members.length}</div>
              <div className="rsb-label">إجمالي الأعضاء</div>
            </div>
            <div className="report-summary-box green">
              <div className="rsb-val">{paidMembers.length}</div>
              <div className="rsb-label">مسددون</div>
            </div>
            <div className="report-summary-box red">
              <div className="rsb-val">{unpaidMembers.length}</div>
              <div className="rsb-label">متأخرون</div>
            </div>
            <div className="report-summary-box red">
              <div className="rsb-val">{totalUnpaidAmount.toLocaleString('en-US')} د.أ</div>
              <div className="rsb-label">مجموع الاشتراكات الغير مسددة</div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم العضو</th>
                {visibleColumns.national_id && <th>الرقم الوطني</th>}
                {visibleColumns.phone_number && <th>رقم الهاتف</th>}
                {visibleColumns.join_date && <th>تاريخ الانضمام</th>}
                {filterStatus === 'paid' ? (
                  <>
                    {visibleColumns.subscriptions && <th>الاشتراكات المدفوعة (للسنة)</th>}
                    {visibleColumns.months_owed && <th>الأشهر المدفوعة</th>}
                  </>
                ) : (
                  <>
                    {visibleColumns.subscriptions && <th>إجمالي الاشتراكات</th>}
                    {visibleColumns.contributions && (filterStatus === 'unpaid' ? <th>المبلغ المطلوب</th> : <th>إجمالي المساهمات</th>)}
                    {visibleColumns.months_owed && <th>الأشهر المتراكمة</th>}
                  </>
                )}
                {visibleColumns.status && <th>الحالة</th>}
                <th className="no-print" style={{ width: '60px', textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const isPaid = filterMonth ? (m.payment_status === 'paid') : ((m.yearly_subscriptions || 0) > 0);
                return (
                <tr key={m.id} className={!isPaid ? 'row-danger' : ''}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                  {visibleColumns.national_id && <td style={{ whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{m.national_id || '—'}</td>}
                  {visibleColumns.phone_number && <td style={{ whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{m.phone_number || '—'}</td>}
                  {visibleColumns.join_date && <td style={{ whiteSpace: 'nowrap' }}>{m.join_date ? m.join_date.split('T')[0] : '—'}</td>}
                  
                  {filterStatus === 'paid' ? (
                    <>
                      {visibleColumns.subscriptions && (
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: '#10b981' }}>
                          {(m.yearly_subscriptions || 0).toLocaleString('en-US')} د.أ
                        </td>
                      )}
                      {visibleColumns.months_owed && (
                        <td style={{ color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap', direction: 'ltr' }}>
                          {m.paid_months ? `الأشهر (${formatPaidMonths(m.paid_months)})` : '—'}
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      {visibleColumns.subscriptions && <td style={{ whiteSpace: 'nowrap' }}>{(m.total_subscriptions || 0).toLocaleString('en-US')} د.أ</td>}
                      {visibleColumns.contributions && (
                        filterStatus === 'unpaid' ? (
                          <td style={{ color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{(Math.max(0, m.months_owed) * 3).toLocaleString('en-US')} د.أ</td>
                        ) : (
                          <td style={{ whiteSpace: 'nowrap' }}>{(m.total_contributions || 0).toLocaleString('en-US')} د.أ</td>
                        )
                      )}
                      {visibleColumns.months_owed && (
                        <td style={{ color: m.months_owed > 0 ? '#ef4444' : '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {Math.max(0, m.months_owed)} شهر
                        </td>
                      )}
                    </>
                  )}
                  {visibleColumns.status && (
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                        background: isPaid ? '#d1fae5' : '#fee2e2',
                        color: isPaid ? '#065f46' : '#991b1b'
                      }}>
                        {isPaid ? 'مسدد' : 'متأخر'}
                      </span>
                    </td>
                  )}
                  <td className="no-print" style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setExcludedIds([...excludedIds, m.id])}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                      title="استبعاد من التقرير"
                    >
                      ❌ استبعاد
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === 'payments') {
      const { payments } = reportData;

      // تجميع بحسب العضو فقط — كل عضو سطر واحد
      const byMember = {};
      (payments || []).forEach(p => {
        const mid = p.member_id;
        if (!byMember[mid]) byMember[mid] = {
          member_id: mid,
          member_name: p.member_name,
          sub_months: [],
          sub_total: 0,
          con_total: 0,
          con_count: 0,
        };
        if (p.payment_type === 'اشتراك') {
          byMember[mid].sub_total += parseFloat(p.amount || 0);
          const mKey = `${p.year}-${String(p.month).padStart(2, '0')}`;
          if (!byMember[mid].sub_months.find(m => m.key === mKey)) {
            byMember[mid].sub_months.push({ key: mKey, month: p.month, year: p.year });
          }
        } else if (p.payment_type === 'مساهمة') {
          byMember[mid].con_total += parseFloat(p.amount || 0);
          byMember[mid].con_count += 1;
        }
      });

      // ملخص الأشهر — مع اختصار الفترات المتتالية (أكثر من 3 أشهر) مثل (6-12)
      const summarizeMonths = (months) => {
        if (!months || months.length === 0) return '—';
        const sorted = [...months].sort((a, b) => a.month - b.month);
        if (sorted.length === 1) return `شهر ${sorted[0].month} (${sorted[0].year})`;
        
        const monthNums = [...new Set(sorted.map(m => m.month))].sort((a, b) => a - b);
        let ranges = [];
        let start = monthNums[0];
        let end = monthNums[0];

        for (let i = 1; i < monthNums.length; i++) {
          if (monthNums[i] === end + 1) {
            end = monthNums[i];
          } else {
            if (end - start >= 3) {
              ranges.push(`${start}-${end}`);
            } else {
              for (let j = start; j <= end; j++) ranges.push(j);
            }
            start = monthNums[i];
            end = monthNums[i];
          }
        }
        if (end - start >= 3) {
          ranges.push(`${start}-${end}`);
        } else {
          for (let j = start; j <= end; j++) ranges.push(j);
        }

        const formatted = ranges.join(', ');
        return `مسدد لـ ${sorted.length} أشهر (${formatted})`;
      };

      const rows = Object.values(byMember).sort((a, b) => a.member_name.localeCompare(b.member_name, 'ar'));
      let filteredRows = rows.filter(r => !excludedIds.includes(r.member_id));
      
      // Filter by subscriptions paid only if option is enabled
      if (paymentsOptions.paidSubscriptionsOnly) {
        filteredRows = filteredRows.filter(r => r.sub_total > 0);
      }
      
      const totalSub = filteredRows.reduce((s, r) => s + r.sub_total, 0);
      const totalCon = filteredRows.reduce((s, r) => s + r.con_total, 0);
      const totalConCount = filteredRows.reduce((s, r) => s + r.con_count, 0);

      return (
        <div className="report-content">
          <div className="report-summary-row">
            <div className="report-summary-box">
              <div className="rsb-val">{filteredRows.length}</div>
              <div className="rsb-label">عدد الأعضاء</div>
            </div>
            <div className="report-summary-box green">
              <div className="rsb-val">{totalSub.toLocaleString('en-US')} د.أ</div>
              <div className="rsb-label">إجمالي الاشتراكات</div>
            </div>
            {!paymentsOptions.hideContributions && (
              <div className="report-summary-box" style={{ borderColor: '#10b981' }}>
                <div className="rsb-val" style={{ color: '#10b981' }}>{totalCon.toLocaleString('en-US')} د.أ</div>
                <div className="rsb-label">إجمالي المساهمات ({totalConCount} مساهمة)</div>
              </div>
            )}
            {!paymentsOptions.hideContributions && (
              <div className="report-summary-box blue">
                <div className="rsb-val" style={{ color: '#3b82f6' }}>{(totalSub + totalCon).toLocaleString('en-US')} د.أ</div>
                <div className="rsb-label">الإجمالي الكلي</div>
              </div>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم العضو</th>
                <th>أشهر الاشتراك</th>
                <th>مجموع الاشتراكات</th>
                {!paymentsOptions.hideContributions && <th>عدد المساهمات</th>}
                {!paymentsOptions.hideContributions && <th>مجموع المساهمات</th>}
                <th className="no-print" style={{ width: '60px', textAlign: 'center' }}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{row.member_name}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {summarizeMonths(row.sub_months)}
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {row.sub_total > 0 ? `${row.sub_total.toLocaleString('en-US')} د.أ` : '—'}
                  </td>
                  {!paymentsOptions.hideContributions && (
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {row.con_count > 0 ? row.con_count : '—'}
                    </td>
                  )}
                  {!paymentsOptions.hideContributions && (
                    <td style={{ color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {row.con_total > 0 ? `${row.con_total.toLocaleString('en-US')} د.أ` : '—'}
                    </td>
                  )}
                  <td className="no-print" style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setExcludedIds([...excludedIds, row.member_id])}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                      title="استبعاد من التقرير"
                    >
                      ❌ استبعاد
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800, borderTop: '2px solid var(--border)', background: 'var(--bg-glass)' }}>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>الإجمالي</td>
                <td style={{ color: '#10b981', fontWeight: 800 }}>{totalSub.toLocaleString('en-US')} د.أ</td>
                {!paymentsOptions.hideContributions && <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{totalConCount}</td>}
                {!paymentsOptions.hideContributions && <td style={{ color: '#10b981', fontWeight: 800 }}>{totalCon.toLocaleString('en-US')} د.أ</td>}
                <td className="no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === 'expenses') {
      const { expenses } = reportData;
      const total = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      return (
        <div className="report-content">
          <div className="report-summary-row">
            <div className="report-summary-box">
              <div className="rsb-val">{(expenses || []).length}</div>
              <div className="rsb-label">عدد المصاريف</div>
            </div>
            <div className="report-summary-box red">
              <div className="rsb-val">{total.toLocaleString('en-US')} د.أ</div>
              <div className="rsb-label">إجمالي المصاريف</div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>البيان / الوصف</th>
                <th>التصنيف</th>
                <th>التاريخ</th>
                <th>الشهر</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {(expenses || []).map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{e.description}</td>
                  <td>{e.category || 'عام'}</td>
                  <td>{(e.expense_date || '—').split('T')[0]}</td>
                  <td>شهر {e.month} ({e.year})</td>
                  <td style={{ color: '#ef4444', fontWeight: 700 }}>{parseFloat(e.amount).toLocaleString('en-US')} د.أ</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800, background: '#fef2f2' }}>
                <td colSpan="5" style={{ textAlign: 'center' }}>الإجمالي</td>
                <td style={{ color: '#ef4444', fontWeight: 800 }}>{total.toLocaleString('en-US')} د.أ</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    if (reportType === 'defaulters') {
      const { defaulters: allDefaulters, month, year } = reportData;
      const defaulters = (allDefaulters || []).filter(m => !excludedIds.includes(m.id));
      const totalMonthsOwed = (defaulters || []).reduce((sum, m) => sum + Math.max(0, m.months_owed || 0), 0);
      const totalOwed = filterMonth ? (defaulters || []).length * 3 : totalMonthsOwed * 3;
      return (
        <div className="report-content">
          <div className="report-summary-row">
            <div className="report-summary-box red">
              <div className="rsb-val">{(defaulters || []).length}</div>
              <div className="rsb-label">عدد المتخلفين</div>
            </div>
            <div className="report-summary-box red">
              <div className="rsb-val">{totalOwed.toLocaleString('en-US')} د.أ</div>
              <div className="rsb-label">{filterMonth ? 'إجمالي المبالغ المتراكمة (لهذا الشهر)' : 'إجمالي المبالغ المتراكمة (جميع الأشهر)'}</div>
            </div>
            <div className="report-summary-box">
              <div className="rsb-val">{month ? `شهر ${month} / ${year}` : `جميع أشهر ${year}`}</div>
              <div className="rsb-label">الفترة</div>
            </div>
          </div>
          {(defaulters || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem' }}>
              ✅ لا يوجد متخلفون عن السداد لهذا الشهر
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم العضو</th>
                  {visibleDefaulterColumns.national_id && <th>الرقم الوطني</th>}
                  {visibleDefaulterColumns.phone_number && <th>رقم الهاتف</th>}
                  {visibleDefaulterColumns.months_owed && <th>الأشهر المتراكمة</th>}
                  {visibleDefaulterColumns.amount_required && <th>المبلغ المطلوب</th>}
                  {visibleDefaulterColumns.status && <th>الحالة</th>}
                  <th className="no-print" style={{ width: '60px', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {(defaulters || []).map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? '' : 'rgba(239,68,68,0.03)' }}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{m.full_name}</td>
                    {visibleDefaulterColumns.national_id && <td style={{ direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>{m.national_id || '—'}</td>}
                    {visibleDefaulterColumns.phone_number && <td style={{ direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>{m.phone_number || '—'}</td>}
                    {visibleDefaulterColumns.months_owed && <td style={{ fontWeight: 600 }}>{Math.max(0, m.months_owed || 0)} أشهر</td>}
                    {visibleDefaulterColumns.amount_required && <td style={{ color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{filterMonth ? '3 د.أ' : `${(Math.max(0, m.months_owed || 0) * 3).toLocaleString('en-US')} د.أ`}</td>}
                    {visibleDefaulterColumns.status && (
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
                          لم يسدد
                        </span>
                      </td>
                    )}
                    <td className="no-print" style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setExcludedIds([...excludedIds, m.id])}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                        title="استبعاد من التقرير"
                      >
                        ❌ استبعاد
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 800, borderTop: '2px solid #ef4444', background: 'var(--bg-glass)' }}>
                  <td style={{ color: '#ef4444' }}>الإجمالي</td>
                  <td></td>
                  {visibleDefaulterColumns.national_id && <td></td>}
                  {visibleDefaulterColumns.phone_number && <td></td>}
                  {visibleDefaulterColumns.months_owed && <td style={{ color: '#ef4444', fontWeight: 800 }}>{totalMonthsOwed} أشهر</td>}
                  {visibleDefaulterColumns.amount_required && <td style={{ color: '#ef4444', fontWeight: 800 }}>{totalOwed.toLocaleString('en-US')} د.أ</td>}
                  {visibleDefaulterColumns.status && <td></td>}
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      );
    }
    if (reportType === 'summary') {
      const { dash, expenses } = reportData;
      const totalExp    = (expenses || []).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const monthSub    = dash?.monthlyRevenueSubscriptions || 0;
      const monthCon    = dash?.monthlyRevenueContributions || 0;
      const totalRevAll = (dash?.totalTreasury || 0) - (dash?.totalExternalContributions || 0);
      const extContrib  = dash?.totalExternalContributions || 0;
      const netTreasury = dash?.netTreasury || 0;
      const unpaidCount = dash?.unpaidCount || 0;
      const unpaidTotal = unpaidCount * 3;

      const tableRows = [
        { label: `إيرادات الاشتراكات — شهر ${filterMonth || 'الكل'} / ${filterYear}`, amount: monthSub, type: 'income' },
        { label: `إيرادات المساهمات — شهر ${filterMonth || 'الكل'} / ${filterYear}`, amount: monthCon, type: 'income' },
        { label: 'إجمالي إيرادات الاشتراكات والمساهمات (كل الأوقات)', amount: totalRevAll, type: 'income' },
        { label: `مساهمات من خارج الأعضاء (${dash?.externalContributorsCount || 0} مساهم)`, amount: extContrib, type: 'income' },
        { label: 'إجمالي المصاريف والصيانة', amount: totalExp, type: 'expense' },
        { label: `اشتراكات المتخلفين الغير مسددة (${unpaidCount} عضو × 3 د.أ)`, amount: unpaidTotal, type: 'unpaid' },
        { label: 'صافي الصندوق (الإيرادات + الخارجية − المصاريف)', amount: netTreasury, type: netTreasury >= 0 ? 'net-pos' : 'net-neg', bold: true },
      ];

      const colorMap = {
        'income':  { text: '#10b981', bg: '#d1fae5', fg: '#065f46', badge: 'إيراد' },
        'expense': { text: '#ef4444', bg: '#fee2e2', fg: '#991b1b', badge: 'مصروف' },
        'unpaid':  { text: '#f59e0b', bg: '#fef3c7', fg: '#92400e', badge: 'متأخر' },
        'net-pos': { text: '#2563eb', bg: '#dbeafe', fg: '#1e40af', badge: 'صافي' },
        'net-neg': { text: '#ef4444', bg: '#fee2e2', fg: '#991b1b', badge: 'صافي' },
      };

      return (
        <div className="report-content">
          <table className="data-table" style={{ marginTop: '8px' }}>
            <thead>
              <tr>
                <th style={{ width: '36px' }}>#</th>
                <th>البيان</th>
                <th style={{ width: '150px', textAlign: 'center' }}>المبلغ (د.أ)</th>
                <th style={{ width: '90px', textAlign: 'center' }}>النوع</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => {
                const c = colorMap[r.type];
                return (
                  <tr key={i} style={{ borderTop: r.bold ? '3px double #374151' : undefined, fontWeight: r.bold ? 800 : 500 }}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>{r.label}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: c.text, fontSize: r.bold ? '1.05rem' : undefined }}>
                      {(r.type === 'expense' || r.type === 'net-neg') ? '−' : '+'}{Math.abs(r.amount).toLocaleString('en-US')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, background: c.bg, color: c.fg }}>
                        {c.badge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* تفاصيل المصاريف — اختياري */}
          {summaryOptions.showExpenses && expenses && expenses.length > 0 && (
            <>
              <h4 style={{ marginTop: '24px', marginBottom: '10px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', color: '#374151', fontWeight: 700 }}>
                🛠️ تفاصيل المصاريف
              </h4>
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>المبلغ</th></tr>
                </thead>
                <tbody>
                  {expenses.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td>{e.category || 'عام'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{(e.expense_date || '').split('T')[0]}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>−{parseFloat(e.amount).toLocaleString('en-US')} د.أ</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 800, background: '#fef2f2' }}>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#ef4444' }}>الإجمالي</td>
                    <td style={{ color: '#ef4444', fontWeight: 800, whiteSpace: 'nowrap' }}>−{totalExp.toLocaleString('en-US')} د.أ</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* قائمة المتخلفين — اختياري */}
          {summaryOptions.showDefaulters && (
            <>
              <h4 style={{ marginTop: '24px', marginBottom: '10px', borderBottom: '2px solid #fca5a5', paddingBottom: '8px', color: '#991b1b', fontWeight: 700 }}>
                ⚠️ قائمة المتخلفين عن السداد ({unpaidCount} عضو)
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                لعرض قائمة تفصيلية بأسماء المتخلفين، استخدم &quot;تقرير المتخلفين عن السداد&quot; من قائمة أنواع التقارير.
              </p>
              <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fca5a5', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '6px' }}>⚠️</span>
                <strong style={{ color: '#991b1b', fontSize: '1.1rem' }}>{unpaidCount} عضو</strong>
                <span style={{ color: '#7f1d1d', display: 'block', marginTop: '4px' }}>لم يسددوا اشتراك هذا الشهر — إجمالي {unpaidTotal.toLocaleString('en-US')} د.أ</span>
              </div>
            </>
          )}
        </div>
      );
    }
  };

  const getReportTitle = () => {
    const type = REPORT_TYPES.find(t => t.id === reportType);
    const monthStr = filterMonth ? `شهر ${filterMonth} (${arabicMonths[filterMonth - 1]})` : 'جميع الأشهر';
    return `${type?.label} — ${monthStr} ${filterYear}`;
  };

  return (
    <div>
      {/* رأس الصفحة */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>📄</span>
            <span>التقارير والطباعة</span>
          </h2>
          <p className="page-description">إنشاء وطباعة تقارير احترافية للأعضاء والمالية</p>
        </div>
        {generated && (
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ طباعة التقرير
          </button>
        )}
      </div>

      {/* فلاتر التقرير */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">⚙️ إعدادات التقرير</h3>
        </div>
        <div className="card-body" style={{ padding: '20px 24px' }}>

          {/* نوع التقرير */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">نوع التقرير</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {REPORT_TYPES.map(type => (
                <div
                  key={type.id}
                  onClick={() => { setReportType(type.id); setGenerated(false); }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${reportType === type.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: reportType === type.id ? 'var(--accent-subtle)' : 'var(--bg-glass)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{type.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* فلاتر التاريخ والحالة */}
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="form-label">الشهر</label>
              <select className="form-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setGenerated(false); }}>
                <option value="">جميع الأشهر</option>
                {arabicMonths.map((name, i) => (
                  <option key={i} value={i + 1}>شهر {i + 1} ({name})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">السنة</label>
              <select className="form-select" value={filterYear} onChange={e => { setFilterYear(e.target.value); setGenerated(false); }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {reportType === 'members' && (
              <div className="form-group">
                <label className="form-label">حالة السداد</label>
                <select className="form-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setGenerated(false); }}>
                  <option value="all">الكل</option>
                  <option value="paid">المسددون فقط</option>
                  <option value="unpaid">المتأخرون فقط</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <button
                id="generate-report-btn"
                className="btn btn-primary"
                onClick={generateReport}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? '⏳ جاري الإنشاء...' : '📊 إنشاء التقرير'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* معاينة التقرير */}
      {generated && reportData && (
        <div className="card" ref={printRef} id="report-preview">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <h3 className="card-title">📋 معاينة التقرير</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>📥 حفظ كـ PDF</button>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ طباعة</button>
            </div>
          </div>

          {reportType === 'members' && (
            <div className="no-print" style={{ padding: '12px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>⚙️ إظهار الأعمدة:</strong>
              {[
                { key: 'national_id', label: 'الرقم الوطني' },
                { key: 'phone_number', label: 'رقم الهاتف' },
                { key: 'join_date', label: 'تاريخ الانضمام' },
                { key: 'subscriptions', label: 'الاشتراكات' },
                { key: 'contributions', label: filterStatus === 'unpaid' ? 'المبلغ المطلوب' : 'المساهمات' },
                { key: 'months_owed', label: filterStatus === 'paid' ? 'الأشهر المدفوعة' : 'الأشهر المتراكمة' },
                { key: 'status', label: 'الحالة' }
              ].map(col => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={visibleColumns[col.key]} onChange={e => setVisibleColumns({...visibleColumns, [col.key]: e.target.checked})} />
                  {col.label}
                </label>
              ))}
            </div>
          )}

          {reportType === 'defaulters' && (
            <div className="no-print" style={{ padding: '12px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>⚙️ إظهار الأعمدة:</strong>
              {[
                { key: 'national_id', label: 'الرقم الوطني' },
                { key: 'phone_number', label: 'رقم الهاتف' },
                { key: 'months_owed', label: 'الأشهر المتراكمة' },
                { key: 'amount_required', label: 'المبلغ المطلوب' },
                { key: 'status', label: 'الحالة' }
              ].map(col => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={visibleDefaulterColumns[col.key]} onChange={e => setVisibleDefaulterColumns({...visibleDefaulterColumns, [col.key]: e.target.checked})} />
                  {col.label}
                </label>
              ))}
            </div>
          )}

          {reportType === 'payments' && (
            <div className="no-print" style={{ padding: '12px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>⚙️ خيارات التصفية:</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={paymentsOptions.paidSubscriptionsOnly} onChange={e => setPaymentsOptions({...paymentsOptions, paidSubscriptionsOnly: e.target.checked})} />
                💵 عرض مسددي الاشتراكات فقط
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={paymentsOptions.hideContributions} onChange={e => setPaymentsOptions({...paymentsOptions, hideContributions: e.target.checked})} />
                🎁 إخفاء المساهمات
              </label>
            </div>
          )}

          {reportType === 'summary' && (
            <div className="no-print" style={{ padding: '12px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>⚙️ تفاصيل إضافية:</strong>
              {[
                { key: 'showExpenses', label: '🛠️ تفاصيل المصاريف' },
                { key: 'showDefaulters', label: '⚠️ قائمة المتخلفين' },
              ].map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer', userSelect: 'none', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${summaryOptions[opt.key] ? 'var(--accent)' : 'var(--border)'}`, background: summaryOptions[opt.key] ? 'var(--accent-subtle)' : 'transparent', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={summaryOptions[opt.key]} onChange={e => setSummaryOptions({...summaryOptions, [opt.key]: e.target.checked})} />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {excludedIds.length > 0 && (
            <div className="no-print" style={{ padding: '12px 24px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: '#ef4444' }}>⚠️ أسماء مستبعدة من التقرير:</strong>
              {excludedIds.map(id => {
                let name = "";
                if (reportType === 'members') {
                  name = (reportData.members || []).find(m => m.id === id)?.full_name;
                } else if (reportType === 'payments') {
                  name = (reportData.payments || []).find(p => p.member_id === id)?.member_name;
                } else if (reportType === 'defaulters') {
                  name = (reportData.defaulters || []).find(m => m.id === id)?.full_name;
                }
                return (
                  <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>
                    {name || "عضو"}
                    <button
                      onClick={() => setExcludedIds(excludedIds.filter(x => x !== id))}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 800, padding: 0 }}
                      title="إعادة إدراج"
                    >
                      🔄
                    </button>
                  </span>
                );
              })}
              <button
                onClick={() => setExcludedIds([])}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
              >
                🔄 إعادة إدراج الجميع
              </button>
            </div>
          )}

          {/* محتوى الطباعة */}
          <div id="printable-area" style={{ padding: '0 24px 24px' }}>
            {/* رأس التقرير للطباعة */}
            <div className="print-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img src="/DiwanAlmasri-logo.png" alt="ديوان المصري" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                  <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>ديوان المصري</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>نظام إدارة الاشتراكات والمحاسبة</p>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.82rem', color: '#64748b' }}>
                  <div>تاريخ الإصدار: {formatDate()}</div>
                  <div>تم الإصدار بواسطة: النظام</div>
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white', padding: '12px 20px', borderRadius: '8px',
                fontWeight: 700, fontSize: '1rem', marginBottom: '20px'
              }}>
                📄 {getReportTitle()}
              </div>
            </div>

            {renderReportContent()}
          </div>
        </div>
      )}

      {/* CSS للطباعة */}
      <style>{`
        .report-summary-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .report-summary-box {
          flex: 1;
          min-width: 120px;
          padding: 14px;
          border-radius: 10px;
          border: 2px solid var(--border);
          background: var(--bg-glass);
          text-align: center;
        }
        .report-summary-box.green { border-color: #10b981; }
        .report-summary-box.red { border-color: #ef4444; }
        .report-summary-box.blue { border-color: #3b82f6; }
        .rsb-val { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
        .rsb-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
        .report-summary-box.green .rsb-val { color: #10b981; }
        .report-summary-box.red .rsb-val { color: #ef4444; }
        .report-summary-box.blue .rsb-val { color: #3b82f6; }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          direction: rtl;
        }
        .print-table th {
          background: #1e293b;
          color: white;
          padding: 10px 12px;
          text-align: right;
          font-weight: 600;
          font-size: 0.82rem;
        }
        .print-table td {
          padding: 9px 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
        }
        .print-table tbody tr:nth-child(even) { background: #f8fafc; }
        .print-table tbody tr:hover { background: #f0f9ff; }
        .print-table .row-danger { background: #fff5f5 !important; }

        @media print {
          @page { margin: 0; }
          html, body { background: #ffffff !important; }
          body { padding: 1.5cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Hide app layout and no-print elements */
          .sidebar, .sidebar-overlay, .header, .page-header, .no-print { display: none !important; }
          
          /* Reset main layout */
          .app-layout { display: block !important; padding: 0 !important; margin: 0 !important; }
          .main-content { display: block !important; margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: auto !important; }
          .page-content { padding: 0 !important; margin: 0 !important; }

          /* Hide all cards except the report preview */
          .card:not(#report-preview) { display: none !important; }
          
          /* Prepare report preview card for printing */
          #report-preview {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #report-preview .card-header { display: none !important; }
          
          #printable-area {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            direction: rtl;
            font-family: 'Cairo', 'Arial', sans-serif;
            font-size: 12px;
          }
          
          .report-summary-row { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; margin-bottom: 16px !important; }
          .report-summary-box { flex: 1 !important; min-width: 100px !important; padding: 8px !important; border: 2px solid #e5e7eb !important; border-radius: 6px !important; background: white !important; text-align: center !important; }
          .rsb-val { font-size: 1rem !important; font-weight: 800 !important; }
          .rsb-label { font-size: 0.65rem !important; }
          
          .print-table { font-size: 0.75rem !important; page-break-inside: auto; }
          .print-table tr { page-break-inside: avoid; page-break-after: auto; }
          .print-table th { background: #1e293b !important; color: white !important; padding: 6px 8px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-table td { padding: 5px 8px !important; }
          .print-table tbody tr:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          .print-table .row-danger { background: #fff5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-summary-box.green { border-color: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-summary-box.green .rsb-val { color: #10b981 !important; }
          .report-summary-box.red { border-color: #ef4444 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-summary-box.red .rsb-val { color: #ef4444 !important; }
          .report-summary-box.blue { border-color: #3b82f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-summary-box.blue .rsb-val { color: #3b82f6 !important; }
        }
      `}</style>
    </div>
  );
}
