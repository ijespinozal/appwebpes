import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Shield, Trophy, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PLAYER_LINKS = [
  { to: '/dashboard', label: 'Inicio'  },
  { to: '/versus',    label: 'Versus'  },
  { to: '/standings', label: 'Tabla'   },
  { to: '/directory', label: 'Amigos'  },
];

const ADMIN_LINKS = [
  { to: '/admin',            label: 'Jugadores', icon: Shield,        end: true },
  { to: '/admin/tournament', label: 'Torneo',    icon: Trophy,        end: false },
  { to: '/admin/results',    label: 'Resultados',icon: ClipboardList, end: false },
];

function Avatar({ user }) {
  if (user.profile_photo) {
    return <img src={user.profile_photo} alt={user.name}
      className="w-8 h-8 rounded-full object-cover border-2 border-g-border" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-g-blue border-2 border-g-border
                     flex items-center justify-center text-sm font-bold text-white uppercase">
      {user.name[0]}
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink end={end} to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
         flex items-center gap-1.5 ${
          isActive
            ? 'bg-g-accent/20 text-g-accent'
            : 'text-gray-400 hover:text-white hover:bg-g-border/50'
        }`
      }>
      {Icon && <Icon size={13} />}
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="hidden md:flex sticky top-0 z-40 bg-g-card/95 backdrop-blur
                    border-b border-g-border items-center justify-between px-6 h-14 shrink-0">

      {/* Logo */}
      <NavLink to="/dashboard"
        className="font-display font-bold text-xl uppercase tracking-widest
                   text-white hover:text-g-cyan transition-colors flex items-center gap-2">
        <span>⚽</span><span>PES Torneo</span>
      </NavLink>

      {/* Links centrales */}
      <div className="flex items-center gap-0.5">
        {isAdmin ? (
          <>
            {/* Admin ve solo sus 3 herramientas + un separador */}
            <span className="text-g-muted text-xs uppercase tracking-widest px-2">Admin</span>
            <div className="w-px h-4 bg-g-border mx-1" />
            {ADMIN_LINKS.map(l => <NavItem key={l.to} {...l} />)}
            <div className="w-px h-4 bg-g-border mx-1" />
            <NavItem to="/dashboard" label="Dashboard" />
          </>
        ) : (
          PLAYER_LINKS.map(l => <NavItem key={l.to} to={l.to} label={l.label} />)
        )}
      </div>

      {/* Usuario + logout */}
      <div className="flex items-center gap-3">
        <NavLink to="/profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Avatar user={user} />
          <div className="text-right">
            <p className="text-sm font-medium text-white leading-none">{user.name}</p>
            {user.team_name && (
              <p className="text-xs text-g-muted leading-none mt-0.5">{user.team_name}</p>
            )}
          </div>
        </NavLink>
        <button onClick={handleLogout}
          className="p-2 rounded-lg text-g-muted hover:text-g-accent hover:bg-g-accent/10
                     transition-all duration-150" title="Cerrar sesión">
          <LogOut size={17} />
        </button>
      </div>
    </nav>
  );
}
