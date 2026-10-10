// routes/communityRoutes.js
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

// All community routes require authentication
router.use(protect);

router.get('/',                    ctrl.getAllCommunities);  // list all
router.get('/:id',                 ctrl.getCommunity);       // get one
router.post('/',                   ctrl.createCommunity);    // create
router.post('/:id/join',           ctrl.joinCommunity);      // join
router.post('/:id/leave',          ctrl.leaveCommunity);     // leave
router.post('/:id/channels',       ctrl.addChannel);         // add channel

module.exports = router;
