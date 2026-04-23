import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, User, Shield, Calendar, Camera, Loader2, UserPlus } from 'lucide-react';
import api from '../../api/axios';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:       '',
    phone:      '',
    password:   '',
    team_name:  '',
    birth_date: '',
  });
  const [photo,    setPhoto]    = useState(null);   // File object
  const [preview,  setPreview]  = useState(null);   // URL para previsualizar
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const fileRef = useRef(null);

  function handleChange(e) {
    setError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.password) {
      setError('Nombre, celular y contraseña son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (photo) fd.append('profile_photo', photo);

    setLoading(true);
    try {
      await api.post('/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-g-bg flex items-center justify-center px-4 py-8
                    bg-[radial-gradient(ellipse_at_top,_#0f3460_0%,_#0f0f1a_60%)]">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white">
            PES Torneo
          </h1>
          <p className="text-g-muted text-sm mt-1 tracking-wider uppercase">
            Crear cuenta
          </p>
        </div>

        <div className="card shadow-2xl">
          <h2 className="section-title mb-5 text-center">Registro de Jugador</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Foto de perfil ─────────────────────── */}
            <div className="flex flex-col items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed
                           border-g-border hover:border-g-cyan transition-colors group"
              >
                {preview
                  ? <img src={preview} alt="preview"
                      className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-g-bg flex flex-col items-center
                                    justify-center gap-1 group-hover:bg-g-border/20 transition-colors">
                      <Camera size={24} className="text-g-muted" />
                      <span className="text-g-muted text-[10px]">Foto</span>
                    </div>
                }
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </button>
              <span className="text-g-muted text-xs">Toca para subir foto (opcional)</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
                className="hidden"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="label">Nombre completo *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input type="text" name="name" value={form.name}
                  onChange={handleChange} placeholder="Tu nombre"
                  className="input-gaming pl-9" autoComplete="name" />
              </div>
            </div>

            {/* Celular */}
            <div>
              <label className="label">Número de celular *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input type="tel" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="Ej: 987654321"
                  className="input-gaming pl-9" inputMode="tel" autoComplete="tel" />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="label">Contraseña * (mín. 6 caracteres)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input type="password" name="password" value={form.password}
                  onChange={handleChange} placeholder="••••••••"
                  className="input-gaming pl-9" autoComplete="new-password" />
              </div>
            </div>

            {/* Equipo */}
            <div>
              <label className="label">Equipo en PES (opcional)</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input type="text" name="team_name" value={form.team_name}
                  onChange={handleChange} placeholder="Ej: Real Madrid"
                  className="input-gaming pl-9" />
              </div>
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className="label">Fecha de nacimiento (opcional)</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-g-muted pointer-events-none" />
                <input type="date" name="birth_date" value={form.birth_date}
                  onChange={handleChange}
                  className="input-gaming pl-9 [color-scheme:dark]" />
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 text-center">
                {success}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-g-muted text-sm mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-g-cyan hover:text-white transition-colors font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
