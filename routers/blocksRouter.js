const express = require('express');

const router = express.Router();

const { DB: db, pool } = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const blocks = await db.getBlocks();
    // console.log(blocks);
    return res.status(200).send(blocks);
  } catch (err) {
    return res.status(500).send({ error: err });
  }  
});

router.get('/:id', async (req, res) => {
  try {
    const blocks = await db.getBlock(req.params.id);
    if (blocks.length === 0) {
      return res.status(404).send({ error: 'Block not found'});
    }
    return res.status(200).send(blocks[0]);
  } catch (err) {
    return res.status(500).send({ error: err });
  }  
});

router.post('/', async (req, res) => {
  try {
    // check if issue exists
    const rowCount = (await pool.query('SELECT id FROM issue WHERE id = $1;', [req.body.issue_id])).rowCount;
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Issue not found'});
    };

    // create block
    const block = await db.createBlock(req.body);
    return res.status(201).send(block);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});

router.put('/:id', async (req, res) => {
  try {
    // check if issue exists
    const rowCount = (await pool.query('SELECT id FROM issue WHERE id = $1;', [req.body.issue_id])).rowCount;
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Issue not found'});
    };

    const { pieces_order, ...data } = req.body;
    // update pieces display_order
    if (pieces_order && pieces_order.length > 0) {
      // check if pieces exist
      const rowCount = (await pool.query('SELECT id FROM piece WHERE id = ANY($1);', [pieces_order])).rowCount;
      if (rowCount !== pieces_order.length) {
        return res.status(404).send({ error: 'Piece not found'});
      };
      await pool.query(`
        UPDATE piece SET
          display_order = c.display_order
        FROM (
          VALUES
            ${pieces_order.map((piece_id, index) => `(${piece_id}, ${index + 1})`).join(',')}
        ) AS c(id, display_order)
        WHERE piece.id = c.id;
      `);

    }

    // update block
    const rows = await db.updateBlock(req.params.id, data);
    if (rows.length === 0) {
      return res.status(404).send({ error: 'Block not found'});
    }
    const block = rows[0];
    return res.status(200).send(block);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }  
});

router.delete('/:id', async (req, res) => {
  try {
    const rowCount = await db.deleteBlock(req.params.id);
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Block not found'});
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).send({ error: err });
  }  
});


module.exports = router;