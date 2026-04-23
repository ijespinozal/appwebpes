const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

const SALT_ROUNDS        = 10;
const DEFAULT_RESET_PASS = '123456';

// ── POST /api/auth/register ─────────────────────────────────
async function register(req, res) {
  const { phone, name, password, team_name, birth_date } = req.body;
  const profile_photo = req.file ? `/uploads/${req.file.filename}` : null;

  if (!phone || !name || !password) {
    return res.status(400).json({ message: 'Celular, nombre y contraseña son obligatorios' });
  }

  // Validar formato teléfono (solo dígitos, 7-15 caracteres)
  if (!/^\d{7,15}$/.test(phone)) {
    return res.status(400).json({ message: 'Número de celular inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'El número de celular ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO users (phone, name, password_hash, team_name, birth_date, profile_photo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [phone, name, password_hash, team_name || null, birth_date || null, profile_photo]
    );

    return res.status(201).json({
      message: 'Registro exitoso',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── POST /api/auth/login ────────────────────────────────────
async function login(req, res) {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: 'Celular y contraseña son requeridos' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, password_hash, role, team_name, profile_photo, birth_date FROM users WHERE phone = ? AND is_active = TRUE',
      [phone]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      user: {
        id:            user.id,
        name:          user.name,
        role:          user.role,
        team_name:     user.team_name,
        profile_photo: user.profile_photo,
        birth_date:    user.birth_date,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── PUT /api/auth/update-password  (jugador autenticado) ────
async function updatePassword(req, res) {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Se requieren contraseña actual y nueva' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    const new_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [new_hash, userId]);

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[updatePassword]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ── POST /api/auth/reset-password  (solo Admin) ─────────────
async function resetPassword(req, res) {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id es requerido' });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No permitir resetear la contraseña de otro admin
    if (rows[0].role === 'admin') {
      return res.status(403).json({ message: 'No se puede resetear la contraseña de un administrador' });
    }

    const default_hash = await bcrypt.hash(DEFAULT_RESET_PASS, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [default_hash, user_id]);

    return res.json({ message: `Contraseña reseteada a "${DEFAULT_RESET_PASS}" correctamente` });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = { register, login, updatePassword, resetPassword };
