import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ── Spinner de carga ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-g-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-g-border border-t-g-cyan rounded-full animate-spin" />
        <p className="text-g-muted text-sm">Cargando...</p>
      </div>
    </div>
  );
}

/**
 * Protege rutas que requieren estar autenticado.
 * Uso con <Outlet> (nested routes) o como wrapper directo.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading)         return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Si se usa como layout con Outlet
  return children ?? <Outlet />;
}

/**
 * Protege rutas exclusivas del administrador.
 * - No autenticado  → /login
 * - Autenticado sin rol admin → /dashboard
 */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading)          return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login"     replace />;
  if (!isAdmin)         return <Navigate to="/dashboard" replace />;

  return children ?? <Outlet />;
}
