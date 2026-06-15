import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('null_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-logout on 401 (expired/terminated session)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session is invalid server-side — clear token and force re-auth
      const wasLoggedIn = !!localStorage.getItem('null_token');
      localStorage.removeItem('null_token');
      if (wasLoggedIn && window.location.pathname !== '/login') {
        // Redirect with reason param so Login page can show a message
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
