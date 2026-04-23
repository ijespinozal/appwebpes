import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const STORAGE_KEY = 'pes_selected_tournament_id';

/**
 * Hook central de torneo.
 * - Lee todos los torneos del backend.
 * - Respeta la selección guardada en localStorage.
 * - Expone `all` (lista completa) y `selectTournament(t)` para cambiar.
 * - Fallback automático: in_progress → registration → primero de la lista.
 */
export function useActiveTournament() {
  const [tournament, setTournament] = useState(null);
  const [all,        setAll]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/tournaments')
      .then(({ data }) => {
        setAll(data);

        const savedId = Number(localStorage.getItem(STORAGE_KEY));
        const saved   = savedId ? data.find(t => t.id === savedId) : null;

        const active  =
          saved                                         ??
          data.find(t => t.status === 'in_progress')   ??
          data.find(t => t.status === 'registration')   ??
          data[0]                                        ??
          null;

        setTournament(active);
        if (active) localStorage.setItem(STORAGE_KEY, active.id);
      })
      .catch(() => setError('No se pudo cargar el torneo'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectTournament(t) {
    localStorage.setItem(STORAGE_KEY, t.id);
    setTournament(t);
  }

  return { tournament, all, loading, error, selectTournament, reload: load };
}
