const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/chat', protect, aiController.chat);
router.post('/translate', protect, aiController.translate);

module.exports = router;
