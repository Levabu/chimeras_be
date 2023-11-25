const fs = require('fs').promises;
const { v4: uuid } = require('uuid');

const express = require('express');

const router = express.Router();

const { DB: db, pool } = require('../db/db');
const multer = require('multer');

const upload = multer(
  {
    limits: { fileSize: 30 * 1024 * 1024 },
  }
);

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
    image_path: rows[0].author_image_path,
    bio: rows[0].author_bio,
    pieces: [],
  };

  rows.forEach(row => {
    if (row.piece_id) {
      author.pieces.push({
        id: row.piece_id,
        title: row.piece_title,
        image_path: row.piece_image_path,
      });
    }
  });

  return res.status(200).send(author);
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // write image to file system
    const image = req.file;
    const extension = image.originalname.split('.').pop();
    const image_path = `authors/${uuid()}.${extension}`;
    try {
      await fs.writeFile(`public/${image_path}`, image.buffer)
    } catch (err) {
      return res.status(500).send({ error: err });
    }

    const data = {
      full_name: req.body.full_name,
      surname: req.body.surname,
      slug: req.body.slug,
      bio: req.body.bio,
      image_path,
    };
    const author = await db.createAuthor(data);
    return res.status(201).send(author);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, surname, slug, bio } = req.body;
    // check if author exists
    const rowCount = (await pool.query('SELECT id FROM author WHERE id = $1;', [id])).rowCount;
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Author not found'});
    };

    // check if slug doesn't belong to another author
    const rows = (await pool.query('SELECT id FROM author WHERE slug = $1;', [slug])).rows;
    console.log('rows', rows);
    console.log(rows.length > 0, rows[0].id != id)
    if (rows.length > 0 && rows[0].id != id) {
      return res.status(409).send({ error: 'Slug already exists'});
    }

    // update image
    const old_image_path = req.body.image_path;
    let image_path = old_image_path;
    if (req.file) {
      console.log('req.file', req.file);
      const extension = req.file.originalname.split('.').pop();
      image_path = `authors/${uuid()}.${extension}`;
      try {
        await fs.writeFile(`public/${image_path}`, req.file.buffer)
      } catch (err) {
        return res.status(500).send({ error: err });
      }
      try {
        await fs.unlink(`public/${old_image_path}`);
      } catch (err) {
        console.log(err);
      }
    }

    // update author
    const data = {
      id,
      full_name,
      surname,
      slug,
      bio,
      image_path,
    };
    const updatedRows = await db.updateAuthor(data);
    if (updatedRows.length === 0) {
      return res.status(404).send({ error: 'Author not found'});
    }
    const author = updatedRows[0];
    return res.status(200).send(author);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});


module.exports = router;