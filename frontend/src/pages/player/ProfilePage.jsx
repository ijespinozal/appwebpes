import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const b     = new Date(birthDate);
  let age     = today.getFullYear() - b.getFullYear();
  const m     = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const [form,    setForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const age = calcAge(user?.birth_date);

  function handleChange(e) {
    setError(''); setSuccess('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.current_password || !form.new_password || !form.confirm) {
      setError('Completa todos los campos'); return;
    }
    if (form.new_password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres'); return;
    }
    if (form.new_password !== form.confirm) {
      setError('Las contraseñas no coinciden'); return;
    }
    setLoading(true);
    try {
      await api.put('/auth/update-password', {
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      setSuccess('¡Contraseña actualizada correctamente!');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-5 py-2 max-w-md mx-auto">

      {/* ── Tarjeta de perfil ──────────────────────────────── */}
      <div className="card bg-gradient-to-br from-g-card to-g-blue flex flex-col items-center gap-3 py-6">
        {user?.profile_photo
          ? <img src={user.profile_photo} alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-g-cyan shadow-neon-cyan" />
          : <div className="w-24 h-24 rounded-full bg-g-blue border-2 border-g-cyan shadow-neon-cyan
                             flex items-center justify-center font-display font-bold text-4xl text-white uppercase">
              {user?.name?.[0]}
            </div>
        }

        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-white uppercase tracking-wide">
            {user?.name}
          </h1>
          {age && <p className="text-g-muted text-sm">{age} años</p>}
          {user?.team_name && (
            <p className="text-g-cyan text-sm font-medium mt-0.5">⚽ {user.team_name}</p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <span className="badge-pending px-3 py-1">📱 {user?.phone}</span>
          {user?.role === 'admin' && <span className="badge-admin px-3 py-1">Admin</span>}
        </div>
      </div>

      {/* ── Cambiar contraseña ─────────────────────────────── */}
      <div className="card">
        <p className="section-title mb-4">Cambiar Contraseña</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { name: 'current_password', label: 'Contraseña actual',   placeholder: '••••••••' },
            { name: 'new_password',     label: 'Nueva contraseña',     placeholder: 'Mín. 6 caracteres' },
            { name: 'confirm',          label: 'Confirmar contraseña', placeholder: 'Repite la nueva' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="label">{label}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input
                  type="password"
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="input-gaming pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={15} /> {success}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* ── Cerrar sesión ──────────────────────────────────── */}
      <button
        onClick={handleLogout}
        className="btn-secondary w-full flex items-center justify-center gap-2 border-red-900/50 hover:border-g-accent hover:text-g-accent"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>

    </div>
  );
}
