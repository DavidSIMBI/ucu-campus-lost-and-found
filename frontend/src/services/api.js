import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically attach authentication token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.setContentType === 'function') {
      // Adapters remove this bare type and add their own multipart boundary.
      config.headers.setContentType('multipart/form-data');
    } else {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
  }

  return config;
});
