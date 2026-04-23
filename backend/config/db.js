const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'pes_tournament',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Verifica la conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL conectado correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('❌  Error conectando a MySQL:', err.message);
    process.exit(1);
  });

module.exports = pool;
