import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { getDeviceFingerprint } from '../utils/fingerprint';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('null_token'));
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState({ fingerprint: '', deviceName: '' });
  const [sessionId, setSessionId] = useState(null);

  // Get device fingerprint on load
  useEffect(() => {
    const info = getDeviceFingerprint();
    setDeviceInfo(info);
  }, []);

  // Check token validity on startup
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('null_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setSessionId(response.data.session_id);
      } catch (err) {
        console.warn('Session verification failed, logging out.');
        handleLogoutLocal();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleLogoutLocal = () => {
    localStorage.removeItem('null_token');
    setToken(null);
    setUser(null);
    setSessionId(null);
  };

  const login = async (email, password) => {
    // Submit login with email, password, and device fingerprint details
    const response = await api.post('/auth/login', {
      email,
      password,
      device_fingerprint: deviceInfo.fingerprint,
      device_name: deviceInfo.deviceName
    });

    const data = response.data;

    // If TOTP is required, return the temp_token for the next step
    if (data.requires_totp) {
      return { requires_totp: true, temp_token: data.temp_token };
    }

    // Direct login (no TOTP enabled)
    localStorage.setItem('null_token', data.token);
    setToken(data.token);
    setUser(data.user);
    // Since login response might not return session_id directly, get it from /auth/me or verify token
    return { success: true };
  };

  const verifyTotp = async (tempToken, totpCode) => {
    const response = await api.post('/auth/totp/verify', {
      temp_token: tempToken,
      totp_code: totpCode
    });

    const data = response.data;
    localStorage.setItem('null_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return { success: true };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err.message);
    } finally {
      handleLogoutLocal();
    }
  };

  const updateUserInfo = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        deviceInfo,
        sessionId,
        login,
        verifyTotp,
        logout,
        updateUserInfo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
