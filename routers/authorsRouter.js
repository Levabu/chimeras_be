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
  const rows = await db.getAuthor(req.params.slug);
  const author = rows[0];
  if (!author) {
    return res.status(404).send({ error: 'Author not found'});
  }
  return res.status(200).send(author);
});


module.exports = router;