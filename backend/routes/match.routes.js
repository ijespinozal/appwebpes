const router = require('express').Router();
const ctrl   = require('../controllers/match.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Cualquier usuario autenticado puede ver los partidos
router.get('/tournament/:id', verifyToken, ctrl.getByTournament);

// Solo Admin carga resultados
router.put('/:id/result', verifyToken, isAdmin, ctrl.saveResult);

module.exports = router;
