const pool = require('../config/db');

// ── GET /api/matches/tournament/:id ─────────────────────────
// Todos los partidos de un torneo con info completa de jugadores
async function getByTournament(req, res) {
  const { id } = req.params;

  try {
    const [matches] = await pool.query(
      `SELECT
         m.id,
         m.tournament_id,
         m.round_number,
         m.phase,
         m.status,
         m.home_goals,
         m.away_goals,
         m.scheduled_at,
         m.played_at,
         -- Jugador local
         m.home_player_id,
         h.name          AS home_name,
         h.team_name     AS home_team,
         h.profile_photo AS home_photo,
         h.birth_date    AS home_birth_date,
         -- Jugador visitante
         m.away_player_id,
         a.name          AS away_name,
         a.team_name     AS away_team,
         a.profile_photo AS away_photo,
         a.birth_date    AS away_birth_date,
         -- Grupo (nullable)
         m.group_id,
         tg.name         AS group_name
       FROM   matches m
       JOIN   users h  ON m.home_player_id = h.id
       JOIN   users a  ON m.away_player_id = a.id
       LEFT JOIN tournament_groups tg ON m.group_id = tg.id
       WHERE  m.tournament_id = ?
       ORDER  BY m.phase, m.round_number, m.id`,
      [id]
    );

    return res.json(matches);
  } catch (err) {
    console.error('[match.getByTournament]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── PUT /api/matches/:id/result ──────────────────────────────
// Admin carga/actualiza el resultado. Recalcula standings automáticamente.
async function saveResult(req, res) {
  const matchId = Number(req.params.id);
  const { home_goals, away_goals } = req.body;

  if (home_goals === undefined || home_goals === null ||
      away_goals === undefined || away_goals === null) {
    return res.status(400).json({ message: 'home_goals y away_goals son requeridos' });
  }

  const hg = parseInt(home_goals, 10);
  const ag = parseInt(away_goals, 10);

  if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
    return res.status(400).json({ message: 'Los goles deben ser números enteros no negativos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener partido con bloqueo
    const [rows] = await conn.query(
      'SELECT * FROM matches WHERE id = ? FOR UPDATE',
      [matchId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Partido no encontrado' });
    }

    const match = rows[0];

    const isPlayoff = match.phase === 'playoff';

    // Revertir standings anterior (solo partidos de liga)
    if (!isPlayoff && match.status === 'completed' &&
        match.home_goals !== null && match.away_goals !== null) {
      await applyStandings(conn, match, match.home_goals, match.away_goals, -1);
    }

    // Guardar nuevo resultado
    await conn.query(
      `UPDATE matches
       SET home_goals = ?, away_goals = ?, status = 'completed', played_at = NOW()
       WHERE id = ?`,
      [hg, ag, matchId]
    );

    // Aplicar standings (solo liga)
    if (!isPlayoff) {
      await applyStandings(conn, match, hg, ag, +1);
    }

    // Auto-finalizar torneo cuando no quedan partidos pendientes
    const [remaining] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM matches WHERE tournament_id = ? AND status = 'scheduled'",
      [match.tournament_id]
    );
    if (remaining[0].cnt === 0) {
      const [[tour]] = await conn.query(
        'SELECT format FROM tournaments WHERE id = ?',
        [match.tournament_id]
      );
      let shouldFinish = true;
      if (tour.format === 'league_playoff') {
        // Solo finalizar cuando se hayan jugado las 3 fases del playoff (SF1, SF2, Final)
        const [[ps]] = await conn.query(
          `SELECT COUNT(*) AS total,
                  SUM(status = 'completed') AS done
           FROM matches WHERE tournament_id = ? AND phase = 'playoff'`,
          [match.tournament_id]
        );
        shouldFinish = Number(ps.total) >= 3 && Number(ps.total) === Number(ps.done);
      }
      if (shouldFinish) {
        await conn.query(
          "UPDATE tournaments SET status = 'finished' WHERE id = ?",
          [match.tournament_id]
        );
      }
    }

    await conn.commit();

    return res.json({
      message:    'Resultado guardado y tabla de posiciones actualizada',
      match_id:   matchId,
      home_goals: hg,
      away_goals: ag,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[match.saveResult]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
}

/**
 * Aplica o revierte estadísticas en la tabla standings.
 * direction = +1  → aplicar resultado
 * direction = -1  → revertir resultado anterior
 *
 * Los campos goal_difference y points son GENERATED COLUMNS en MySQL,
 * por lo que se recalculan automáticamente al guardar los valores base.
 */
async function applyStandings(conn, match, homeGoals, awayGoals, direction) {
  const { tournament_id, home_player_id, away_player_id } = match;

  const homeWon = homeGoals > awayGoals;
  const awayWon = awayGoals > homeGoals;
  const draw    = homeGoals === awayGoals;

  // Jugador local
  await conn.query(
    `UPDATE standings
     SET
       played        = played        + ?,
       won           = won           + ?,
       drawn         = drawn         + ?,
       lost          = lost          + ?,
       goals_for     = goals_for     + ?,
       goals_against = goals_against + ?
     WHERE tournament_id = ? AND user_id = ?`,
    [
      direction,
      direction * (homeWon ? 1 : 0),
      direction * (draw    ? 1 : 0),
      direction * (awayWon ? 1 : 0),
      direction * homeGoals,
      direction * awayGoals,
      tournament_id,
      home_player_id,
    ]
  );

  // Jugador visitante
  await conn.query(
    `UPDATE standings
     SET
       played        = played        + ?,
       won           = won           + ?,
       drawn         = drawn         + ?,
       lost          = lost          + ?,
       goals_for     = goals_for     + ?,
       goals_against = goals_against + ?
     WHERE tournament_id = ? AND user_id = ?`,
    [
      direction,
      direction * (awayWon ? 1 : 0),
      direction * (draw    ? 1 : 0),
      direction * (homeWon ? 1 : 0),
      direction * awayGoals,
      direction * homeGoals,
      tournament_id,
      away_player_id,
    ]
  );
}

module.exports = { getByTournament, saveResult };
