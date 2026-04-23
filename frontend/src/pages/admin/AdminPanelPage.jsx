import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, XCircle, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import api from '../../api/axios';

function Avatar({ photo, name }) {
  if (photo) return <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover border border-g-border shrink-0" />;
  return (
    <div className="w-10 h-10 rounded-full bg-g-blue border border-g-border shrink-0
                     flex items-center justify-center font-bold text-white text-sm uppercase">
      {name?.[0]}
    </div>
  );
}

function ToggleBtn({ active, onToggle, loading, labelOn, labelOff }) {
  return (
    <button onClick={onToggle} disabled={loading}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                  border transition-all duration-150 disabled:opacity-50
                  ${active
                    ? 'bg-green-900/40 text-green-400 border-green-700 hover:bg-green-900/60'
                    : 'bg-gray-800/40 text-gray-500 border-gray-700 hover:bg-gray-700/40 hover:text-gray-300'}`}>
      {loading ? <Loader2 size={11} className="animate-spin" />
        : active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {active ? labelOn : labelOff}
    </button>
  );
}

function PlayerRow({ inscription, onUpdate, onRemove, canRemove }) {
  const [payLoad,   setPayLoad]   = useState(false);
  const [donLoad,   setDonLoad]   = useState(false);
  const [rstLoad,   setRstLoad]   = useState(false);
  const [rstDone,   setRstDone]   = useState(false);
  const [delLoad,   setDelLoad]   = useState(false);

  async function toggle(field) {
    const isPayment = field === 'payment_confirmed';
    const setLoad   = isPayment ? setPayLoad : setDonLoad;
    const newVal    = !inscription[field];
    setLoad(true);
    try {
      await api.put(`/inscriptions/${inscription.id}/confirm`, {
        payment_confirmed: isPayment ? newVal : !!inscription.payment_confirmed,
        donation_brought:  !isPayment ? newVal : !!inscription.donation_brought,
      });
      onUpdate(inscription.id, { [field]: newVal });
    } catch { /* mantener estado */ }
    finally { setLoad(false); }
  }

  async function removePlayer() {
    if (!window.confirm(`¿Eliminar a ${inscription.name} del torneo?`)) return;
    setDelLoad(true);
    try {
      await api.delete(`/inscriptions/${inscription.id}`);
      onRemove(inscription.id);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al eliminar jugador');
    } finally {
      setDelLoad(false);
    }
  }

  async function resetPwd() {
    if (!window.confirm(`¿Resetear contraseña de ${inscription.name} a "123456"?`)) return;
    setRstLoad(true);
    try {
      await api.post('/auth/reset-password', { user_id: inscription.user_id });
      setRstDone(true);
      setTimeout(() => setRstDone(false), 3000);
    } catch { alert('Error al resetear contraseña'); }
    finally { setRstLoad(false); }
  }

  return (
    <div className="flex items-center gap-2 py-3 border-b border-g-border/40 last:border-0 flex-wrap">
      <Avatar photo={inscription.profile_photo} name={inscription.name} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-none truncate">{inscription.name}</p>
        <p className="text-g-muted text-xs mt-0.5 truncate">
          {inscription.phone}{inscription.team_name ? ` · ${inscription.team_name}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <ToggleBtn active={!!inscription.payment_confirmed} loading={payLoad}
          onToggle={() => toggle('payment_confirmed')} labelOn="Pagó" labelOff="Pago" />
        <ToggleBtn active={!!inscription.donation_brought} loading={donLoad}
          onToggle={() => toggle('donation_brought')} labelOn="Donó" labelOff="Donación" />
        {canRemove && (
          <button onClick={removePlayer} disabled={delLoad} title="Eliminar del torneo"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                       border transition-all duration-150 disabled:opacity-50
                       bg-red-900/20 text-red-400 border-red-800 hover:bg-red-900/40">
            {delLoad ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Eliminar
          </button>
        )}
        <button onClick={resetPwd} disabled={rstLoad} title="Resetear a 123456"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                      border transition-all duration-150 disabled:opacity-50
                      ${rstDone
                        ? 'bg-green-900/40 text-green-400 border-green-700'
                        : 'bg-gray-800/40 text-gray-400 border-gray-700 hover:border-g-accent hover:text-g-accent'}`}>
          {rstLoad ? <Loader2 size={11} className="animate-spin" />
           : rstDone ? <CheckCircle2 size={11} />
           : <KeyRound size={11} />}
          {rstDone ? 'Listo' : '123456'}
        </button>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const { tournament, loading: tLoad } = useActiveTournament();
  const [inscriptions, setInscriptions] = useState([]);
  const [iLoad,        setILoad]        = useState(false);

  const load = useCallback(() => {
    if (!tournament?.id) return;
    setILoad(true);
    api.get(`/inscriptions/tournament/${tournament.id}`)
      .then(({ data }) => setInscriptions(data))
      .finally(() => setILoad(false));
  }, [tournament?.id]);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(id, patch) {
    setInscriptions(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  function handleRemove(id) {
    setInscriptions(prev => prev.filter(i => i.id !== id));
  }

  const confirmed  = inscriptions.filter(i => i.payment_confirmed).length;
  const totalPozo  = confirmed * Number(tournament?.inscription_fee ?? 0);
  const canRemove  = tournament?.status === 'registration';

  if (tLoad || iLoad) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-g-cyan" />
    </div>
  );

  if (!tournament) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
      <AlertCircle size={40} className="text-g-muted" />
      <p className="text-g-muted text-sm">No hay torneo activo. Crea uno en "Gestión de Torneo".</p>
    </div>
  );

  return (
    <div className="space-y-4 py-2">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-g-accent" />
          <div>
            <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">Panel Admin</h1>
            <p className="text-g-muted text-xs">{tournament.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-g-muted text-xs hidden sm:block truncate max-w-[120px]">
            {tournament.name}
          </span>
          <button onClick={load} className="p-2 text-g-muted hover:text-white transition-colors" title="Recargar">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-3">
          <p className="font-display font-bold text-2xl text-white">{inscriptions.length}</p>
          <p className="text-g-muted text-[10px] uppercase tracking-wider">Inscritos</p>
        </div>
        <div className="card text-center py-3 border-green-800/50">
          <p className="font-display font-bold text-2xl text-green-400">{confirmed}</p>
          <p className="text-g-muted text-[10px] uppercase tracking-wider">Pagados</p>
        </div>
        <div className="card text-center py-3 border-g-accent/30">
          <p className="font-display font-bold text-2xl text-g-accent">S/{totalPozo}</p>
          <p className="text-g-muted text-[10px] uppercase tracking-wider">Pozo</p>
        </div>
      </div>

      {/* Lista */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-g-border bg-g-blue/20">
          <p className="section-title">Jugadores Inscritos</p>
        </div>
        <div className="px-4">
          {inscriptions.length === 0
            ? <p className="text-g-muted text-sm text-center py-8">Sin inscripciones aún</p>
            : inscriptions.map(i => <PlayerRow key={i.id} inscription={i} onUpdate={handleUpdate} onRemove={handleRemove} canRemove={canRemove} />)
          }
        </div>
      </div>

      <p className="text-g-muted text-xs text-center pb-2">
        Toca los badges para confirmar · "123456" resetea la contraseña del jugador
      </p>
    </div>
  );
}
