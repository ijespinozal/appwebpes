/**
 * reset-db.js
 * Limpia TODA la base de datos y deja todo listo para probar:
 *   - Admin + 6 jugadores creados
 *   - Torneo "Copa Playoff 2024" (liga + playoff top 4)
 *   - 15 partidos de liga generados (estado: scheduled)
 *   - Torneo en estado in_progress
 *
 * Uso: node scripts/reset-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt           = require('bcrypt');
const pool             = require('../config/db');
const { buildRoundRobin } = require('../utils/fixture');

const ADMIN   = { phone: '999000000', name: 'Administrador', password: 'admin123' };
const PLAYERS = [
  { phone: '987001001', name: 'Carlos Quispe',  team: 'Barcelona'     },
  { phone: '987001002', name: 'Diego Huamán',   team: 'Real Madrid'   },
  { phone: '987001003', name: 'Luis Paredes',   team: 'Man. City'     },
  { phone: '987001004', name: 'Miguel Torres',  team: 'PSG'           },
  { phone: '987001005', name: 'José Flores',    team: 'Juventus'      },
  { phone: '987001006', name: 'Roberto Silva',  team: 'Bayern Munich' },
];

async function main() {
  const conn = await pool.getConnection();
  try {
    // ── 1. Limpiar todas las tablas ──────────────────────────
    console.log('\n🗑️  Limpiando base de datos...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['matches','standings','group_members','tournament_groups',
                     'tournament_inscriptions','tournaments','users']) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('   ✅ Tablas vaciadas\n');

    await conn.beginTransaction();

    const adminHash  = await bcrypt.hash(ADMIN.password, 10);
    const playerHash = await bcrypt.hash('player123',    10);

    // ── 2. Admin ─────────────────────────────────────────────
    const [aRes] = await conn.query(
      `INSERT INTO users (phone,name,password_hash,role) VALUES (?,?,?,'admin')`,
      [ADMIN.phone, ADMIN.name, adminHash]
    );
    const adminId = aRes.insertId;
    console.log(`👑  Admin        → ID ${adminId}  (${ADMIN.phone} / ${ADMIN.password})`);

    // ── 3. Jugadores ─────────────────────────────────────────
    const playerIds = [];
    for (const p of PLAYERS) {
      const [r] = await conn.query(
        `INSERT INTO users (phone,name,password_hash,role,team_name) VALUES (?,?,?,'player',?)`,
        [p.phone, p.name, playerHash, p.team]
      );
      playerIds.push(r.insertId);
      console.log(`👤  ${p.name.padEnd(18)} → ID ${r.insertId}  (${p.phone} / player123)`);
    }

    // ── 4. Torneo ─────────────────────────────────────────────
    const [tRes] = await conn.query(
      `INSERT INTO tournaments
         (name, inscription_fee, prize_first_pct, prize_second_pct, format, status, created_by)
       VALUES ('Copa Playoff 2024', 50, 70, 30, 'league_playoff', 'registration', ?)`,
      [adminId]
    );
    const tid = tRes.insertId;
    console.log(`\n🏆  Torneo creado → ID ${tid}  (Copa Playoff 2024 · Liga + Playoff)`);

    // ── 5. Inscripciones confirmadas + standings ──────────────
    for (const uid of playerIds) {
      await conn.query(
        `INSERT INTO tournament_inscriptions
           (tournament_id,user_id,payment_confirmed,donation_brought,confirmed_by,confirmed_at)
         VALUES (?,?,1,1,?,NOW())`,
        [tid, uid, adminId]
      );
      await conn.query(
        'INSERT INTO standings (tournament_id,user_id) VALUES (?,?)',
        [tid, uid]
      );
    }
    console.log(`✅  ${playerIds.length} jugadores inscritos y confirmados\n`);

    // ── 6. Generar fixture de liga (round-robin) ──────────────
    const leagueMatches = buildRoundRobin(playerIds);
    if (leagueMatches.length === 0) throw new Error('buildRoundRobin devolvió 0 partidos');

    const matchRows = leagueMatches.map(m => [
      tid,
      m.home_player_id,
      m.away_player_id,
      m.round_number,
      'league',   // phase
      null,       // group_id
      'scheduled',
    ]);

    await conn.query(
      `INSERT INTO matches
         (tournament_id, home_player_id, away_player_id, round_number, phase, group_id, status)
       VALUES ?`,
      [matchRows]
    );
    console.log(`⚽  ${matchRows.length} partidos de liga generados`);

    // ── 7. Torneo → in_progress ───────────────────────────────
    await conn.query(
      "UPDATE tournaments SET status='in_progress' WHERE id=?",
      [tid]
    );
    console.log('🟢  Torneo → in_progress');

    await conn.commit();

    // ── Verificar que los partidos quedaron en BD ─────────────
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) AS total FROM matches WHERE tournament_id=?',
      [tid]
    );

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  TODO LISTO  (${total} partidos en BD)

  👑  ADMIN
      Celular   : ${ADMIN.phone}
      Contraseña: ${ADMIN.password}

  👥  JUGADORES  (contraseña para todos: player123)
      987001001  Carlos Quispe
      987001002  Diego Huamán
      987001003  Luis Paredes
      987001004  Miguel Torres
      987001005  José Flores
      987001006  Roberto Silva

  🏆  Copa Playoff 2024  ·  Liga + Playoff Top 4
      ${matchRows.length} partidos de liga listos para cargar resultados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉  QUÉ HACER AHORA:

  1. Borra el caché del navegador:
     F12 → Application → Local Storage → borra todo lo que empiece con "pes_"
     (o usa ventana incógnita)

  2. Login: 999000000 / admin123

  3. Ir a "Resultados" → verás los ${matchRows.length} partidos de liga
     Carga los resultados (cualquier marcador sirve)

  4. Cuando cargues el último partido, ve a "Gestión de Torneo"
     → Aparece el botón "⚡ Generar Semifinales ⚡"

  5. Clic → carga 2 resultados de semis → Generar Final → cargar Final
     → El torneo se cierra y aparece el banner de Campeón
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  } catch (err) {
    await conn.rollback();
    console.error('\n❌ ERROR:', err.message);
    console.error(err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

main();
