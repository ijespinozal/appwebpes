const pool = require('../config/db');
const { buildRoundRobin, buildGroupStage } = require('../utils/fixture');

// ── POST /api/tournaments ────────────────────────────────────
async function create(req, res) {
  const {
    name,
    inscription_fee    = 0,
    prize_first_pct    = 70,
    prize_second_pct   = 30,
    format             = 'league',
    num_groups,
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'El nombre del torneo es obligatorio' });
  }

  const validFormats = ['league', 'groups_knockout', 'league_playoff'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ message: 'Formato inválido. Use: league, groups_knockout o league_playoff' });
  }

  if (format === 'groups_knockout' && (!num_groups || num_groups < 2)) {
    return res.status(400).json({ message: 'Se requieren al menos 2 grupos para el formato grupos + eliminatorias' });
  }

  const firstPct  = Number(prize_first_pct);
  const secondPct = Number(prize_second_pct);
  if (firstPct + secondPct !== 100) {
    return res.status(400).json({ message: 'Los porcentajes de premios deben sumar 100' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO tournaments
         (name, inscription_fee, prize_first_pct, prize_second_pct, format, num_groups, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'registration', ?)`,
      [
        name,
        Number(inscription_fee),
        firstPct,
        secondPct,
        format,
        format === 'groups_knockout' ? Number(num_groups) : null,
        req.user.id,
      ]
    );

    return res.status(201).json({ message: 'Torneo creado', tournamentId: result.insertId });
  } catch (err) {
    console.error('[tournament.create]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── GET /api/tournaments ─────────────────────────────────────
async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*,
         COUNT(ti.id)                      AS total_registered,
         SUM(ti.payment_confirmed = TRUE)   AS total_confirmed
       FROM tournaments t
       LEFT JOIN tournament_inscriptions ti ON ti.tournament_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[tournament.list]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── GET /api/tournaments/:id/summary ────────────────────────
async function getSummary(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT t.*,
         COUNT(ti.id)                      AS total_registered,
         SUM(ti.payment_confirmed = TRUE)   AS total_confirmed
       FROM tournaments t
       LEFT JOIN tournament_inscriptions ti ON ti.tournament_id = t.id
       WHERE t.id = ?
       GROUP BY t.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

    const t         = rows[0];
    const confirmed = Number(t.total_confirmed) || 0;
    const pool_     = confirmed * Number(t.inscription_fee);

    // Lista de jugadores inscritos
    const [players] = await pool.query(
      `SELECT u.id, u.name, u.team_name, u.profile_photo, u.birth_date,
              ti.payment_confirmed, ti.donation_brought, ti.created_at AS registered_at
       FROM tournament_inscriptions ti
       JOIN users u ON ti.user_id = u.id
       WHERE ti.tournament_id = ?
       ORDER BY u.name`,
      [id]
    );

    return res.json({
      tournament: {
        id:               t.id,
        name:             t.name,
        format:           t.format,
        status:           t.status,
        inscription_fee:  Number(t.inscription_fee),
        prize_first_pct:  Number(t.prize_first_pct),
        prize_second_pct: Number(t.prize_second_pct),
        num_groups:       t.num_groups,
        created_at:       t.created_at,
      },
      financials: {
        total_registered: Number(t.total_registered),
        total_confirmed:  confirmed,
        prize_pool:       Number(pool_.toFixed(2)),
        prize_first:      Number((pool_ * t.prize_first_pct  / 100).toFixed(2)),
        prize_second:     Number((pool_ * t.prize_second_pct / 100).toFixed(2)),
      },
      players,
    });
  } catch (err) {
    console.error('[tournament.getSummary]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── GET /api/tournaments/:id/standings ───────────────────────
async function getStandings(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         s.user_id, u.name, u.team_name, u.profile_photo,
         s.group_id, tg.name AS group_name,
         s.played, s.won, s.drawn, s.lost,
         s.goals_for, s.goals_against, s.goal_difference, s.points
       FROM standings s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN tournament_groups tg ON s.group_id = tg.id
       WHERE s.tournament_id = ?
       ORDER BY s.group_id, s.points DESC, s.goal_difference DESC, s.goals_for DESC, u.name`,
      [id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[tournament.getStandings]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── POST /api/tournaments/:id/generate-fixture ───────────────
async function generateFixture(req, res) {
  const tournamentId = Number(req.params.id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obtener torneo
    const [tours] = await conn.query(
      'SELECT * FROM tournaments WHERE id = ? FOR UPDATE',
      [tournamentId]
    );

    if (tours.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

    const tournament = tours[0];

    if (tournament.status !== 'registration') {
      await conn.rollback();
      return res.status(400).json({
        message: `El torneo está en estado "${tournament.status}". Solo se puede generar el fixture en estado "registration".`,
      });
    }

    // 2. Jugadores con pago confirmado
    const [inscriptions] = await conn.query(
      'SELECT user_id FROM tournament_inscriptions WHERE tournament_id = ? AND payment_confirmed = TRUE',
      [tournamentId]
    );

    const playerIds = inscriptions.map(r => r.user_id);

    if (playerIds.length < 2) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Se necesitan al menos 2 jugadores con pago confirmado para generar el fixture.',
      });
    }

    let matchRows = []; // filas para INSERT masivo

    // ── LIGA / LIGA+PLAYOFF (todos contra todos) ──────────
    if (tournament.format === 'league' || tournament.format === 'league_playoff') {
      const matches = buildRoundRobin(playerIds);
      matchRows = matches.map(m => [
        tournamentId, m.home_player_id, m.away_player_id,
        m.round_number, 'league', null, 'scheduled',
      ]);

    // ── GRUPOS + ELIMINATORIAS ─────────────────────────────
    } else if (tournament.format === 'groups_knockout') {
      const numGroups = tournament.num_groups || 2;

      if (playerIds.length < numGroups * 2) {
        await conn.rollback();
        return res.status(400).json({
          message: `Se necesitan al menos ${numGroups * 2} jugadores para ${numGroups} grupos.`,
        });
      }

      const { groups, matches } = buildGroupStage(playerIds, numGroups);
      const groupIdMap = []; // index → DB id

      for (const group of groups) {
        // Crear grupo en BD
        const [grResult] = await conn.query(
          'INSERT INTO tournament_groups (tournament_id, name) VALUES (?, ?)',
          [tournamentId, group.name]
        );
        const dbGroupId = grResult.insertId;
        groupIdMap.push(dbGroupId);

        // Asignar miembros y actualizar standings con group_id
        for (const uid of group.players) {
          await conn.query(
            'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
            [dbGroupId, uid]
          );
          await conn.query(
            'UPDATE standings SET group_id = ? WHERE tournament_id = ? AND user_id = ?',
            [dbGroupId, tournamentId, uid]
          );
        }
      }

      matchRows = matches.map(m => [
        tournamentId, m.home_player_id, m.away_player_id,
        m.round_number, 'group_stage', groupIdMap[m.groupIndex], 'scheduled',
      ]);
    }

    // 3. Insertar partidos
    if (matchRows.length > 0) {
      await conn.query(
        `INSERT INTO matches
           (tournament_id, home_player_id, away_player_id, round_number, phase, group_id, status)
         VALUES ?`,
        [matchRows]
      );
    }

    // 4. Actualizar estado del torneo
    await conn.query(
      "UPDATE tournaments SET status = 'in_progress' WHERE id = ?",
      [tournamentId]
    );

    await conn.commit();

    return res.json({
      message:       'Fixture generado exitosamente',
      total_matches: matchRows.length,
      format:        tournament.format,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[tournament.generateFixture]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
}

// ── POST /api/tournaments/:id/generate-playoff ───────────
// Dos fases: 1ra llamada → genera semifinales | 2da llamada → genera final
async function generatePlayoff(req, res) {
  const tournamentId = Number(req.params.id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [tours] = await conn.query(
      'SELECT * FROM tournaments WHERE id = ? FOR UPDATE',
      [tournamentId]
    );
    if (tours.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

    const tournament = tours[0];

    if (tournament.format !== 'league_playoff') {
      await conn.rollback();
      return res.status(400).json({ message: 'Este torneo no usa formato liga + playoff' });
    }
    if (tournament.status !== 'in_progress') {
      await conn.rollback();
      return res.status(400).json({ message: 'El torneo debe estar en curso (in_progress)' });
    }

    // Obtener round máximo de la liga
    const [leagueInfo] = await conn.query(
      "SELECT MAX(round_number) AS max_round FROM matches WHERE tournament_id = ? AND phase = 'league'",
      [tournamentId]
    );
    const maxLeagueRound = leagueInfo[0].max_round || 0;

    // Partidos de playoff existentes
    const [playoffRows] = await conn.query(
      "SELECT * FROM matches WHERE tournament_id = ? AND phase = 'playoff' ORDER BY round_number, id",
      [tournamentId]
    );

    // ── FASE 1: Generar semifinales ──────────────────────
    if (playoffRows.length === 0) {
      const [pending] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM matches WHERE tournament_id = ? AND phase = 'league' AND status = 'scheduled'",
        [tournamentId]
      );
      if (pending[0].cnt > 0) {
        await conn.rollback();
        return res.status(400).json({
          message: `Faltan ${pending[0].cnt} partido(s) de liga sin resultado. Cárgalos primero.`,
        });
      }

      const [top4] = await conn.query(
        `SELECT user_id FROM standings WHERE tournament_id = ?
         ORDER BY points DESC, goal_difference DESC, goals_for DESC, user_id ASC
         LIMIT 4`,
        [tournamentId]
      );
      if (top4.length < 4) {
        await conn.rollback();
        return res.status(400).json({ message: 'Se necesitan al menos 4 jugadores para el playoff' });
      }

      const semiRound = maxLeagueRound + 1;
      await conn.query(
        `INSERT INTO matches (tournament_id, home_player_id, away_player_id, round_number, phase, status)
         VALUES (?,?,?,?,'playoff','scheduled'), (?,?,?,?,'playoff','scheduled')`,
        [
          tournamentId, top4[0].user_id, top4[3].user_id, semiRound,
          tournamentId, top4[1].user_id, top4[2].user_id, semiRound,
        ]
      );

      await conn.commit();
      return res.json({ message: '¡Semifinales generadas! 1° vs 4° y 2° vs 3°', phase: 'semis' });
    }

    // ── FASE 2: Generar final ─────────────────────────────
    const semiRound  = maxLeagueRound + 1;
    const finalRound = maxLeagueRound + 2;

    const semis      = playoffRows.filter(m => m.round_number === semiRound);
    const existFinal = playoffRows.find(m => m.round_number === finalRound);

    if (existFinal) {
      await conn.rollback();
      return res.status(400).json({ message: 'La final ya fue generada. Carga el resultado en Resultados.' });
    }

    const incomplete = semis.filter(m => m.status !== 'completed');
    if (semis.length < 2 || incomplete.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Completa ambas semifinales antes de generar la final.' });
    }

    // Ganador de cada semi (empate → local avanza)
    const getWinner = m => m.home_goals > m.away_goals ? m.home_player_id : m.away_player_id;

    await conn.query(
      `INSERT INTO matches (tournament_id, home_player_id, away_player_id, round_number, phase, status)
       VALUES (?,?,?,?,'playoff','scheduled')`,
      [tournamentId, getWinner(semis[0]), getWinner(semis[1]), finalRound]
    );

    await conn.commit();
    return res.json({ message: '¡Final generada! Carga el resultado en Resultados.', phase: 'final' });

  } catch (err) {
    await conn.rollback();
    console.error('[tournament.generatePlayoff]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
}

module.exports = { create, list, getSummary, getStandings, generateFixture, generatePlayoff };
