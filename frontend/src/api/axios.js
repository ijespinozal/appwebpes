import axios from 'axios';

const STORAGE_KEY_TOKEN = 'pes_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
});

// ── Request: inyectar JWT ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: manejar 401 global ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido → limpiar sesión y redirigir
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem('pes_user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
