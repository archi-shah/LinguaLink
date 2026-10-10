const express          = require('express');
const router           = express.Router();
const statusController = require('../controllers/statusController');
const { protect }      = require('../middleware/authMiddleware');
const multer           = require('multer');
const path             = require('path');
const fs               = require('fs');

// Ensure uploads/status directory exists
const statusDir = path.join(__dirname, '../uploads/status');
if (!fs.existsSync(statusDir)) fs.mkdirSync(statusDir, { recursive: true });

// Multer config for status images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, statusDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `status-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

// All status routes require authentication
router.use(protect);

router.post('/',                                          statusController.createStatus);
router.get('/',                                           statusController.getStatuses);
router.get('/user/:userId',                               statusController.getUserStatuses);
router.post('/:statusId/view',                            statusController.viewStatus);
router.delete('/:statusId',                               statusController.deleteStatus);
router.post('/upload', upload.single('image'),            statusController.uploadStatusImage);

module.exports = router;
