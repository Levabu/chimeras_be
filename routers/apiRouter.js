const express = require('express');

const router = express.Router();

router.use('/authors', require('./authorsRouter'));
router.use('/issues', require('./issuesRouter'));
router.use('/pieces', require('./piecesRouter'));

module.exports = router;