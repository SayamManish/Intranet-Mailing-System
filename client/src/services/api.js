import axios from 'axios';

// Detect whether to use proxy or current host's IP on LAN
const getBaseURL = () => {
  // If accessing over LAN from another device (e.g. 192.168.1.100:5173), API is on port 5000 of same host
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('intranet_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.response.data?.message?.includes('token') || error.response.data?.message?.includes('session')) {
        localStorage.removeItem('intranet_token');
        localStorage.removeItem('intranet_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
