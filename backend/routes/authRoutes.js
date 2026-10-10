const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { protect }    = require('../middleware/authMiddleware');

// ── PUBLIC ROUTES ──
router.post('/register',         authController.registerUser);
router.post('/login',            authController.loginUser);
router.post('/send-otp',         authController.sendOTP);
router.post('/verify-otp',       authController.verifyOTP);
router.post('/logout',           authController.logoutUser);
router.post('/google',           authController.googleAuth);
router.post('/forgot-password',  authController.forgotPassword);
router.post('/reset-password',   authController.resetPassword);

// ── PROTECTED ROUTES ──
router.get('/me',                protect, authController.getMe);
router.patch('/profile',         protect, authController.updateProfile);
router.patch('/preferences',     protect, authController.updatePreferences);

// ── 2FA ROUTES ──
router.post('/2fa/enable',       protect, authController.enable2fa);
router.post('/2fa/disable',      protect, authController.disable2fa);

module.exports = router;
