require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();

// ── Middlewares globales ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas de forma estática
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS básico (ajustar origin cuando el frontend esté listo)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/tournaments',  require('./routes/tournament.routes'));
app.use('/api/inscriptions', require('./routes/inscription.routes'));
app.use('/api/matches',      require('./routes/match.routes'));

// Health-check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 genérico
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ message: err.message || 'Error interno del servidor' });
});

// ── Arranque ────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀  Servidor corriendo en http://localhost:${PORT}`);
});
