const router = require('express').Router();
const ctrl   = require('../controllers/inscription.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Jugador autenticado se inscribe
router.post('/', verifyToken, ctrl.register);

// Jugador consulta su propio estado de inscripción
router.get('/my-status/:tournamentId', verifyToken, ctrl.getMyStatus);

// Admin confirma pago y donación
router.put('/:id/confirm', verifyToken, isAdmin, ctrl.confirm);

// Jugador cancela su propia inscripción (solo si no confirmada)
router.delete('/my/:tournamentId', verifyToken, ctrl.cancelMine);

// Admin lista inscritos de un torneo
router.get('/tournament/:tournamentId', verifyToken, isAdmin, ctrl.listByTournament);

// Admin elimina a un jugador del torneo
router.delete('/:id', verifyToken, isAdmin, ctrl.removePlayer);

module.exports = router;
