import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Swords, BarChart2, Loader2, AlertCircle,
         CheckCircle2, Clock, UserPlus, XCircle, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import api from '../../api/axios';

const STATUS_LABEL = {
  draft:        { text: 'Borrador',      color: 'text-gray-400'   },
  registration: { text: 'Inscripciones', color: 'text-yellow-400' },
  in_progress:  { text: 'En curso',      color: 'text-green-400'  },
  finished:     { text: 'Finalizado',    color: 'text-g-muted'    },
};

const FORMAT_LABEL = {
  league:          'Liga · Todos contra todos',
  groups_knockout: 'Grupos + Eliminatorias',
};

export default function DashboardPage() {
  const { user, isAdmin }               = useAuth();
  const { tournament, loading: tLoad }  = useActiveTournament();
  const [summary,    setSummary]        = useState(null);
  const [sLoad,      setSLoad]          = useState(false);
  const [myStatus,   setMyStatus]       = useState(null);
  const [inscLoading,setInscLoading]    = useState(false);
  const [champion,   setChampion]       = useState(null);

  useEffect(() => {
    if (!tournament?.id) return;
    setSLoad(true);
    api.get(`/tournaments/${tournament.id}/summary`)
      .then(({ data }) => setSummary(data))
      .finally(() => setSLoad(false));
  }, [tournament?.id]);

  // Consulta el estado de inscripción del jugador actual
  useEffect(() => {
    if (!tournament?.id || isAdmin) return;
    api.get(`/inscriptions/my-status/${tournament.id}`)
      .then(({ data }) => setMyStatus(data))
      .catch(() => setMyStatus({ inscribed: false }));
  }, [tournament?.id, isAdmin]);

  // Obtener campeón cuando el torneo está finalizado
  useEffect(() => {
    if (!tournament?.id || tournament.status !== 'finished') return;

    if (tournament.format === 'league_playoff') {
      // Para playoff: el campeón es el ganador de la Final
      Promise.all([
        api.get(`/tournaments/${tournament.id}/standings`),
        api.get(`/matches/tournament/${tournament.id}`),
      ]).then(([{ data: standings }, { data: matches }]) => {
        const playoff  = matches.filter(m => m.phase === 'playoff');
        if (playoff.length === 0) { setChampion(standings[0] ?? null); return; }
        const maxRound = Math.max(...playoff.map(m => m.round_number));
        const final    = playoff.find(m => m.round_number === maxRound);
        if (final?.status === 'completed') {
          const winnerId = final.home_goals > final.away_goals
            ? final.home_player_id : final.away_player_id;
          const fromStandings = standings.find(s => s.user_id === winnerId);
          setChampion(fromStandings ?? {
            name:          winnerId === final.home_player_id ? final.home_name  : final.away_name,
            profile_photo: winnerId === final.home_player_id ? final.home_photo : final.away_photo,
            team_name:     winnerId === final.home_player_id ? final.home_team  : final.away_team,
            points: '—', wins: '—', draws: '—', losses: '—',
          });
        } else { setChampion(standings[0] ?? null); }
      }).catch(() => {});
    } else {
      api.get(`/tournaments/${tournament.id}/standings`)
        .then(({ data }) => setChampion(data[0] ?? null))
        .catch(() => {});
    }
  }, [tournament?.id, tournament?.status, tournament?.format]);

  async function handleInscribe() {
    setInscLoading(true);
    try {
      await api.post('/inscriptions', { tournament_id: tournament.id });
      setMyStatus({ inscribed: true, payment_confirmed: false });
    } catch (err) {
      const msg = err.response?.data?.message ?? '';
      if (err.response?.status === 409)
        setMyStatus({ inscribed: true, payment_confirmed: false });
      else
        alert(msg || 'Error al inscribirse');
    } finally {
      setInscLoading(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('¿Cancelar tu inscripción en este torneo?')) return;
    setInscLoading(true);
    try {
      await api.delete(`/inscriptions/my/${tournament.id}`);
      setMyStatus({ inscribed: false });
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al cancelar');
    } finally {
      setInscLoading(false);
    }
  }

  if (tLoad || sLoad) return <PageLoader />;
  if (!tournament)    return <EmptyState />;

  const t  = summary?.tournament ?? tournament;
  const fi = summary?.financials;

  return (
    <div className="space-y-5 py-2">

      {/* ── Banner campeón ── */}
      {t.status === 'finished' && champion && (
        <ChampionBanner champion={champion} tournamentName={t.name} />
      )}

      {/* Saludo */}
      <div>
        <p className="text-g-muted text-sm">Bienvenido de vuelta,</p>
        <h1 className="font-display font-bold text-2xl text-white uppercase tracking-wide">
          {user.name} 👋
        </h1>
      </div>

      {/* Cabecera del torneo */}
      <div className="card bg-gradient-to-br from-g-card to-g-blue border-g-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="section-title mb-1">Torneo activo</p>
            <h2 className="font-display font-bold text-xl text-white uppercase tracking-wide leading-tight">
              {t.name}
            </h2>
            <p className="text-g-muted text-xs mt-1">{FORMAT_LABEL[t.format]}</p>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full
                            bg-g-bg/50 shrink-0 ${STATUS_LABEL[t.status]?.color}`}>
            {STATUS_LABEL[t.status]?.text}
          </span>
        </div>
      </div>

      {/* ── Inscripción (solo jugadores, torneo en registro) ── */}
      {!isAdmin && t.status === 'registration' && myStatus !== null && (
        <div>
          {!myStatus.inscribed ? (
            <button onClick={handleInscribe} disabled={inscLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {inscLoading
                ? <Loader2 size={18} className="animate-spin" />
                : <UserPlus size={18} />}
              {inscLoading ? 'Inscribiendo...' : '¡Inscribirme al torneo!'}
            </button>
          ) : myStatus.payment_confirmed ? (
            <div className="flex items-center gap-2 justify-center py-2.5 rounded-xl
                             bg-green-900/20 border border-green-800 text-green-400 text-sm font-semibold">
              <CheckCircle2 size={16} /> Inscrito y confirmado ✓
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center py-2.5 rounded-xl
                               bg-yellow-900/20 border border-yellow-800 text-yellow-400 text-sm font-semibold">
                <Clock size={16} /> Inscripción pendiente · Espera al admin
              </div>
              <button onClick={handleCancel} disabled={inscLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                           border border-red-800 text-red-400 text-sm font-semibold
                           bg-red-900/10 hover:bg-red-900/20 transition-colors disabled:opacity-50">
                {inscLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Cancelar inscripción
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pozo y premios */}
      {fi && (
        <div className="grid grid-cols-2 gap-3">

          {/* Pozo — ocupa fila completa en móvil */}
          <div className="col-span-2 card text-center border-g-accent/40">
            <p className="section-title mb-1">Pozo Total 💰</p>
            <p className="font-display font-bold text-5xl text-g-accent drop-shadow-[0_0_16px_rgba(233,69,96,0.6)]">
              S/{fi.prize_pool}
            </p>
            <p className="text-g-muted text-xs mt-1.5">
              {fi.total_confirmed} jugadores confirmados × S/{Number(t.inscription_fee)}
            </p>
          </div>

          {/* 1er lugar */}
          <div className="card text-center border-g-gold/30">
            <Trophy size={22} className="text-g-gold mx-auto mb-1.5" />
            <p className="text-g-gold text-[10px] font-bold uppercase tracking-widest">1er Lugar</p>
            <p className="font-display font-bold text-3xl text-g-gold">S/{fi.prize_first}</p>
            <p className="text-g-muted text-[10px] mt-0.5">{t.prize_first_pct}% del pozo</p>
          </div>

          {/* 2do lugar */}
          <div className="card text-center border-g-silver/20">
            <Trophy size={22} className="text-g-silver mx-auto mb-1.5" />
            <p className="text-g-silver text-[10px] font-bold uppercase tracking-widest">2do Lugar</p>
            <p className="font-display font-bold text-3xl text-g-silver">S/{fi.prize_second}</p>
            <p className="text-g-muted text-[10px] mt-0.5">{t.prize_second_pct}% del pozo</p>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <p className="section-title mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-1 gap-2.5">
          <QuickLink to="/versus"    icon={Swords}   label="Cartelera de Versus" sub="Ver los próximos partidos"    color="text-g-accent" />
          <QuickLink to="/standings" icon={BarChart2} label="Tabla de Posiciones" sub="Posiciones y estadísticas"    color="text-g-cyan"   />
          <QuickLink to="/directory" icon={Users}     label="Los Amigos"          sub="Directorio de participantes"  color="text-g-gold"   />
        </div>
      </div>

    </div>
  );
}

function ChampionBanner({ champion, tournamentName }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-g-gold/60
                    bg-gradient-to-br from-g-card via-g-blue to-g-card
                    shadow-[0_0_32px_rgba(255,215,0,0.25)] p-5 text-center">
      {/* Brillo de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-g-gold fill-g-gold" />
          <span className="text-g-gold text-[10px] font-bold uppercase tracking-[0.2em]">
            Campeón · {tournamentName}
          </span>
          <Star size={14} className="text-g-gold fill-g-gold" />
        </div>

        {/* Avatar */}
        {champion.profile_photo
          ? <img src={champion.profile_photo} alt={champion.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-g-gold
                         shadow-[0_0_20px_rgba(255,215,0,0.5)]" />
          : <div className="w-20 h-20 rounded-full border-4 border-g-gold
                             bg-g-blue flex items-center justify-center
                             font-display font-bold text-3xl text-g-gold uppercase
                             shadow-[0_0_20px_rgba(255,215,0,0.5)]">
              {champion.name?.[0]}
            </div>
        }

        <Trophy size={28} className="text-g-gold drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] -mt-1" />

        <div>
          <p className="font-display font-black text-2xl text-white uppercase tracking-wide
                         drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
            {champion.name}
          </p>
          {champion.team_name && (
            <p className="text-g-gold text-sm mt-0.5">{champion.team_name}</p>
          )}
          <p className="text-g-muted text-xs mt-1">
            {champion.points} pts · {champion.wins}V {champion.draws}E {champion.losses}D
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, sub, color }) {
  return (
    <Link to={to}
      className="card flex items-center gap-3 hover:bg-g-border/30 transition-all duration-150 active:scale-[0.98]">
      <div className={`p-2.5 rounded-lg bg-g-bg/60`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-none">{label}</p>
        <p className="text-g-muted text-xs mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-g-cyan" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <AlertCircle size={48} className="text-g-muted" />
      <h2 className="font-display font-bold text-xl text-white uppercase">Sin torneo activo</h2>
      <p className="text-g-muted text-sm max-w-xs">
        El administrador aún no ha creado ningún torneo. ¡Vuelve pronto!
      </p>
    </div>
  );
}
