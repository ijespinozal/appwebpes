import { useState, useEffect } from 'react';
import { BarChart2, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { useActiveTournament } from '../../hooks/useActiveTournament';
import api from '../../api/axios';

// Medalla según posición dentro del grupo/tabla
function Medal({ pos }) {
  if (pos === 1) return <Trophy size={14} className="text-g-gold" />;
  if (pos === 2) return <Trophy size={14} className="text-g-silver" />;
  return <span className="text-g-muted text-xs font-bold w-3.5 text-center">{pos}</span>;
}

function StandingsTable({ rows, title }) {
  const cols = [
    { key: 'played',          label: 'PJ', title: 'Partidos jugados' },
    { key: 'won',             label: 'PG', title: 'Partidos ganados'  },
    { key: 'drawn',           label: 'PE', title: 'Empates'           },
    { key: 'lost',            label: 'PP', title: 'Perdidos'          },
    { key: 'goals_for',       label: 'GF', title: 'Goles a favor'     },
    { key: 'goals_against',   label: 'GC', title: 'Goles en contra'   },
    { key: 'goal_difference', label: 'DG', title: 'Diferencia de goles'},
    { key: 'points',          label: 'PTS',title: 'Puntos'            },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-g-border bg-g-blue/30">
          <span className="section-title">Grupo {title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-g-border">
              <th className="text-left px-3 py-2.5 text-g-muted font-medium text-xs w-8">#</th>
              <th className="text-left px-3 py-2.5 text-g-muted font-medium text-xs">Jugador</th>
              {cols.map(c => (
                <th key={c.key} title={c.title}
                  className="text-center px-2 py-2.5 text-g-muted font-medium text-xs min-w-[28px]">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pos    = i + 1;
              const isGold   = pos === 1;
              const isSilver = pos === 2;
              return (
                <tr key={row.user_id}
                  className={`border-b border-g-border/50 transition-colors
                    ${isGold   ? 'bg-g-gold/5   hover:bg-g-gold/10'   : ''}
                    ${isSilver ? 'bg-g-silver/5 hover:bg-g-silver/10' : ''}
                    ${!isGold && !isSilver ? 'hover:bg-g-border/20' : ''}`}>

                  {/* Posición */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center w-5">
                      <Medal pos={pos} />
                    </div>
                  </td>

                  {/* Jugador */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.profile_photo
                        ? <img src={row.profile_photo} alt={row.name}
                            className="w-7 h-7 rounded-full object-cover border border-g-border shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-g-blue border border-g-border
                                           flex items-center justify-center text-xs font-bold
                                           text-white uppercase shrink-0">
                            {row.name?.[0]}
                          </div>
                      }
                      <div className="min-w-0">
                        <p className={`font-semibold leading-none truncate text-sm
                          ${isGold ? 'text-g-gold' : isSilver ? 'text-g-silver' : 'text-white'}`}>
                          {row.name}
                        </p>
                        {row.team_name && (
                          <p className="text-g-muted text-[10px] truncate leading-none mt-0.5">
                            {row.team_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Stats */}
                  {cols.map(c => (
                    <td key={c.key}
                      className={`text-center px-2 py-2.5 tabular-nums text-xs font-medium
                        ${c.key === 'points'
                          ? isGold ? 'text-g-gold font-bold'
                            : isSilver ? 'text-g-silver font-bold'
                            : 'text-white font-bold'
                          : c.key === 'goal_difference' && Number(row[c.key]) > 0 ? 'text-green-400'
                          : c.key === 'goal_difference' && Number(row[c.key]) < 0 ? 'text-red-400'
                          : 'text-gray-300'
                        }`}>
                      {c.key === 'goal_difference' && Number(row[c.key]) > 0
                        ? `+${row[c.key]}` : row[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StandingsPage() {
  const { tournament, loading: tLoad } = useActiveTournament();
  const [standings, setStandings]      = useState([]);
  const [sLoad,     setSLoad]          = useState(false);

  useEffect(() => {
    if (!tournament?.id) return;
    setSLoad(true);
    api.get(`/tournaments/${tournament.id}/standings`)
      .then(({ data }) => setStandings(data))
      .finally(() => setSLoad(false));
  }, [tournament?.id]);

  if (tLoad || sLoad) return (
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

  // Agrupar por grupo si es formato grupos_knockout
  const grouped = standings.reduce((acc, row) => {
    const key = row.group_name ?? 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const groupKeys    = Object.keys(grouped);
  const isMultiGroup = groupKeys.length > 1 || groupKeys[0] !== 'General';

  return (
    <div className="space-y-4 py-2">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 size={22} className="text-g-cyan" />
        <div>
          <h1 className="font-display font-bold text-xl text-white uppercase tracking-wide">
            Tabla de Posiciones
          </h1>
          <p className="text-g-muted text-xs">{tournament.name}</p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-g-muted">
        <span className="flex items-center gap-1"><Trophy size={11} className="text-g-gold" /> 1er lugar</span>
        <span className="flex items-center gap-1"><Trophy size={11} className="text-g-silver" /> 2do lugar</span>
      </div>

      {/* Tablas */}
      {standings.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 size={36} className="text-g-border mx-auto mb-3" />
          <p className="text-g-muted text-sm">Las posiciones aparecerán cuando se carguen resultados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupKeys.sort().map(key => (
            <StandingsTable
              key={key}
              rows={grouped[key]}
              title={isMultiGroup ? key : null}
            />
          ))}
        </div>
      )}

    </div>
  );
}
