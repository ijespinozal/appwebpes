const router     = require('express').Router();
const ctrl       = require('../controllers/auth.controller');
const { verifyToken, isAdmin }   = require('../middlewares/auth.middleware');
const { upload, handleUploadError } = require('../middlewares/upload.middleware');

// Público
router.post('/register', upload.single('profile_photo'), handleUploadError, ctrl.register);
router.post('/login',    ctrl.login);

// Jugador autenticado
router.put('/update-password', verifyToken, ctrl.updatePassword);

// Solo Admin
router.post('/reset-password', verifyToken, isAdmin, ctrl.resetPassword);

module.exports = router;
