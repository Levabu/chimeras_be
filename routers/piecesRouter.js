const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/:id', async (req, res) => {
  const rows = await db.getPieceContent(req.params.id);
  const pieceContent = rows[0];
  if (!pieceContent) {
    return res.status(404).send({ error: 'Piece not found'});
  }
  return res.status(200).send(pieceContent);
});

module.exports = router;