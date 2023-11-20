const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const blocks = await db.getBlocks();
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


module.exports = router;