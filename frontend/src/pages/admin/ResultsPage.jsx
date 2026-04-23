import { useState, useEffect } from 'react';
import { ClipboardList, Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import api from '../../api/axios';

function SmallAvatar({ photo, name }) {
  if (photo) return <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border border-g-border shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-g-blue border border-g-border shrink-0
                     flex items-center justify-center font-bold text-white text-xs uppercase">
      {name?.[0]}
    </div>
  );
}

function getPhaseLabel(match, allMatches) {
  if (match.phase !== 'playoff') return null;
  const maxRound = Math.max(...allMatches.filter(m => m.phase === 'playoff').map(m => m.round_number));
  return match.round_number === maxRound ? 'Final' : 'Semifinal';
}

function MatchCard({ match: initialMatch, phaseLabel }) {
  const [match,    setMatch]    = useState(initialMatch);
  const [hg,       setHg]       = useState(initialMatch.home_goals ?? '');
  const [ag,       setAg]       = useState(initialMatch.away_goals ?? '');
  const [loading,  setLoading]  = useState(false);
  const [saved,    setSaved]    = useState(initialMatch.status === 'completed');
  const [error,    setError]    = useState('');

  async function handleSave() {
    const h = parseInt(hg, 10);
    const a = parseInt(ag, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresa goles válidos (0 o más)'); return;
    }
    setLoading(true); setError('');
    try {
      await api.put(`/matches/${match.id}/result`, { home_goals: h, away_goals: a });
      setMatch(prev => ({ ...prev, home_goals: h, away_goals: a, status: 'completed' }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const done = match.status === 'completed';

  return (
    <div className={`card transition-all duration-200
                     ${done ? 'border-green-900/40 bg-green-950/10' : 'border-g-border'}`}>

      {/* Round / grupo / fase */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest
                          ${phaseLabel === 'Final' ? 'text-g-gold' : phaseLabel === 'Semifinal' ? 'text-g-cyan' : 'text-g-muted'}`}>
          {phaseLabel ?? (match.group_name ? `Grupo ${match.group_name} · J${match.round_number}` : `J${match.round_number}`)}
        </span>
        {done && <CheckCircle2 size={14} className="text-green-400" />}
      </div>

      {/* Jugadores + inputs */}
      <div className="flex items-center gap-2">

        {/* LOCAL */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SmallAvatar photo={match.home_photo} name={match.home_name} />
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-none">{match.home_name}</p>
            {match.home_team && <p className="text-g-muted text-[10px] truncate">{match.home_team}</p>}
          </div>
        </div>

        {/* Marcador */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number" min="0" max="99"
            value={hg}
            onChange={e => { setHg(e.target.value); setSaved(false); setError(''); }}
            className="w-11 h-10 text-center bg-g-bg border border-g-border rounded-lg
                       text-white font-display font-bold text-lg
                       focus:outline-none focus:border-g-cyan focus:ring-1 focus:ring-g-cyan
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                       [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-g-muted font-bold text-lg">–</span>
          <input
            type="number" min="0" max="99"
            value={ag}
            onChange={e => { setAg(e.target.value); setSaved(false); setError(''); }}
            className="w-11 h-10 text-center bg-g-bg border border-g-border rounded-lg
                       text-white font-display font-bold text-lg
                       focus:outline-none focus:border-g-cyan focus:ring-1 focus:ring-g-cyan
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                       [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* VISITANTE */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
          <SmallAvatar photo={match.away_photo} name={match.away_name} />
          <div className="min-w-0 text-right">
            <p className="text-white text-xs font-semibold truncate leading-none">{match.away_name}</p>
            {match.away_team && <p className="text-g-muted text-[10px] truncate">{match.away_team}</p>}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={loading || (hg === '' || ag === '')}
        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                    flex items-center justify-center gap-1.5 transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${saved
                      ? 'bg-green-900/40 text-green-400 border border-green-700'
                      : 'bg-g-accent/20 text-g-accent border border-g-accent hover:bg-g-accent hover:text-white'}`}
      >
        {loading ? <Loader2 size={13} className="animate-spin" />
         : saved   ? <CheckCircle2 size={13} />
         : <Save size={13} />}
        {loading ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar resultado'}
      </button>
    </div>
  );
}

export default function ResultsPage() {
  const { tournament, loading: tLoad } = useActiveTournament();
  const [matches, setMatches] = useState([]);
  const [mLoad,   setMLoad]   = useState(false);
  const [tab,     setTab]     = useState('scheduled');

  useEffect(() => {
    if (!tournament?.id) return;
    setMLoad(true);
    api.get(`/matches/tournament/${tournament.id}`)
      .then(({ data }) => setMatches(data))
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

  const pending   = matches.filter(m => m.status === 'scheduled');
  const completed = matches.filter(m => m.status === 'completed');
  const shown     = tab === 'scheduled' ? pending : completed;

  // Agrupa: para liga por round_number, para playoff usa etiqueta especial
  const byRound = shown.reduce((acc, m) => {
    const label = getPhaseLabel(m, matches);
    const k = label ? `playoff_${m.round_number}` : String(m.round_number);
    if (!acc[k]) acc[k] = [];
    acc[k].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4 py-2">

      <div className="flex items-center gap-3">
        <ClipboardList size={22} className="text-g-cyan" />
        <div>
          <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">
            Ingresar Resultados
          </h1>
          <p className="text-g-muted text-xs">{tournament.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-g-card rounded-xl p-1 border border-g-border">
        {[
          { key: 'scheduled', label: `Pendientes (${pending.length})`  },
          { key: 'completed', label: `Jugados (${completed.length})`    },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
              tab === key ? 'bg-g-accent text-white' : 'text-g-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Partidos */}
      {Object.keys(byRound).length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={36} className="text-g-border mx-auto mb-3" />
          <p className="text-g-muted text-sm">
            {tab === 'scheduled' ? 'No hay partidos pendientes 🎉' : 'Aún no hay resultados cargados'}
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
              const firstMatch  = rMatches[0];
              const phaseLabel  = getPhaseLabel(firstMatch, matches);
              const sectionLabel = phaseLabel ?? `Jornada ${firstMatch.round_number}`;
              const labelColor   = phaseLabel === 'Final' ? 'text-g-gold' : phaseLabel === 'Semifinal' ? 'text-g-cyan' : 'text-g-muted';
              return (
                <div key={key} className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-g-border" />
                    <span className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{sectionLabel}</span>
                    <div className="h-px flex-1 bg-g-border" />
                  </div>
                  {rMatches.map(m => <MatchCard key={m.id} match={m} phaseLabel={getPhaseLabel(m, matches)} />)}
                </div>
              );
            })
          }
        </div>
      )}

    </div>
  );
}
