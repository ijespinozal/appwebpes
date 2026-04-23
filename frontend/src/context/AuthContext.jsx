import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_TOKEN = 'pes_token';
const STORAGE_USER  = 'pes_user';

const AuthContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // hidrata desde localStorage

  // Hidratación inicial (una sola vez al montar)
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_TOKEN);
      const savedUser  = localStorage.getItem(STORAGE_USER);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // JSON inválido → limpiar
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Llamar tras login exitoso.
   * @param {string} tokenValue  - JWT recibido del backend
   * @param {object} userData    - { id, name, role, team_name, profile_photo, birth_date }
   */
  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem(STORAGE_TOKEN, tokenValue);
    localStorage.setItem(STORAGE_USER,  JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  /**
   * Cierra sesión y borra la persistencia.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Actualiza los datos del usuario en memoria y localStorage
   * (útil al cambiar foto de perfil, equipo, etc.)
   */
  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(STORAGE_USER, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,          // objeto completo o null
    token,
    loading,       // true mientras hidrata → usar para evitar flashes
    login,
    logout,
    updateUser,
    isAdmin:       user?.role === 'admin',
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
