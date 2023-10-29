const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/:id', async (req, res) => {
  const { contentOnly } = req.query;
  const dbFunction = contentOnly ? db.getPieceContent : db.getPiece;
  const rows = await dbFunction(req.params.id);
  if (rows.length === 0) {
    return res.status(404).send({ error: 'Piece not found'});
  }
  const piece = rows[0];
  piece.authors = [];
  for (row of rows) {
    if (row.author_full_name) {
      piece.authors.push({
        full_name: row.author_full_name,
        slug: row.author_slug,
      });
    }
  }
  delete piece.author_full_name;
  delete piece.author_slug;

  piece.image_path = 'pieces/piece.jpg'; // TODO: remove this line when we have real images 
  return res.status(200).send(piece);
});

module.exports = router;