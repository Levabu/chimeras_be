const express = require('express');

const router = express.Router();

router.use('/authors', require('./authorsRouter'));
router.use('/issues', require('./issuesRouter'));
router.use('/blocks', require('./blocksRouter'));
router.use('/pieces', require('./piecesRouter'));
router.use('/users', require('./usersRouter'));

module.exports = router;