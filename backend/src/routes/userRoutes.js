const express = require('express');
const controller = require('../controllers/userController');
const { requireAuth, requireCurrentUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/users', controller.createUser);
router.get('/users/me', requireAuth, controller.getCurrentUser);
router.get('/users/:id', requireAuth, requireCurrentUser('id'), controller.getUser);

module.exports = router;
