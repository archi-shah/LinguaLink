const express        = require('express');
const router         = express.Router();
const userController = require('../controllers/userController');
const { protect }    = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(protect);

router.get('/users',              userController.searchUsers);
router.get('/users/:id',          userController.getUserById);
router.post('/follow',            userController.sendFollowRequest);
router.post('/follow/accept',     userController.acceptFollowRequest);
router.post('/follow/reject',     userController.rejectFollowRequest);
router.get('/follow-requests',    userController.getFollowRequests);
router.post('/contacts/remove',   userController.removeContact);
router.get('/contacts',           userController.getContacts);
router.post('/block',             userController.blockUser);
router.post('/unblock',           userController.unblockUser);
router.patch('/status',           userController.updateOnlineStatus);
router.post('/match-contacts',    userController.matchContacts);
router.post('/report',            userController.reportUser);

module.exports = router;
