import { useState, useEffect } from 'react';
import { Trophy, Zap, Loader2, CheckCircle2, AlertCircle,
         Plus, ChevronDown, Swords } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import api from '../../api/axios';

const STATUS_COLOR = {
  draft:        'text-gray-400',
  registration: 'text-yellow-400',
  in_progress:  'text-green-400',
  finished:     'text-g-muted',
};
const STATUS_LABEL = {
  draft: 'Borrador', registration: 'Inscripciones',
  in_progress: 'En curso', finished: 'Finalizado',
};
const FORMAT_SHORT = {
  league:          'Liga',
  groups_knockout: 'Grupos + Elim.',
  league_playoff:  'Liga + Playoff',
};

// ── Formulario de creación ────────────────────────────────────
function CreateForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', inscription_fee: '', prize_first_pct: '70',
    format: 'league', num_groups: '2',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const secondPct = 100 - Number(form.prize_first_pct || 0);

  function handleChange(e) {
    setError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { setError('El nombre es obligatorio'); return; }
    if (Number(form.prize_first_pct) <= 0 || Number(form.prize_first_pct) >= 100) {
      setError('El % del 1er lugar debe estar entre 1 y 99'); return;
    }
    setLoading(true);
    try {
      await api.post('/tournaments', {
        ...form,
        inscription_fee:  Number(form.inscription_fee) || 0,
        prize_first_pct:  Number(form.prize_first_pct),
        prize_second_pct: secondPct,
        num_groups: form.format === 'groups_knockout' ? Number(form.num_groups) : undefined,
      });
      setSuccess('¡Torneo creado exitosamente!');
      setForm({ name: '', inscription_fee: '', prize_first_pct: '70', format: 'league', num_groups: '2' });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al crear torneo');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nombre del torneo *</label>
        <input name="name" value={form.name} onChange={handleChange}
          placeholder="Ej: Copa Verano 2024" className="input-gaming" />
      </div>
      <div>
        <label className="label">Cuota de inscripción (S/)</label>
        <input name="inscription_fee" type="number" min="0" step="0.50"
          value={form.inscription_fee} onChange={handleChange}
          placeholder="0.00" className="input-gaming" />
      </div>
      <div>
        <label className="label">Premio 1er lugar (%)</label>
        <input name="prize_first_pct" type="number" min="1" max="99"
          value={form.prize_first_pct} onChange={handleChange} className="input-gaming" />
        <div className="flex gap-4 mt-2">
          <div className="flex-1 bg-g-bg/50 border border-g-border rounded-lg p-2 text-center">
            <p className="text-g-gold text-xs font-bold">🥇 1er lugar</p>
            <p className="text-g-gold font-display font-bold text-lg">{form.prize_first_pct || 0}%</p>
          </div>
          <div className="flex-1 bg-g-bg/50 border border-g-border rounded-lg p-2 text-center">
            <p className="text-g-silver text-xs font-bold">🥈 2do lugar</p>
            <p className="text-g-silver font-display font-bold text-lg">{secondPct}%</p>
          </div>
        </div>
      </div>
      <div>
        <label className="label">Formato</label>
        <div className="flex flex-col gap-2">
          {[
            { val: 'league',          label: 'Liga (todos contra todos)'  },
            { val: 'groups_knockout', label: 'Grupos + Eliminatorias'     },
            { val: 'league_playoff',  label: 'Liga + Playoff Top 4'       },
          ].map(({ val, label }) => (
            <button key={val} type="button"
              onClick={() => setForm(p => ({ ...p, format: val }))}
              className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-left
                          ${form.format === val
                            ? 'bg-g-accent/20 border-g-accent text-g-accent'
                            : 'border-g-border text-g-muted hover:text-white hover:border-g-border/80'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {form.format === 'groups_knockout' && (
        <div>
          <label className="label">Número de grupos</label>
          <select name="num_groups" value={form.num_groups} onChange={handleChange} className="input-gaming">
            {[2,3,4,6,8].map(n => <option key={n} value={n}>{n} grupos</option>)}
          </select>
        </div>
      )}
      {error   && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 size={14}/>{success}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Creando...' : 'Crear Torneo'}
      </button>
    </form>
  );
}

// ── Panel de gestión del torneo activo ────────────────────────
function ManagePanel({ tournament, onRefresh }) {
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [playoffBtn, setPlayoffBtn] = useState(null);
  // null = cargando | { label, sub, color, canClick }

  const isPlayoff  = tournament.format === 'league_playoff';
  const canFixture = tournament.status === 'registration';
  const inProgress = tournament.status === 'in_progress';
  const finished   = tournament.status === 'finished';

  // Cargar estado del playoff cada vez que el torneo entra en in_progress
  useEffect(() => {
    if (!isPlayoff || !inProgress) return;
    fetchPlayoffState();
  }, [tournament.id, tournament.status, tournament.format]);

  async function fetchPlayoffState() {
    setPlayoffBtn(null); // spinner
    try {
      const { data: matches } = await api.get(`/matches/tournament/${tournament.id}`);
      const league  = matches.filter(m => m.phase === 'league');
      const playoff = matches.filter(m => m.phase === 'playoff');
      const leaguePending = league.filter(m => m.status === 'scheduled').length;

      if (playoff.length === 0) {
        if (leaguePending > 0) {
          setPlayoffBtn({
            label:    `Liga en curso (faltan ${leaguePending} partidos)`,
            sub:      'Completa todos los partidos de liga para desbloquear las semifinales',
            color:    'border-yellow-700 text-yellow-400',
            canClick: false,
          });
        } else {
          setPlayoffBtn({
            label:    '⚡ Generar Semifinales ⚡',
            sub:      '1° vs 4°  ·  2° vs 3°',
            color:    'border-g-cyan text-g-cyan',
            canClick: true,
          });
        }
      } else if (playoff.length === 2) {
        const allDone = playoff.every(m => m.status === 'completed');
        if (allDone) {
          setPlayoffBtn({
            label:    '🏆 Generar Final 🏆',
            sub:      'Ganadores de las semifinales se enfrentan',
            color:    'border-g-gold text-g-gold',
            canClick: true,
          });
        } else {
          const semiPending = playoff.filter(m => m.status === 'scheduled').length;
          setPlayoffBtn({
            label:    `Semifinales en juego (faltan ${semiPending})`,
            sub:      'Carga los resultados de las semis en Resultados',
            color:    'border-yellow-700 text-yellow-400',
            canClick: false,
          });
        }
      } else {
        setPlayoffBtn({
          label:    'Final en juego',
          sub:      'Carga el resultado de la final en Resultados',
          color:    'border-green-700 text-green-400',
          canClick: false,
        });
      }
    } catch (err) {
      console.error('[fetchPlayoffState]', err);
      // Fallback: mostrar botón genérico, el backend validará
      setPlayoffBtn({
        label:    '⚡ Generar Semifinales ⚡',
        sub:      '',
        color:    'border-g-cyan text-g-cyan',
        canClick: true,
      });
    }
  }

  async function generateFixture() {
    if (!window.confirm(
      `¿Generar fixture para "${tournament.name}"?\n\nSolo hazlo cuando todos los jugadores estén confirmados.`
    )) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await api.post(`/tournaments/${tournament.id}/generate-fixture`);
      setSuccess(`✅ Fixture generado: ${data.total_matches} partidos`);
      onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al generar fixture');
    } finally { setLoading(false); }
  }

  async function advancePlayoff() {
    if (!window.confirm('¿Confirmas generar la siguiente fase del playoff?')) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await api.post(`/tournaments/${tournament.id}/generate-playoff`);
      setSuccess(`✅ ${data.message}`);
      onRefresh?.();
      fetchPlayoffState();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al generar playoff');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">

      {/* Info del torneo */}
      <div className="card bg-gradient-to-br from-g-card to-g-blue">
        <div className="flex justify-between items-start">
          <div>
            <p className="section-title mb-1">Torneo activo</p>
            <h2 className="font-display font-bold text-lg text-white uppercase">{tournament.name}</h2>
            <p className="text-g-muted text-xs mt-0.5">
              {FORMAT_SHORT[tournament.format] ?? tournament.format} ·
              {' '}{tournament.total_confirmed ?? '?'} confirmados ·
              S/{tournament.inscription_fee}
            </p>
          </div>
          <span className={`text-xs font-bold uppercase ${STATUS_COLOR[tournament.status]}`}>
            {STATUS_LABEL[tournament.status]}
          </span>
        </div>
      </div>

      {/* ── Generar Fixture (solo en registration) ── */}
      {canFixture && (
        <div className="space-y-2">
          <button onClick={generateFixture} disabled={loading}
            className="w-full py-5 rounded-xl font-display font-bold text-xl uppercase
                       tracking-widest text-white border-2 border-g-cyan shadow-neon-cyan
                       bg-g-cyan/10 hover:bg-g-cyan/20 active:scale-[0.98]
                       transition-all duration-200 flex items-center justify-center gap-3
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="text-g-cyan" />}
            {loading ? 'Generando...' : '⚡ Generar Fixture ⚡'}
          </button>
          <p className="text-g-muted text-xs text-center">
            Confirma los pagos en el Panel Admin antes de generar
          </p>
        </div>
      )}

      {/* ── Torneo normal en progreso (no playoff) ── */}
      {!isPlayoff && inProgress && (
        <div className="card border-green-800/50 text-center py-5">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-semibold">Fixture generado</p>
          <p className="text-g-muted text-xs mt-1">Carga resultados en "Resultados"</p>
        </div>
      )}

      {/* ── SECCIÓN PLAYOFF ── */}
      {isPlayoff && inProgress && (
        <div className="space-y-2">
          <p className="section-title">Fase Playoff</p>

          {playoffBtn === null ? (
            // Cargando estado
            <div className="card flex items-center justify-center py-6">
              <Loader2 size={22} className="animate-spin text-g-cyan" />
            </div>
          ) : (
            <>
              <button
                onClick={playoffBtn.canClick ? advancePlayoff : undefined}
                disabled={loading || !playoffBtn.canClick}
                className={`w-full py-4 rounded-xl font-display font-bold text-lg uppercase
                           tracking-widest border-2 bg-g-card/60
                           transition-all duration-200 flex items-center justify-center gap-3
                           ${playoffBtn.canClick
                             ? 'hover:bg-g-card active:scale-[0.98] cursor-pointer'
                             : 'cursor-default opacity-70'}
                           ${playoffBtn.color}
                           disabled:cursor-not-allowed`}>
                {loading
                  ? <Loader2 size={22} className="animate-spin" />
                  : <Swords size={22} />}
                {loading ? 'Generando...' : playoffBtn.label}
              </button>
              {playoffBtn.sub && (
                <p className="text-g-muted text-xs text-center">{playoffBtn.sub}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Finalizado ── */}
      {finished && (
        <div className="card border-g-gold/40 text-center py-5">
          <Trophy size={32} className="text-g-gold mx-auto mb-2" />
          <p className="text-g-gold font-semibold">Torneo finalizado</p>
          <p className="text-g-muted text-xs mt-1">Revisa el campeón en el Dashboard</p>
        </div>
      )}

      {error   && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{success}</p>}
    </div>
  );
}

// ── Selector de torneo ────────────────────────────────────────
const STATUS_DOT = {
  draft: 'bg-gray-500', registration: 'bg-yellow-400',
  in_progress: 'bg-green-400', finished: 'bg-g-muted',
};

function TournamentSelector({ all, current, onSelect }) {
  const [open, setOpen] = useState(false);
  if (all.length <= 1) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full card flex items-center justify-between gap-2 hover:bg-g-border/20 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[current?.status]}`} />
          <span className="text-white text-sm font-semibold truncate">{current?.name}</span>
          <span className={`text-xs ${STATUS_COLOR[current?.status]}`}>· {STATUS_LABEL[current?.status]}</span>
        </div>
        <ChevronDown size={16} className={`text-g-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-g-card border border-g-border
                        rounded-xl overflow-hidden shadow-2xl">
          {all.map(t => (
            <button key={t.id} onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-g-border/30
                          transition-colors border-b border-g-border/50 last:border-0
                          ${t.id === current?.id ? 'bg-g-accent/10' : ''}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status]}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${t.id === current?.id ? 'text-g-accent' : 'text-white'}`}>
                  {t.name}
                </p>
                <p className="text-g-muted text-xs">
                  {STATUS_LABEL[t.status]} · {t.total_confirmed ?? 0} pagados · S/{t.inscription_fee}
                </p>
              </div>
              {t.id === current?.id && <CheckCircle2 size={14} className="text-g-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function TournamentPage() {
  const { tournament, all, loading, selectTournament, reload } = useActiveTournament();
  const [tab, setTab] = useState('manage');

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-g-cyan" />
    </div>
  );

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-3">
        <Trophy size={22} className="text-g-gold" />
        <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">
          Gestión de Torneo
        </h1>
      </div>

      {all.length > 1 && (
        <div>
          <p className="section-title mb-2">Torneo seleccionado</p>
          <TournamentSelector all={all} current={tournament} onSelect={selectTournament} />
        </div>
      )}

      <div className="flex gap-1.5 bg-g-card rounded-xl p-1 border border-g-border">
        {[
          { key: 'manage', label: '⚙️ Gestionar'   },
          { key: 'create', label: '＋ Nuevo Torneo' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
              tab === key ? 'bg-g-accent text-white' : 'text-g-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className="card">
          <p className="section-title mb-4">Nuevo Torneo</p>
          <CreateForm onCreated={() => { reload(); setTab('manage'); }} />
        </div>
      )}

      {tab === 'manage' && (
        tournament
          ? <ManagePanel tournament={tournament} onRefresh={reload} />
          : <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertCircle size={40} className="text-g-muted" />
              <p className="text-g-muted text-sm">No hay torneos. Crea uno en "Nuevo Torneo".</p>
            </div>
      )}
    </div>
  );
}
