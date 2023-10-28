const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/:id', async (req, res) => {
  const { contentOnly } = req.query;
  const dbFunction = contentOnly ? db.getPieceContent : db.getPiece;
  const rows = await dbFunction(req.params.id);
  const piece = rows[0];
  if (!piece) {
    return res.status(404).send({ error: 'Piece not found'});
  }
  piece.image_path = 'pieces/piece.jpg'; // TODO: remove this line when we have real images 
  return res.status(200).send(piece);
});

module.exports = router;