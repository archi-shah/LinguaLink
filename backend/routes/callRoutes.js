const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', callController.getCallHistory);
router.post('/', callController.createCallLog);
router.delete('/:id', callController.deleteCallLog);
router.delete('/', callController.clearCallHistory);

module.exports = router;
