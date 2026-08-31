import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function VouchersPage() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState(null);
  
  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [formData, setFormData] = useState({
    voucher_type: 'receipt',
    amount: '',
    member_id: '',
    description: '',
    voucher_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, membersRes] = await Promise.all([
        fetch('/api/vouchers'),
        fetch('/api/members')
      ]);
      
      if (!vouchersRes.ok) throw new Error('خطأ في جلب السندات');
      if (!membersRes.ok) throw new Error('خطأ في جلب الأعضاء');
      
      const vouchersData = await vouchersRes.json();
      const membersData = await membersRes.json();
      
      setVouchers(vouchersData);
      setMembers(membersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (voucher = null) => {
    if (voucher) {
      setCurrentVoucher(voucher);
      setFormData({
        voucher_type: voucher.voucher_type,
        amount: voucher.amount,
        member_id: voucher.member_id,
        description: voucher.description || '',
        voucher_date: voucher.voucher_date,
      });
    } else {
      setCurrentVoucher(null);
      setFormData({
        voucher_type: 'receipt',
        amount: '',
        member_id: '',
        description: '',
        voucher_date: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentVoucher(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = currentVoucher ? `/api/vouchers/${currentVoucher.id}` : '/api/vouchers';
      const method = currentVoucher ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'خطأ في حفظ السند');
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السند؟')) return;
    try {
      const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('خطأ في حذف السند');
      setVouchers(vouchers.filter(v => v.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'receipt': return 'سند قبض';
      case 'payment': return 'سند صرف';
      case 'invoice': return 'فاتورة نقدي';
      default: return type;
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'receipt': return { backgroundColor: 'var(--success-color, #2e7d32)', color: 'white' };
      case 'payment': return { backgroundColor: 'var(--danger-color, #d32f2f)', color: 'white' };
      case 'invoice': return { backgroundColor: 'var(--primary-color, #1976d2)', color: 'white' };
      default: return {};
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesType = filterType === 'all' || v.voucher_type === filterType;
      const matchesSearch = v.member_name?.includes(searchTerm) || v.description?.includes(searchTerm);
      return matchesType && matchesSearch;
    });
  }, [vouchers, filterType, searchTerm]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>السندات المحاسبية والفواتير</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="fas fa-plus"></i> إضافة سند جديد
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filters-card card">
        <div className="filters-grid">
          <div className="form-group">
            <label>بحث (عضو أو بيان)</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث هنا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>نوع السند</label>
            <select
              className="form-control"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="receipt">سند قبض</option>
              <option value="payment">سند صرف</option>
              <option value="invoice">فاتورة نقدي</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>العضو</th>
                <th>المبلغ</th>
                <th>البيان</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td>{voucher.voucher_date}</td>
                    <td>
                      <span className="badge" style={getTypeStyle(voucher.voucher_type)}>
                        {getTypeName(voucher.voucher_type)}
                      </span>
                    </td>
                    <td>{voucher.member_name}</td>
                    <td className="amount" style={{ fontWeight: 'bold' }}>{voucher.amount.toLocaleString()}</td>
                    <td>{voucher.description}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-icon btn-edit" onClick={() => handleOpenModal(voucher)} title="تعديل">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-icon btn-delete" onClick={() => handleDelete(voucher.id)} title="حذف">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">لا توجد سندات مطابقة للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentVoucher ? 'تعديل سند' : 'إضافة سند جديد'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>نوع السند *</label>
                <select
                  className="form-control"
                  value={formData.voucher_type}
                  onChange={(e) => setFormData({ ...formData, voucher_type: e.target.value })}
                  required
                >
                  <option value="receipt">سند قبض</option>
                  <option value="payment">سند صرف</option>
                  <option value="invoice">فاتورة نقدي</option>
                </select>
              </div>

              <div className="form-group">
                <label>العضو *</label>
                <select
                  className="form-control"
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  required
                >
                  <option value="">-- اختر العضو --</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} {member.national_id ? `(${member.national_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>المبلغ *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="any"
                />
              </div>

              <div className="form-group">
                <label>التاريخ *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.voucher_date}
                  onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>البيان / الوصف</label>
                <textarea
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ السند</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
