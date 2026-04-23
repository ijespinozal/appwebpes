import { NavLink } from 'react-router-dom';
import { Home, Swords, BarChart2, Users, UserCircle,
         ShieldCheck, Trophy, ClipboardList } from 'lucide-react';
import { useAuth }    from '../../context/AuthContext';
import { useResults } from '../../context/ResultsContext';

// Jugador
const PLAYER_ITEMS = [
  { to: '/dashboard', icon: Home,        label: 'Inicio'  },
  { to: '/versus',    icon: Swords,      label: 'Versus'  },
  { to: '/standings', icon: BarChart2,   label: 'Tabla'   },
  { to: '/directory', icon: Users,       label: 'Amigos'  },
  { to: '/profile',   icon: UserCircle,  label: 'Perfil'  },
];

// Admin — acceso directo a sus 3 herramientas
const ADMIN_ITEMS = [
  { to: '/dashboard',        icon: Home,          label: 'Inicio'   },
  { to: '/admin',            icon: ShieldCheck,   label: 'Jugadores', end: true },
  { to: '/admin/tournament', icon: Trophy,        label: 'Torneo'   },
  { to: '/admin/results',    icon: ClipboardList, label: 'Results'  },
  { to: '/profile',          icon: UserCircle,    label: 'Perfil'   },
];

export default function BottomNav() {
  const { isAdmin }  = useAuth();
  const { hasNew }   = useResults();
  const items = isAdmin ? ADMIN_ITEMS : PLAYER_ITEMS;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40
                    bg-g-card/95 backdrop-blur border-t border-g-border
                    flex items-center justify-around h-16 px-1">
      {items.map(({ to, icon: Icon, label, end }) => {
        const showBadge = !isAdmin && hasNew && to === '/versus';
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg
               transition-all duration-150 ${
                isActive ? 'text-g-accent' : 'text-g-muted hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full
                                     bg-g-accent border border-g-card animate-pulse" />
                  )}
                </div>
                <span className="text-[9px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
