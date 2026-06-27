import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function JoinRequestsPage() {
  const { apiFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id of the request being processed

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/join-requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      } else {
        setError(data.error || 'خطأ في تحميل الطلبات');
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على هذا العضو وإضافته للنظام؟')) return;
    
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/join-requests/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطأ أثناء الموافقة');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('هل أنت متأكد من رفض وحذف هذا الطلب؟')) return;

    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/join-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطأ أثناء الرفض');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="loading-spinner">جاري تحميل الطلبات...</div>;
  }

  return (
    <div className="page-content fade-in">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📨 طلبات الانضمام المعلقة</h2>
          <span className="badge badge-warning">{requests.length} طلبات</span>
        </div>
        
        {error && <div className="login-error" style={{ margin: '20px' }}>⚠️ {error}</div>}

        <div className="card-body">
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              لا يوجد أي طلبات انضمام معلقة حالياً.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم الرباعي</th>
                    <th>رقم الهاتف</th>
                    <th>الرقم الوطني</th>
                    <th>المؤهل العلمي</th>
                    <th>تاريخ الطلب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, idx) => (
                    <tr key={req.id}>
                      <td data-label="#">{idx + 1}</td>
                      <td data-label="الاسم الرباعي" style={{ fontWeight: 600 }}>{req.full_name}</td>
                      <td data-label="رقم الهاتف" style={{ direction: 'ltr', textAlign: 'right' }}>{req.phone_number}</td>
                      <td data-label="الرقم الوطني">{req.national_id || '—'}</td>
                      <td data-label="المؤهل العلمي">{req.qualification || '—'}</td>
                      <td data-label="تاريخ الطلب">{req.request_date ? req.request_date.split('T')[0] : '—'}</td>
                      <td data-label="الإجراءات">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                            style={{ background: 'var(--success)', border: 'none', color: 'white' }}
                          >
                            {actionLoading === req.id ? '⏳' : '✅ قبول'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                          >
                            {actionLoading === req.id ? '⏳' : '❌ رفض'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
