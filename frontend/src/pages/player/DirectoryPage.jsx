import { useState, useEffect } from 'react';
import { Users, Loader2, AlertCircle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
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

function PlayerCard({ player }) {
  const age = calcAge(player.birth_date);

  return (
    <div className="card flex flex-col items-center text-center gap-3 p-4
                    hover:border-g-border/80 hover:bg-g-border/10 transition-all duration-150">

      {/* Avatar */}
      <div className="relative">
        {player.profile_photo
          ? <img src={player.profile_photo} alt={player.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-g-border" />
          : <div className="w-20 h-20 rounded-full bg-g-blue border-2 border-g-border
                             flex items-center justify-center
                             font-display font-bold text-3xl text-white uppercase">
              {player.name?.[0]}
            </div>
        }
        {/* Badge: pago confirmado */}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center
                          justify-center border-2 border-g-card
                          ${player.payment_confirmed ? 'bg-green-800' : 'bg-gray-800'}`}>
          {player.payment_confirmed
            ? <CheckCircle2 size={13} className="text-green-400" />
            : <XCircle      size={13} className="text-gray-500"  />
          }
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 w-full">
        <p className="font-display font-bold text-white uppercase tracking-wide
                       text-base leading-tight truncate">
          {player.name}
        </p>
        {age && (
          <p className="text-g-muted text-xs">{age} años</p>
        )}
        {player.team_name && (
          <p className="text-g-cyan text-xs font-medium mt-1 truncate">
            ⚽ {player.team_name}
          </p>
        )}
      </div>

      {/* Indicadores */}
      <div className="flex gap-2 w-full justify-center flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                           px-2 py-0.5 rounded-full border
                           ${player.payment_confirmed
                             ? 'bg-green-900/40 text-green-400 border-green-800'
                             : 'bg-gray-800/40 text-gray-500 border-gray-700'}`}>
          {player.payment_confirmed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          Inscripción
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                           px-2 py-0.5 rounded-full border
                           ${player.donation_brought
                             ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
                             : 'bg-gray-800/40 text-gray-500 border-gray-700'}`}>
          {player.donation_brought ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          Donación
        </span>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  const { tournament, loading: tLoad } = useActiveTournament();
  const [players, setPlayers] = useState([]);
  const [pLoad,   setPLoad]   = useState(false);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'confirmed' | 'pending'

  useEffect(() => {
    if (!tournament?.id) return;
    setPLoad(true);
    api.get(`/tournaments/${tournament.id}/summary`)
      .then(({ data }) => setPlayers(data.players ?? []))
      .finally(() => setPLoad(false));
  }, [tournament?.id]);

  if (tLoad || pLoad) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-g-cyan" />
    </div>
  );

  if (!tournament) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
      <AlertCircle size={40} className="text-g-muted" />
      <p className="text-g-muted text-sm">No hay torneo activo</p>
    </div>
  );

  const confirmed = players.filter(p => p.payment_confirmed);
  const shown = filter === 'confirmed' ? confirmed
              : filter === 'pending'   ? players.filter(p => !p.payment_confirmed)
              : players;

  return (
    <div className="space-y-4 py-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-g-gold" />
          <div>
            <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">
              Los Amigos
            </h1>
            <p className="text-g-muted text-xs">{tournament.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="text-green-400 text-sm font-bold">{confirmed.length}</span>
          <span className="text-g-muted text-xs">/ {players.length}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 bg-g-card rounded-xl p-1 border border-g-border">
        {[
          { key: 'all',       label: `Todos (${players.length})`    },
          { key: 'confirmed', label: `Pagados (${confirmed.length})` },
          { key: 'pending',   label: `Pendientes (${players.length - confirmed.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
              filter === key
                ? 'bg-g-accent text-white'
                : 'text-g-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Grid de jugadores */}
      {shown.length === 0 ? (
        <div className="text-center py-16">
          <Users size={36} className="text-g-border mx-auto mb-3" />
          <p className="text-g-muted text-sm">No hay jugadores en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {shown.map(p => <PlayerCard key={p.user_id} player={p} />)}
        </div>
      )}

    </div>
  );
}
