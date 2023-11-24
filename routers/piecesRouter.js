const express = require('express');

const router = express.Router();

const { DB: db, pool } = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.getPieces();
    // console.log(rows);
    const pieces = {};

    for (const row of rows) {
      if (!pieces[row.id]) {
        pieces[row.id] = {
          id: row.id,
          title: row.title,
          // image_path: row.image_path,
          image_path: 'pieces/piece.jpg',  // TODO: remove this line when we have real images
          authors: [],
          status: row.status,
          block_id: row.block_id,
          block_title: row.block_title,
          issue_id: row.issue_id,
          issue_title: row.issue_title,
          issue_status: row.issue_status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          display_order: row.display_order,
        };
      }
      if (row.author_full_name) {
        pieces[row.id].authors.push({
          full_name: row.author_full_name,
          slug: row.author_slug,
        });
      }
    }

    return res.status(200).send(Object.values(pieces));
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }
});

router.get('/:id', async (req, res) => {
  const { contentOnly } = req.query;
  const dbFunction = contentOnly ? db.getPieceContent : db.getPiece;
  const rows = await dbFunction(req.params.id);
  if (rows.length === 0) {
    return res.status(404).send({ error: 'Piece not found'});
  }
  const piece = rows[0];
  if (!contentOnly) {
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
  }
  return res.status(200).send(piece);
});

module.exports = router;