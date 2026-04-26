/**
 * seed-league-playoff.js
 * Crea un torneo Liga + Playoff Top 4 con 6 jugadores inscritos y confirmados.
 * El fixture queda listo para generar desde el panel admin.
 *
 * Uso: node scripts/seed-league-playoff.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool   = require('../config/db');

const PLAYER_PASSWORD = 'player123';

const PLAYERS = [
  { phone: '987001001', name: 'Carlos Quispe',  team: 'Barcelona',     birth: '1998-03-15' },
  { phone: '987001002', name: 'Diego Huamán',   team: 'Real Madrid',   birth: '2000-07-22' },
  { phone: '987001003', name: 'Luis Paredes',   team: 'Man. City',     birth: '1997-11-08' },
  { phone: '987001004', name: 'Miguel Torres',  team: 'PSG',           birth: '2001-02-14' },
  { phone: '987001005', name: 'José Flores',    team: 'Juventus',      birth: '1999-09-30' },
  { phone: '987001006', name: 'Roberto Silva',  team: 'Bayern Munich', birth: '2002-05-20' },
];

const TOURNAMENT = {
  name:             'Copa Liga Playoff 2025',
  inscription_fee:  50.00,
  prize_first_pct:  70,
  prize_second_pct: 30,
  format:           'league_playoff',
};

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hash = await bcrypt.hash(PLAYER_PASSWORD, 10);

    // ── 1. Obtener admin ─────────────────────────────────────────
    const [admins] = await conn.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (admins.length === 0) {
      throw new Error('No hay admin. Ejecuta primero: node scripts/create-admin.js');
    }
    const adminId = admins[0].id;

    // ── 2. Crear / actualizar jugadores ──────────────────────────
    console.log('Creando jugadores...\n');
    const playerIds = [];
    for (const p of PLAYERS) {
      const [existing] = await conn.query(
        'SELECT id FROM users WHERE phone = ?', [p.phone]
      );
      let uid;
      if (existing.length > 0) {
        uid = existing[0].id;
        await conn.query(
          'UPDATE users SET name=?, team_name=?, birth_date=?, password_hash=? WHERE id=?',
          [p.name, p.team, p.birth, hash, uid]
        );
      } else {
        const [r] = await conn.query(
          `INSERT INTO users (phone, name, password_hash, role, team_name, birth_date)
           VALUES (?, ?, ?, 'player', ?, ?)`,
          [p.phone, p.name, hash, p.team, p.birth]
        );
        uid = r.insertId;
      }
      playerIds.push(uid);
      console.log(`  ✅  ${p.name.padEnd(16)} | ${p.phone} | ${p.team}`);
    }

    // ── 3. Crear torneo ──────────────────────────────────────────
    const [existingTour] = await conn.query(
      'SELECT id FROM tournaments WHERE name = ? LIMIT 1',
      [TOURNAMENT.name]
    );
    let tournamentId;
    if (existingTour.length > 0) {
      tournamentId = existingTour[0].id;
      console.log(`\n  🏆 Torneo ya existe → ID ${tournamentId}`);
    } else {
      const [r] = await conn.query(
        `INSERT INTO tournaments
           (name, inscription_fee, prize_first_pct, prize_second_pct, format, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'registration', ?)`,
        [
          TOURNAMENT.name,
          TOURNAMENT.inscription_fee,
          TOURNAMENT.prize_first_pct,
          TOURNAMENT.prize_second_pct,
          TOURNAMENT.format,
          adminId,
        ]
      );
      tournamentId = r.insertId;
      console.log(`\n  🏆 Torneo creado → ID ${tournamentId}`);
    }

    // ── 4. Inscribir, confirmar pago y crear standings ───────────
    console.log('\n  📋 Inscripciones:');
    for (const uid of playerIds) {
      const [existing] = await conn.query(
        'SELECT id FROM tournament_inscriptions WHERE tournament_id = ? AND user_id = ?',
        [tournamentId, uid]
      );

      let inscId;
      if (existing.length > 0) {
        inscId = existing[0].id;
      } else {
        const [r] = await conn.query(
          'INSERT INTO tournament_inscriptions (tournament_id, user_id) VALUES (?, ?)',
          [tournamentId, uid]
        );
        inscId = r.insertId;
      }

      await conn.query(
        `UPDATE tournament_inscriptions
         SET payment_confirmed = 1, donation_brought = 1,
             confirmed_by = ?, confirmed_at = NOW()
         WHERE id = ?`,
        [adminId, inscId]
      );

      await conn.query(
        'INSERT IGNORE INTO standings (tournament_id, user_id) VALUES (?, ?)',
        [tournamentId, uid]
      );

      const player = PLAYERS.find(p => playerIds.indexOf(uid) === playerIds.indexOf(uid));
      console.log(`     ✅ ID ${uid} → inscrito y pago confirmado`);
    }

    await conn.commit();

    // ── Resumen ──────────────────────────────────────────────────
    const pozo      = PLAYERS.length * TOURNAMENT.inscription_fee;
    const premio1   = pozo * TOURNAMENT.prize_first_pct  / 100;
    const premio2   = pozo * TOURNAMENT.prize_second_pct / 100;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  Seed completado exitosamente\n');
    console.log('  👑 ADMIN');
    console.log('     Celular    : 999000000');
    console.log('     Contraseña : admin123\n');
    console.log('  👥 JUGADORES (contraseña: player123)');
    PLAYERS.forEach(p =>
      console.log(`     ${p.phone}  ${p.name.padEnd(16)} ${p.team}`)
    );
    console.log(`\n  🏆 Torneo  : ${TOURNAMENT.name}`);
    console.log(`  📋 Formato  : Liga + Playoff Top 4`);
    console.log(`  💰 Cuota    : S/${TOURNAMENT.inscription_fee}`);
    console.log(`  💵 Pozo     : S/${pozo}`);
    console.log(`  🥇 1er lugar: S/${premio1}`);
    console.log(`  🥈 2do lugar: S/${premio2}`);
    console.log('\n  👉 PRÓXIMO PASO: Login como admin → Gestión de Torneo → ⚡ Generar Fixture');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    await conn.rollback();
    console.error('❌ Error:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

main();
