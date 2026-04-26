require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool   = require('../config/db');

const PLAYER_PASSWORD = 'player123';

const PLAYERS = [
  { phone: '987001001', name: 'Carlos Quispe',   team: 'Barcelona',     birth: '1998-03-15' },
  { phone: '987001002', name: 'Diego Huamán',    team: 'Real Madrid',   birth: '2000-07-22' },
  { phone: '987001003', name: 'Luis Paredes',    team: 'Man. City',     birth: '1997-11-08' },
  { phone: '987001004', name: 'Miguel Torres',   team: 'PSG',           birth: '2001-02-14' },
  { phone: '987001005', name: 'José Flores',     team: 'Juventus',      birth: '1999-09-30' },
  { phone: '987001006', name: 'Roberto Silva',   team: 'Bayern Munich', birth: '2002-05-20' },
  { phone: '987001007', name: 'Andrés Cáceres',  team: 'Liverpool',     birth: '1996-12-03' },
  { phone: '987001008', name: 'Fernando Ramos',  team: 'Atlético',      birth: '2003-08-17' },
];

async function main() {
  const hash = await bcrypt.hash(PLAYER_PASSWORD, 10);

  console.log('Creando jugadores...\n');

  for (const p of PLAYERS) {
    await pool.query(
      `INSERT INTO users (phone, name, password_hash, role, team_name, birth_date)
       VALUES (?, ?, ?, 'player', ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         team_name = VALUES(team_name),
         birth_date = VALUES(birth_date),
         password_hash = VALUES(password_hash)`,
      [p.phone, p.name, hash, p.team, p.birth]
    );
    console.log(`  ✅  ${p.name.padEnd(18)} | ${p.phone} | ${p.team}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅  ${PLAYERS.length} jugadores listos`);
  console.log(`    Contraseña para todos: ${PLAYER_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
