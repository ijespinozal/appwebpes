import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ phone: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  function handleChange(e) {
    setError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.phone || !form.password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-g-bg flex items-center justify-center px-4
                    bg-[radial-gradient(ellipse_at_top,_#0f3460_0%,_#0f0f1a_60%)]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                          bg-g-card border-2 border-g-accent shadow-neon-red mb-4">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="font-display font-bold text-4xl uppercase tracking-widest text-white">
            PES Torneo
          </h1>
          <p className="text-g-muted text-sm mt-1 tracking-wider uppercase">
            Entre Amigos
          </p>
        </div>

        {/* Card */}
        <div className="card border-g-border/60 shadow-2xl">
          <h2 className="section-title mb-5 text-center">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="label">Número de celular</label>
              <div className="relative">
                <Phone size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ej: 987654321"
                  className="input-gaming pl-9"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-gaming pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800
                            rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <LogIn   size={18} />}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-g-muted text-sm mt-5">
            ¿No tienes cuenta?{' '}
            <Link to="/register"
              className="text-g-cyan hover:text-white transition-colors font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
