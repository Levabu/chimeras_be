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
  try {
    const rows = await db.getPieces();
    // console.log(rows);
    const pieces = {};

    for (const row of rows) {
      if (!pieces[row.id]) {
        pieces[row.id] = {
          id: row.id,
          title: row.title,
          image_path: row.image_path,
          // image_path: 'pieces/piece.jpg',  // TODO: remove this line when we have real images
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
          id: row.author_id,
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
  
    // piece.image_path = 'pieces/piece.jpg'; // TODO: remove this line when we have real images 
  }
  return res.status(200).send(piece);
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // check if block exists
    const rowCount = (await pool.query('SELECT id FROM block WHERE id = $1;', [req.body.block_id])).rowCount;
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Block not found'});
    };

    // check if authors exist
    const authorsIds = req.body.authorIds ? req.body.authorIds.split(',') : [];
    let authors = [];
    if (authorsIds.length > 0) {
      authors = (await pool.query('SELECT * FROM author WHERE id = ANY($1);', [authorsIds])).rows;
    } 
    if (authors.length !== authorsIds.length || authors.length === 0) {
      return res.status(404).send({ error: 'Author not found'});
    };

    // write image to file system
    const image = req.file;
    const extension = image.originalname.split('.').pop();
    const image_path = `pieces/${uuid()}.${extension}`;
    try {
      await fs.writeFile(`public/${image_path}`, image.buffer)
    } catch (err) {
      return res.status(500).send({ error: err });
    }

    // create piece
    const data = {
      ...req.body,
      image_path,
    }
    const piece = await db.createPiece(data);

    // create author_piece
    if (authors && authors.length > 0) {
      await pool.query(`
        INSERT INTO author_piece (author_id, piece_id)
        VALUES ${authors.map(author => `(${author.id}, ${piece.id})`).join(',')};
      `);
    }
    piece.authors = authors;
    return res.status(201).send(piece);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    // check if block exists
    const rowCount = (await pool.query('SELECT id FROM block WHERE id = $1;', [req.body.block_id])).rowCount;
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Block not found'});
    };

    // check if authors exist
    const authorsIds = req.body.authorIds ? req.body.authorIds.split(',') : [];
    let authors = [];
    if (authorsIds.length > 0) {
      authors = (await pool.query('SELECT * FROM author WHERE id = ANY($1);', [authorsIds])).rows;
    } 
    if (authors.length !== authorsIds.length || authors.length === 0) {
      return res.status(404).send({ error: 'Author not found'});
    };

    // update image
    const old_image_path = req.body.image_path;
    let image_path = old_image_path;
    if (req.file) {
      const extension = req.file.originalname.split('.').pop();
      image_path = `pieces/${uuid()}.${extension}`;
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

    // update piece
    const { authorIds, ...data } = req.body;
    data.image_path = image_path;
    const rows = await db.updatePiece(req.params.id, data);
    if (rows.length === 0) {
      return res.status(404).send({ error: 'Piece not found'});
    }
    const piece = rows[0];

    // update author_piece
    if (authors && authors.length > 0) {
      await pool.query(`
        DELETE FROM author_piece WHERE piece_id = $1;
      `, [piece.id]);
      await pool.query(`
        INSERT INTO author_piece (author_id, piece_id)
        VALUES ${authors.map(author => `(${author.id}, ${piece.id})`).join(',')};
      `);
    }
    piece.authors = authors;
    return res.status(200).send(piece);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // delete image
    const rows = await db.getPiece(req.params.id);
    if (rows.length === 0) {
      return res.status(404).send({ error: 'Piece not found'});
    }
    const piece = rows[0];
    try {
      await fs.unlink(`public/${piece.image_path}`);
    } catch (err) {
      console.log(err);
    }

    // delete piece
    const rowCount = await db.deletePiece(req.params.id);
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Piece not found'});
    }
    return res.status(204).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});

module.exports = router;