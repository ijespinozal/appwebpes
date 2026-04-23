import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ResultsProvider } from './context/ResultsContext';
import { ProtectedRoute, AdminRoute } from './components/auth/RouteGuards';

// ── Lazy loading (code splitting automático por ruta) ────────
// Auth
const LoginPage    = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// Player (accesible por jugadores y admin)
const DashboardPage  = lazy(() => import('./pages/player/DashboardPage'));
const VersusPage     = lazy(() => import('./pages/player/VersusPage'));
const StandingsPage  = lazy(() => import('./pages/player/StandingsPage'));
const DirectoryPage  = lazy(() => import('./pages/player/DirectoryPage'));
const ProfilePage    = lazy(() => import('./pages/player/ProfilePage'));

// Admin
const AdminPanelPage      = lazy(() => import('./pages/admin/AdminPanelPage'));
const TournamentPage      = lazy(() => import('./pages/admin/TournamentPage'));
const ResultsPage         = lazy(() => import('./pages/admin/ResultsPage'));

// Layout con navbar (compartido entre todas las rutas protegidas)
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

// ── Fallback de carga ────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-g-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-g-border border-t-g-cyan rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ResultsProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ── Rutas Públicas ──────────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Rutas Protegidas (con Layout compartido) ─ */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

              {/* Jugadores y Admin */}
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/versus"     element={<VersusPage />} />
              <Route path="/standings"  element={<StandingsPage />} />
              <Route path="/directory"  element={<DirectoryPage />} />
              <Route path="/profile"    element={<ProfilePage />} />

              {/* Solo Admin */}
              <Route path="/admin" element={
                <AdminRoute><AdminPanelPage /></AdminRoute>
              }/>
              <Route path="/admin/tournament" element={
                <AdminRoute><TournamentPage /></AdminRoute>
              }/>
              <Route path="/admin/results" element={
                <AdminRoute><ResultsPage /></AdminRoute>
              }/>
            </Route>

            {/* ── Redirects ──────────────────────────────── */}
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/login"     replace />} />

          </Routes>
        </Suspense>
        </ResultsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
