import { useState, useEffect } from 'react';
import { Swords, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import { useResults }           from '../../context/ResultsContext';
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

function PlayerAvatar({ photo, name, glow }) {
  const ring = glow === 'red'  ? 'border-g-accent shadow-neon-red'
             : glow === 'cyan' ? 'border-g-cyan  shadow-neon-cyan'
             : 'border-g-border';

  if (photo) {
    return (
      <img src={photo} alt={name}
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 ${ring}`} />
    );
  }
  return (
    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ${ring}
                     bg-g-blue flex items-center justify-center
                     font-display font-bold text-3xl text-white uppercase`}>
      {name?.[0] ?? '?'}
    </div>
  );
}

function getPhaseLabel(match, allMatches) {
  if (match.phase !== 'playoff') return null;
  const maxRound = Math.max(...allMatches.filter(m => m.phase === 'playoff').map(m => m.round_number));
  return match.round_number === maxRound ? 'Final' : 'Semifinal';
}

function VersusCard({ match, phaseLabel }) {
  const homeAge = calcAge(match.home_birth_date);
  const awayAge = calcAge(match.away_birth_date);
  const done    = match.status === 'completed';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-g-border shadow-lg">

      {/* Fondo bicolor sutil */}
      <div className="absolute inset-0 bg-gradient-versus pointer-events-none" />
      <div className="absolute inset-y-0 left-0  w-2/5 bg-g-accent/5 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-2/5 bg-g-cyan/5   pointer-events-none" />

      {/* Badge jornada / fase */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10">
        <span className={`text-[9px] font-bold tracking-widest uppercase
                         bg-g-card/80 backdrop-blur px-2.5 py-0.5 rounded-full border whitespace-nowrap
                         ${phaseLabel === 'Final' ? 'text-g-gold border-g-gold/50'
                           : phaseLabel === 'Semifinal' ? 'text-g-cyan border-g-cyan/50'
                           : 'text-g-muted border-g-border'}`}>
          {phaseLabel ?? (match.group_name ? `GRP ${match.group_name} · J${match.round_number}` : `J${match.round_number}`)}
        </span>
      </div>

      <div className="relative flex items-center justify-between px-4 pt-9 pb-5 gap-1">

        {/* LOCAL */}
        <div className="flex flex-col items-center gap-1.5 flex-1 text-center min-w-0">
          <PlayerAvatar photo={match.home_photo} name={match.home_name} glow="red" />
          <p className="font-display font-bold text-sm sm:text-base text-white
                         uppercase tracking-wide leading-tight line-clamp-1 w-full">
            {match.home_name}
          </p>
          {match.home_team && (
            <p className="text-g-cyan text-[11px] leading-none line-clamp-1">{match.home_team}</p>
          )}
          {homeAge && <p className="text-g-muted text-[10px]">{homeAge} años</p>}
        </div>

        {/* CENTRO */}
        <div className="flex flex-col items-center justify-center mx-1 shrink-0 min-w-[48px]">
          {done ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-display font-black text-3xl text-white leading-none">
                {match.home_goals}
              </span>
              <span className="text-g-muted text-[10px] font-bold tracking-widest">–</span>
              <span className="font-display font-black text-3xl text-white leading-none">
                {match.away_goals}
              </span>
              <CheckCircle2 size={12} className="text-green-400 mt-1" />
            </div>
          ) : (
            <span className="font-display font-black text-4xl sm:text-5xl text-g-accent
                             drop-shadow-[0_0_20px_rgba(233,69,96,0.85)] animate-pulse-slow">
              VS
            </span>
          )}
        </div>

        {/* VISITANTE */}
        <div className="flex flex-col items-center gap-1.5 flex-1 text-center min-w-0">
          <PlayerAvatar photo={match.away_photo} name={match.away_name} glow="cyan" />
          <p className="font-display font-bold text-sm sm:text-base text-white
                         uppercase tracking-wide leading-tight line-clamp-1 w-full">
            {match.away_name}
          </p>
          {match.away_team && (
            <p className="text-g-cyan text-[11px] leading-none line-clamp-1">{match.away_team}</p>
          )}
          {awayAge && <p className="text-g-muted text-[10px]">{awayAge} años</p>}
        </div>

      </div>
    </div>
  );
}

export default function VersusPage() {
  const { tournament, loading: tLoad } = useActiveTournament();
  const { markSeen }                   = useResults();
  const [matches, setMatches] = useState([]);
  const [mLoad,   setMLoad]   = useState(false);
  const [tab,     setTab]     = useState('scheduled');

  useEffect(() => {
    if (!tournament?.id) return;
    setMLoad(true);
    api.get(`/matches/tournament/${tournament.id}`)
      .then(({ data }) => { setMatches(data); markSeen(); })
      .finally(() => setMLoad(false));
  }, [tournament?.id]);

  if (tLoad || mLoad) return (
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

  const scheduled = matches.filter(m => m.status === 'scheduled');
  const completed = matches.filter(m => m.status === 'completed');
  const shown     = tab === 'scheduled' ? scheduled : completed;

  // Agrupar por número de jornada
  const byRound = shown.reduce((acc, m) => {
    const label = getPhaseLabel(m, matches);
    const k = label ? `playoff_${m.round_number}` : String(m.round_number);
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4 py-2">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords size={22} className="text-g-accent" />
        <div>
          <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">
            Cartelera de Versus
          </h1>
          <p className="text-g-muted text-xs">{tournament.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-g-card rounded-xl p-1 border border-g-border">
        {[
          { key: 'scheduled', label: `Próximos (${scheduled.length})`  },
          { key: 'completed', label: `Jugados  (${completed.length})`  },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
              tab === key
                ? 'bg-g-accent text-white'
                : 'text-g-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista de partidos */}
      {Object.keys(byRound).length === 0 ? (
        <div className="text-center py-16">
          <Swords size={36} className="text-g-border mx-auto mb-3" />
          <p className="text-g-muted text-sm">
            {tab === 'scheduled' ? 'No hay partidos programados aún' : 'Aún no se han jugado partidos'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byRound)
            .sort(([a], [b]) => {
              const na = a.startsWith('playoff_') ? 9000 + Number(a.replace('playoff_','')) : Number(a);
              const nb = b.startsWith('playoff_') ? 9000 + Number(b.replace('playoff_','')) : Number(b);
              return na - nb;
            })
            .map(([key, rMatches]) => {
              const firstMatch   = rMatches[0];
              const phaseLabel   = getPhaseLabel(firstMatch, matches);
              const sectionLabel = phaseLabel ?? `Jornada ${firstMatch.round_number}`;
              const labelColor   = phaseLabel === 'Final' ? 'text-g-gold' : phaseLabel === 'Semifinal' ? 'text-g-cyan' : 'text-g-muted';
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-g-border" />
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 ${labelColor}`}>
                      {sectionLabel}
                    </span>
                    <div className="h-px flex-1 bg-g-border" />
                  </div>
                  {rMatches.map(m => <VersusCard key={m.id} match={m} phaseLabel={getPhaseLabel(m, matches)} />)}
                </div>
              );
            })
          }
        </div>
      )}

    </div>
  );
}
