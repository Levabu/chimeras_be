const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/', async (req, res) => {
  const authors = await db.getAuthors(admin=req.query.admin);
  if (!authors) {
    return res.status(404).send({ error: 'Authors not found'});
  }
  return res.status(200).send(authors);
});

router.get('/:slug', async (req, res) => {
  const rows = await db.getAuthorWithPieces(req.params.slug);
  if (rows.length === 0) {
    return res.status(404).send({ error: 'Author not found'});
  }

  const author = {
    full_name: rows[0].author_full_name,
    surname: rows[0].author_surname,
    slug: rows[0].author_slug,
    // image_path: rows[0].author_image_path,
    image_path: 'authors/author.jpg',
    bio: rows[0].author_bio,
    pieces: [],
  };

  rows.forEach(row => {
    if (row.piece_id) {
      author.pieces.push({
        id: row.piece_id,
        title: row.piece_title,
        // image_path: row.piece_image_path,
        image_path: 'pieces/piece.jpg',
      });
    }
  });

  return res.status(200).send(author);
});


module.exports = router;