import { useState } from 'react';
import { Link } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';

registerLocale('ar', ar);

export default function RegistrationPage() {
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    date_of_birth: '',
    qualification: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // التحقق من الحقول الإلزامية
    if (!form.full_name || !form.national_id || !form.phone_number || !form.date_of_birth || !form.qualification) {
      setError('جميع الحقول مطلوبة، يرجى تعبئة الاستبيان كاملاً.');
      setLoading(false);
      return;
    }

    // التحقق من الاسم الرباعي
    const nameParts = form.full_name.trim().split(/\s+/);
    if (nameParts.length < 4) {
      setError('يرجى إدخال الاسم الرباعي كاملاً (يجب أن يتكون من 4 مقاطع على الأقل)');
      setLoading(false);
      return;
    }

    // التحقق من رقم الهاتف (10 أرقام)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(form.phone_number.trim())) {
      setError('يرجى التأكد من رقم الهاتف (يجب أن يتكون من 10 أرقام)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/join-requests/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء إرسال الطلب');
      } else {
        setSuccess(data.message || 'تم إرسال طلبك بنجاح');
        setForm({
          full_name: '',
          national_id: '',
          phone_number: '',
          date_of_birth: '',
          qualification: ''
        });
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ padding: '20px' }}>
      <div className="login-card" style={{ maxWidth: '500px', width: '100%', margin: '40px auto' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="login-logo" style={{ marginBottom: '-15px', marginTop: '-10px' }}>
            <img src="/DiwanAlmasri-logo.png" alt="ديوان المصري" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>ديوان المصري</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>استبيان طلب انضمام للديوان</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: '10px' }}>تم الاستلام!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
              تم استلام بياناتك بنجاح. سيتم مراجعة الطلب من قبل الإدارة قريباً.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              العودة للصفحة الرئيسية
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="login-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">الاسم الرباعي *</label>
              <input
                type="text"
                name="full_name"
                className="form-input"
                placeholder="أدخل اسمك الرباعي"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">الرقم الوطني</label>
              <input
                type="text"
                name="national_id"
                className="form-input"
                placeholder="أدخل الرقم الوطني"
                value={form.national_id}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">رقم الهاتف *</label>
              <input
                type="text"
                name="phone_number"
                className="form-input"
                placeholder="مثال: 0791234567"
                value={form.phone_number}
                onChange={handleChange}
                required
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ الميلاد *</label>
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
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">المؤهل العلمي</label>
              <input
                type="text"
                name="qualification"
                className="form-input"
                placeholder="مثال: بكالوريوس هندسة"
                value={form.qualification}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '15px', width: '100%', padding: '12px', fontSize: '1.05rem', fontWeight: 'bold' }}>
              {loading ? '⏳ جاري الإرسال...' : 'إرسال طلب الانضمام'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
                العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
