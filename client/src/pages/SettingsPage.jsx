/**
 * صفحة الإعدادات
 * ===============
 * تغيير الاسم وكلمة المرور
 * إدارة المسؤولين (متاحة للمسؤول الرئيسي فقط)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, apiFetch, refreshUser } = useAuth();
  const [toast, setToast] = useState(null);

  // حالة الملف الشخصي وكلمة المرور
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });

  // حالة إدارة المسؤولين (للمسؤول الرئيسي)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    password: '',
    permissions: { dashboard: true, members: true, payments: true, defaulters: true },
  });
  
  // حالات عرض كلمة المرور
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- دوال الملف الشخصي وكلمة المرور ---

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('تم تحديث الملف الشخصي بنجاح');
      refreshUser();
    } catch (err) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify(passwordForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('تم تغيير كلمة المرور بنجاح');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (err) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  // --- دوال إدارة المسؤولين (Super Admin) ---

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showToast('خطأ في تحميل المسؤولين', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadUsers();
    }
  }, [user]);

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      full_name: '',
      password: '',
      permissions: { dashboard: true, members: true, payments: true, defaulters: true },
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (u) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      full_name: u.full_name,
      password: '', // لا نعرض كلمة المرور القديمة
      permissions: u.permissions || { dashboard: false, members: false, payments: false, defaulters: false },
    });
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // تحديث بيانات
        const res = await apiFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            username: userForm.username,
            full_name: userForm.full_name,
            permissions: userForm.permissions,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);

        // إذا تم كتابة كلمة مرور جديدة، نقوم بتغييرها
        if (userForm.password) {
          const passRes = await apiFetch(`/api/users/${editingUser.id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ new_password: userForm.password }),
          });
          if (!passRes.ok) throw new Error((await passRes.json()).error);
        }
        showToast('تم تعديل المسؤول بنجاح');
      } else {
        // إضافة جديد
        const res = await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(userForm),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('تم إضافة المسؤول بنجاح');
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المسؤول؟')) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('تم حذف المسؤول بنجاح');
      loadUsers();
    } catch (err) {
      showToast(err.message || 'حدث خطأ', 'error');
    }
  };

  const handlePermissionChange = (perm) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [perm]: !prev.permissions[perm],
      },
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <span>⚙️</span>
            <span>الإعدادات</span>
          </h2>
          <p className="page-description">تعديل الملف الشخصي وصلاحيات الوصول</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* تغيير الاسم */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">الملف الشخصي</h3>
          </div>
          <form onSubmit={handleProfileUpdate} style={{ padding: '20px' }}>
            <div className="form-group">
              <label className="form-label">الاسم بالكامل</label>
              <input
                type="text"
                className="form-input"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ full_name: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>حفظ الاسم</button>
          </form>
        </div>

        {/* تغيير كلمة المرور */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">تغيير كلمة المرور</h3>
          </div>
          <form onSubmit={handlePasswordUpdate} style={{ padding: '20px' }}>
            <div className="form-group">
              <label className="form-label">كلمة المرور الحالية</label>
              <div className="password-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  title={showCurrentPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور الجديدة</label>
              <div className="password-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>تحديث كلمة المرور</button>
          </form>
        </div>
      </div>

      {/* إدارة المسؤولين - تظهر فقط للمسؤول الرئيسي */}
      {user?.role === 'super_admin' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span>👥</span>
              <span>إدارة أعضاء الهيئة الإدارية</span>
            </h3>
            <button className="btn btn-primary btn-sm" onClick={openAddUserModal}>
              ➕ إضافة عضو إداري
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table mobile-cards-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>اسم المستخدم</th>
                  <th>الدور</th>
                  <th>الصلاحيات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>جاري التحميل...</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td data-label="الاسم" style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td data-label="اسم المستخدم" style={{ direction: 'ltr', textAlign: 'right' }}>{u.username}</td>
                      <td data-label="الدور">
                        {u.role === 'super_admin' ? (
                          <span className="badge badge-gold">مسؤول رئيسي</span>
                        ) : (
                          <span className="badge badge-active">عضو إداري</span>
                        )}
                      </td>
                      <td data-label="الصلاحيات">
                        {u.role === 'super_admin' ? (
                          <span style={{ color: 'var(--text-muted)' }}>كامل الصلاحيات</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {u.permissions.dashboard && <span className="badge" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>لوحة المعلومات</span>}
                            {u.permissions.members && <span className="badge" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>الأعضاء</span>}
                            {u.permissions.payments && <span className="badge" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>الاشتراكات</span>}
                            {u.permissions.defaulters && <span className="badge" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>المتخلفين</span>}
                          </div>
                        )}
                      </td>
                      <td data-label="الإجراءات">
                        <div className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditUserModal(u)}
                            disabled={u.role === 'super_admin' && u.id !== user.id}
                            title="تعديل"
                          >
                            ✏️
                          </button>
                          {u.role !== 'super_admin' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteUser(u.id)}
                              title="حذف"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل مستخدم */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingUser ? '✏️ تعديل بيانات المسؤول' : '➕ إضافة عضو إداري'}</h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">اسم المستخدم للولوج *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      style={{ direction: 'ltr', textAlign: 'right' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{editingUser ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور *'}</label>
                    <div className="password-wrapper">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        className="form-input"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        title={showUserPassword ? 'إخفاء' : 'إظهار'}
                      >
                        {showUserPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                </div>

                {(!editingUser || editingUser.role !== 'super_admin') && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">الصلاحيات:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={userForm.permissions.dashboard}
                          onChange={() => handlePermissionChange('dashboard')}
                        />
                        📊 لوحة المعلومات
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={userForm.permissions.members}
                          onChange={() => handlePermissionChange('members')}
                        />
                        👥 إدارة الأعضاء
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={userForm.permissions.payments}
                          onChange={() => handlePermissionChange('payments')}
                        />
                        💰 الاشتراكات والدفعات
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={userForm.permissions.defaulters}
                          onChange={() => handlePermissionChange('defaulters')}
                        />
                        ⚠️ المتخلفين عن السداد
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingUser ? '💾 حفظ التعديلات' : '➕ إضافة المسؤول'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
