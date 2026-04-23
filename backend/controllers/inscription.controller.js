const pool = require('../config/db');

// ── POST /api/inscriptions ───────────────────────────────────
// Jugador se inscribe a un torneo
async function register(req, res) {
  const { tournament_id } = req.body;
  const userId = req.user.id;

  if (!tournament_id) {
    return res.status(400).json({ message: 'tournament_id es requerido' });
  }

  try {
    // Verificar que el torneo existe y está en estado de inscripción
    const [tours] = await pool.query(
      "SELECT id, status FROM tournaments WHERE id = ?",
      [tournament_id]
    );

    if (tours.length === 0) {
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

    if (tours[0].status !== 'registration') {
      return res.status(400).json({
        message: 'El torneo no está abierto para inscripciones en este momento',
      });
    }

    // Verificar inscripción duplicada
    const [existing] = await pool.query(
      'SELECT id FROM tournament_inscriptions WHERE tournament_id = ? AND user_id = ?',
      [tournament_id, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Ya estás inscrito en este torneo' });
    }

    const [result] = await pool.query(
      'INSERT INTO tournament_inscriptions (tournament_id, user_id) VALUES (?, ?)',
      [tournament_id, userId]
    );

    return res.status(201).json({
      message:       'Inscripción registrada. Espera la confirmación del administrador.',
      inscriptionId: result.insertId,
    });
  } catch (err) {
    console.error('[inscription.register]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── PUT /api/inscriptions/:id/confirm ────────────────────────
// Admin confirma pago y/o donación. Si confirma pago → crea fila en standings.
async function confirm(req, res) {
  const inscriptionId  = Number(req.params.id);
  const {
    payment_confirmed = true,
    donation_brought  = false,
  } = req.body;
  const adminId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener inscripción con info del torneo
    const [rows] = await conn.query(
      `SELECT ti.*, t.format
       FROM tournament_inscriptions ti
       JOIN tournaments t ON ti.tournament_id = t.id
       WHERE ti.id = ?
       FOR UPDATE`,
      [inscriptionId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    const inscription        = rows[0];
    const wasAlreadyConfirmed = inscription.payment_confirmed === 1;

    // Actualizar inscripción
    await conn.query(
      `UPDATE tournament_inscriptions
       SET payment_confirmed = ?,
           donation_brought  = ?,
           confirmed_by      = ?,
           confirmed_at      = NOW()
       WHERE id = ?`,
      [payment_confirmed ? 1 : 0, donation_brought ? 1 : 0, adminId, inscriptionId]
    );

    // Si el pago acaba de confirmarse (no estaba confirmado antes),
    // crear la fila de standings para este jugador.
    if (payment_confirmed && !wasAlreadyConfirmed) {
      await conn.query(
        `INSERT IGNORE INTO standings (tournament_id, user_id)
         VALUES (?, ?)`,
        [inscription.tournament_id, inscription.user_id]
      );
    }

    await conn.commit();

    return res.json({
      message: 'Inscripción actualizada correctamente',
      payment_confirmed,
      donation_brought,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[inscription.confirm]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
}

// ── GET /api/inscriptions/tournament/:tournamentId ───────────
// Lista inscripciones de un torneo (para panel de admin)
async function listByTournament(req, res) {
  const { tournamentId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         ti.id, ti.payment_confirmed, ti.donation_brought,
         ti.confirmed_at, ti.created_at AS registered_at,
         u.id AS user_id, u.name, u.phone, u.team_name, u.profile_photo, u.birth_date
       FROM tournament_inscriptions ti
       JOIN users u ON ti.user_id = u.id
       WHERE ti.tournament_id = ?
       ORDER BY ti.created_at`,
      [tournamentId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('[inscription.listByTournament]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── GET /api/inscriptions/my-status/:tournamentId ───────────
// Jugador consulta su propia inscripción (sin exponer las de otros)
async function getMyStatus(req, res) {
  const userId       = req.user.id;
  const tournamentId = req.params.tournamentId;

  try {
    const [rows] = await pool.query(
      `SELECT payment_confirmed, donation_brought
       FROM tournament_inscriptions
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (rows.length === 0) {
      return res.json({ inscribed: false });
    }

    return res.json({
      inscribed:         true,
      payment_confirmed: !!rows[0].payment_confirmed,
      donation_brought:  !!rows[0].donation_brought,
    });
  } catch (err) {
    console.error('[inscription.getMyStatus]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── DELETE /api/inscriptions/my/:tournamentId ────────────────
// Jugador cancela su propia inscripción (solo si NO fue confirmada aún)
async function cancelMine(req, res) {
  const userId       = req.user.id;
  const tournamentId = req.params.tournamentId;

  try {
    const [rows] = await pool.query(
      `SELECT id, payment_confirmed FROM tournament_inscriptions
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No tienes inscripción en este torneo' });
    }

    if (rows[0].payment_confirmed) {
      return res.status(403).json({
        message: 'Tu pago ya fue confirmado. Habla con el administrador para cancelar.',
      });
    }

    await pool.query('DELETE FROM tournament_inscriptions WHERE id = ?', [rows[0].id]);
    return res.json({ message: 'Inscripción cancelada correctamente' });
  } catch (err) {
    console.error('[inscription.cancelMine]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── DELETE /api/inscriptions/:inscriptionId  (Admin) ─────────
// Admin elimina a un jugador (solo si el fixture aún no fue generado)
async function removePlayer(req, res) {
  const inscriptionId = Number(req.params.id);

  try {
    const [rows] = await pool.query(
      `SELECT ti.id, ti.user_id, t.status AS tournament_status
       FROM tournament_inscriptions ti
       JOIN tournaments t ON ti.tournament_id = t.id
       WHERE ti.id = ?`,
      [inscriptionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    if (rows[0].tournament_status === 'in_progress' || rows[0].tournament_status === 'finished') {
      return res.status(400).json({
        message: 'No se puede eliminar a un jugador después de que el fixture fue generado.',
      });
    }

    // Eliminar standings si existía (pago había sido confirmado)
    await pool.query(
      `DELETE s FROM standings s
       JOIN tournament_inscriptions ti ON ti.tournament_id = s.tournament_id AND ti.user_id = s.user_id
       WHERE ti.id = ?`,
      [inscriptionId]
    );

    await pool.query('DELETE FROM tournament_inscriptions WHERE id = ?', [inscriptionId]);

    return res.json({ message: 'Jugador eliminado del torneo' });
  } catch (err) {
    console.error('[inscription.removePlayer]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = { register, confirm, listByTournament, getMyStatus, cancelMine, removePlayer };
