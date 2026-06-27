import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function JoinRequestsPage() {
  const { apiFetch } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'affiliates'
  
  // Modal State
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchData, setMatchData] = useState(null); // The existing member from the system
  const [modalLoading, setModalLoading] = useState(false);

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

  const handleApproveAffiliate = async (id) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/join-requests/${id}/approve-affiliate`, { method: 'POST' });
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'affiliate' } : r));
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
    if (!window.confirm('هل أنت متأكد من حذف هذا العضو من القائمة؟')) return;

    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/join-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطأ أثناء الحذف');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenMatchModal = async (req) => {
    setSelectedRequest(req);
    setMatchData(null);
    setMatchModalOpen(true);
    setModalLoading(true);

    try {
      const res = await apiFetch(`/api/join-requests/${req.id}/check-match`);
      const data = await res.json();
      if (res.ok) {
        setMatchData(data.match);
      } else {
        alert(data.error || 'حدث خطأ أثناء فحص التطابق');
        setMatchModalOpen(false);
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
      setMatchModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleMerge = async () => {
    setModalLoading(true);
    try {
      const res = await apiFetch(`/api/join-requests/${selectedRequest.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: matchData ? matchData.id : null })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: 'merged' } : r));
        setMatchModalOpen(false);
      } else {
        alert(data.error || 'خطأ أثناء العملية');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">جاري تحميل الطلبات...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const affiliates = requests.filter(r => r.status === 'affiliate' || r.status === 'merged');

  return (
    <div className="page-content fade-in">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📝 الطلبات والأعضاء المنتسبين</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge badge-warning" style={{ backgroundColor: activeTab === 'pending' ? 'var(--primary-color)' : 'var(--bg-color)', color: activeTab === 'pending' ? 'white' : 'var(--text-color)', cursor: 'pointer', padding: '10px 15px' }} onClick={() => setActiveTab('pending')}>
              طلبات جديدة ({pendingRequests.length})
            </span>
            <span className="badge badge-success" style={{ backgroundColor: activeTab === 'affiliates' ? 'var(--primary-color)' : 'var(--bg-color)', color: activeTab === 'affiliates' ? 'white' : 'var(--text-color)', cursor: 'pointer', padding: '10px 15px' }} onClick={() => setActiveTab('affiliates')}>
              الأعضاء المنتسبين ({affiliates.length})
            </span>
          </div>
        </div>
        
        {error && <div className="login-error" style={{ margin: '20px' }}>⚠️ {error}</div>}

        <div className="card-body">
          {activeTab === 'pending' && (
            <div className="table-wrapper">
              {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>لا يوجد طلبات جديدة.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم الرباعي</th>
                      <th>رقم الهاتف</th>
                      <th>الرقم الوطني</th>
                      <th>تاريخ الطلب</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req, idx) => (
                      <tr key={req.id}>
                        <td data-label="#">{idx + 1}</td>
                        <td data-label="الاسم الرباعي" style={{ fontWeight: 600 }}>{req.full_name}</td>
                        <td data-label="رقم الهاتف">{req.phone_number}</td>
                        <td data-label="الرقم الوطني">{req.national_id || '—'}</td>
                        <td data-label="تاريخ الطلب">{req.request_date ? req.request_date.split('T')[0] : '—'}</td>
                        <td data-label="الإجراءات">
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleApproveAffiliate(req.id)} disabled={actionLoading === req.id}>
                              {actionLoading === req.id ? '⏳' : '✅ قبول كمنتسب'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}>
                              {actionLoading === req.id ? '⏳' : '❌ حذف'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'affiliates' && (
            <div className="table-wrapper">
              {affiliates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>لا يوجد أعضاء منتسبين.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم الرباعي</th>
                      <th>رقم الهاتف</th>
                      <th>الرقم الوطني</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliates.map((req, idx) => (
                      <tr key={req.id}>
                        <td data-label="#">{idx + 1}</td>
                        <td data-label="الاسم الرباعي" style={{ fontWeight: 600 }}>{req.full_name}</td>
                        <td data-label="رقم الهاتف">{req.phone_number}</td>
                        <td data-label="الرقم الوطني">{req.national_id || '—'}</td>
                        <td data-label="الحالة">
                          {req.status === 'merged' ? (
                            <span className="badge badge-success" style={{ backgroundColor: '#10b981', color: 'white' }}>مُضاف للنظام 🏢</span>
                          ) : (
                            <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b', color: 'white' }}>منتسب فقط ⏳</span>
                          )}
                        </td>
                        <td data-label="الإجراءات">
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {req.status !== 'merged' && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleOpenMatchModal(req)} disabled={actionLoading === req.id}>
                                📥 إضافة للنظام
                              </button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}>
                              ❌ حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Match Modal */}
      {matchModalOpen && selectedRequest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-color)', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--primary-color)' }}>
              {modalLoading ? '⏳ جاري الفحص...' : matchData ? '🔄 مطابقة العضو' : '➕ إضافة كعضو جديد'}
            </h3>
            
            {!modalLoading && (
              <div>
                {matchData ? (
                  <div>
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
                      <strong>⚠️ تنبيه:</strong> تم العثور على عضو بهذا الاسم أو الرقم الوطني في النظام الرسمي مسبقاً.
                      هل تود دمج المعلومات المحدثة (الجديدة) مع حساب العضو القديم؟
                    </div>
                    
                    <table className="data-table" style={{ marginBottom: '20px' }}>
                      <thead>
                        <tr>
                          <th>الحقل</th>
                          <th>البيانات الحالية في النظام</th>
                          <th>البيانات الجديدة (من الاستبيان)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>الاسم الرباعي</strong></td>
                          <td>{matchData.full_name}</td>
                          <td style={{ color: 'green', fontWeight: 'bold' }}>{selectedRequest.full_name}</td>
                        </tr>
                        <tr>
                          <td><strong>الرقم الوطني</strong></td>
                          <td>{matchData.national_id || '—'}</td>
                          <td style={{ color: matchData.national_id !== selectedRequest.national_id ? 'green' : 'inherit' }}>{selectedRequest.national_id || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>رقم الهاتف</strong></td>
                          <td>{matchData.phone_number || '—'}</td>
                          <td style={{ color: matchData.phone_number !== selectedRequest.phone_number ? 'green' : 'inherit' }}>{selectedRequest.phone_number || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>المؤهل العلمي</strong></td>
                          <td>{matchData.qualification || '—'}</td>
                          <td style={{ color: matchData.qualification !== selectedRequest.qualification ? 'green' : 'inherit' }}>{selectedRequest.qualification || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #10b981' }}>
                    <strong>✅ العضو غير موجود في النظام.</strong> سيتم إضافته كعضو جديد كلياً بالمعلومات التالية:
                    <ul style={{ marginTop: '10px', lineHeight: '1.8' }}>
                      <li><strong>الاسم:</strong> {selectedRequest.full_name}</li>
                      <li><strong>الرقم الوطني:</strong> {selectedRequest.national_id}</li>
                      <li><strong>رقم الهاتف:</strong> {selectedRequest.phone_number}</li>
                    </ul>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setMatchModalOpen(false)}>إلغاء</button>
                  <button className="btn btn-primary" onClick={handleMerge}>
                    {matchData ? '🔄 تأكيد دمج وتحديث البيانات' : '➕ تأكيد الإضافة للنظام الرسمي'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
