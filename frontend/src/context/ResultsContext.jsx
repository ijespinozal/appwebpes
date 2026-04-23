import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const Ctx = createContext({ hasNew: false, markSeen: () => {} });

const TOUR_KEY = 'pes_selected_tournament_id';
const seenKey  = id => `pes_seen_results_${id}`;
const isLoggedIn = () => !!localStorage.getItem('pes_token');

export function ResultsProvider({ children }) {
  const [hasNew, setHasNew] = useState(false);

  function check() {
    if (!isLoggedIn()) return;
    const tid = Number(localStorage.getItem(TOUR_KEY));
    if (!tid) return;
    api.get(`/matches/tournament/${tid}`)
      .then(({ data }) => {
        const completed = data.filter(m => m.status === 'completed').length;
        const seen      = Number(localStorage.getItem(seenKey(tid)) ?? 0);
        setHasNew(completed > seen);
      })
      .catch(() => {});
  }

  useEffect(() => {
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, []);

  function markSeen() {
    const tid = Number(localStorage.getItem(TOUR_KEY));
    if (!tid) return;
    api.get(`/matches/tournament/${tid}`)
      .then(({ data }) => {
        const completed = data.filter(m => m.status === 'completed').length;
        localStorage.setItem(seenKey(tid), completed);
        setHasNew(false);
      })
      .catch(() => {});
  }

  return <Ctx.Provider value={{ hasNew, markSeen }}>{children}</Ctx.Provider>;
}

export const useResults = () => useContext(Ctx);
