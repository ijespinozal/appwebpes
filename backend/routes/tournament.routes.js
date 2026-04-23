const router = require('express').Router();
const ctrl   = require('../controllers/tournament.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Público (requiere solo token válido)
router.get ('/',                 verifyToken,          ctrl.list);
router.get ('/:id/summary',      verifyToken,          ctrl.getSummary);
router.get ('/:id/standings',    verifyToken,          ctrl.getStandings);

// Solo Admin
router.post('/',                 verifyToken, isAdmin, ctrl.create);
router.post('/:id/generate-fixture', verifyToken, isAdmin, ctrl.generateFixture);
router.post('/:id/generate-playoff', verifyToken, isAdmin, ctrl.generatePlayoff);

module.exports = router;
