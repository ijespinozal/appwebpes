require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool   = require('../config/db');

async function main() {
  const phone    = '999000000';
  const name     = 'Administrador';
  const password = 'admin123';

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (phone, name, password_hash, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
    [phone, name, hash]
  );

  console.log('✅  Admin listo:');
  console.log(`    Celular  : ${phone}`);
  console.log(`    Contraseña: ${password}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
