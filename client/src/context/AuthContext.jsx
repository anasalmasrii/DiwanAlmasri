/**
 * سياق المصادقة
 * ==============
 * إدارة حالة تسجيل الدخول والصلاحيات
 */

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('diwan_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('diwan_token');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'خطأ في تسجيل الدخول');
    }

    localStorage.setItem('diwan_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('diwan_token');
    setToken(null);
    setUser(null);
  };

  /**
   * تحديث بيانات المستخدم في السياق (بعد تغيير الملف الشخصي)
   */
  const refreshUser = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {}
  };

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401 || res.status === 403) {
      if (url !== '/api/auth/me') {
        // لا نسجل الخروج إذا كان مجرد فحص صلاحيات
        if (res.status === 401) {
          logout();
          throw new Error('انتهت صلاحية الجلسة');
        }
      }
    }

    return res;
  };

  /**
   * التحقق من صلاحية محددة
   * المسؤول الرئيسي يملك جميع الصلاحيات
   */
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions?.[permission] === true;
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, apiFetch, hasPermission, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
