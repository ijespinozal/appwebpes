/**
 * seed-playoff.js
 * Crea un torneo "Copa Playoff 2024" (liga + playoff top 4) con
 * 6 jugadores ya inscritos y TODOS los partidos de liga jugados.
 * Solo queda que el admin genere las semifinales desde el panel.
 *
 * Uso: node scripts/seed-playoff.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');
const { buildRoundRobin } = require('../utils/fixture');

const TOURNAMENT_NAME = 'Copa Playoff 2024';

async function applyStandings(conn, tournamentId, homePId, awayPId, hg, ag) {
  const homeWon = hg > ag, awayWon = ag > hg, draw = hg === ag;
  await conn.query(
    `UPDATE standings SET played=played+1,won=won+?,drawn=drawn+?,lost=lost+?,
     goals_for=goals_for+?,goals_against=goals_against+?
     WHERE tournament_id=? AND user_id=?`,
    [homeWon?1:0, draw?1:0, awayWon?1:0, hg, ag, tournamentId, homePId]
  );
  await conn.query(
    `UPDATE standings SET played=played+1,won=won+?,drawn=drawn+?,lost=lost+?,
     goals_for=goals_for+?,goals_against=goals_against+?
     WHERE tournament_id=? AND user_id=?`,
    [awayWon?1:0, draw?1:0, homeWon?1:0, ag, hg, tournamentId, awayPId]
  );
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Admin ────────────────────────────────────────────
    const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (admins.length === 0) throw new Error('No hay admin. Ejecuta primero: node scripts/create-admin.js');
    const adminId = admins[0].id;

    // ── 2. Obtener jugadores del seed anterior ───────────────
    const [players] = await conn.query(
      `SELECT id, name FROM users WHERE phone IN
       ('987001001','987001002','987001003','987001004','987001005','987001006')
       ORDER BY id ASC`
    );
    if (players.length < 4) {
      throw new Error('Se necesitan al menos los jugadores del seed-test-data.js. Ejecútalo primero.');
    }
    const playerIds = players.map(p => p.id);
    console.log(`\n  👥 Jugadores encontrados: ${players.length}`);
    players.forEach((p, i) => console.log(`     [${i+1}] ${p.name.padEnd(18)} ID: ${p.id}`));

    // ── 3. Crear torneo ──────────────────────────────────────
    const [existing] = await conn.query("SELECT id FROM tournaments WHERE name=? LIMIT 1", [TOURNAMENT_NAME]);
    let tournamentId;
    if (existing.length > 0) {
      tournamentId = existing[0].id;
      // Limpiar datos previos
      await conn.query('DELETE FROM matches WHERE tournament_id=?', [tournamentId]);
      await conn.query('DELETE FROM standings WHERE tournament_id=?', [tournamentId]);
      await conn.query('DELETE FROM tournament_inscriptions WHERE tournament_id=?', [tournamentId]);
      await conn.query("UPDATE tournaments SET status='registration' WHERE id=?", [tournamentId]);
      console.log(`\n  🏆 Torneo ya existía → limpiado y reutilizado (ID ${tournamentId})`);
    } else {
      const [r] = await conn.query(
        `INSERT INTO tournaments (name,inscription_fee,prize_first_pct,prize_second_pct,format,status,created_by)
         VALUES (?,50,70,30,'league_playoff','registration',?)`,
        [TOURNAMENT_NAME, adminId]
      );
      tournamentId = r.insertId;
      console.log(`\n  🏆 Torneo creado → ID ${tournamentId}`);
    }

    // ── 4. Inscribir y confirmar a todos ─────────────────────
    for (const uid of playerIds) {
      const [r] = await conn.query(
        'INSERT INTO tournament_inscriptions (tournament_id,user_id,payment_confirmed,donation_brought,confirmed_by,confirmed_at) VALUES (?,?,1,1,?,NOW())',
        [tournamentId, uid, adminId]
      );
      await conn.query('INSERT IGNORE INTO standings (tournament_id,user_id) VALUES (?,?)', [tournamentId, uid]);
    }

    // ── 5. Generar fixture de liga ───────────────────────────
    const matches = buildRoundRobin(playerIds);

    // Regla de resultados: el jugador con menor índice en playerIds gana
    // Ej: playerIds[0] gana a todos, playerIds[1] pierde solo con [0], etc.
    const strengthOf = (id) => playerIds.length - playerIds.indexOf(id); // mayor índice = menos fuerza

    const matchRows = [];
    for (const m of matches) {
      const hg = strengthOf(m.home_player_id) > strengthOf(m.away_player_id) ? 2 : 0;
      const ag = hg === 2 ? 0 : 2;
      matchRows.push([
        tournamentId, m.home_player_id, m.away_player_id,
        m.round_number, 'league', null, 'completed', hg, ag,
      ]);
    }

    await conn.query(
      `INSERT INTO matches (tournament_id,home_player_id,away_player_id,round_number,phase,group_id,status,home_goals,away_goals)
       VALUES ?`,
      [matchRows]
    );

    // ── 6. Actualizar standings con todos los resultados ─────
    for (const m of matches) {
      const hg = strengthOf(m.home_player_id) > strengthOf(m.away_player_id) ? 2 : 0;
      const ag = hg === 2 ? 0 : 2;
      await applyStandings(conn, tournamentId, m.home_player_id, m.away_player_id, hg, ag);
    }

    // ── 7. Estado in_progress ────────────────────────────────
    await conn.query("UPDATE tournaments SET status='in_progress' WHERE id=?", [tournamentId]);

    await conn.commit();

    // ── Resumen ──────────────────────────────────────────────
    const [standings] = await conn.query(
      `SELECT u.name, s.points, s.won, s.lost, s.goals_for
       FROM standings s JOIN users u ON s.user_id=u.id
       WHERE s.tournament_id=?
       ORDER BY s.points DESC, s.goal_difference DESC`,
      [tournamentId]
    );

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅  Seed de Playoff listo\n');
    console.log('  🏆 Torneo  : ' + TOURNAMENT_NAME);
    console.log('  📋 Formato : Liga + Playoff Top 4');
    console.log('  ⚽ Partidos liga: ' + matchRows.length + ' (todos jugados)\n');
    console.log('  📊 TABLA FINAL DE LIGA:');
    standings.forEach((s, i) => {
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':i===3?'4️⃣ ':i===4?'5️⃣ ':'6️⃣ ';
      const playoff = i < 4 ? ' ← PLAYOFF' : '';
      console.log(`     ${medal} ${s.name.padEnd(18)} ${s.points} pts  ${s.won}V ${s.lost}D${playoff}`);
    });
    console.log('\n  👉 PRÓXIMOS PASOS:');
    console.log('     1. Login como admin → Gestión de Torneo');
    console.log('     2. Selecciona "Copa Playoff 2024"');
    console.log('     3. Clic en ⚡ Generar Semifinales (1° vs 4° y 2° vs 3°)');
    console.log('     4. Ve a Resultados → carga resultados de las 2 semis');
    console.log('     5. Vuelve a Torneo → clic en 🏆 Generar Final');
    console.log('     6. Carga resultado de la Final');
    console.log('     7. El torneo se cierra automáticamente → aparece el banner de Campeón');
    console.log('\n  🔑 Credenciales: admin 999000000 / admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    await conn.rollback();
    console.error('❌ Error:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

main();
