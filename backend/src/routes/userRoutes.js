const express = require('express');
const controller = require('../controllers/userController');

const router = express.Router();

router.post('/users', controller.createUser);
router.get('/users/:id', controller.getUser);

module.exports = router;
