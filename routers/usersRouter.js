const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const users = await db.getUsers();
    return res.status(200).send(users);
  } catch (err) {
    return res.status(500).send({ error: err });
  }  
});

router.get('/:id', async (req, res) => {
  try {
    const users = await db.getUser(req.params.id);
    if (users.length === 0) {
      return res.status(404).send({ error: 'User not found'});
    }
    return res.status(200).send(users[0]);
  } catch (err) {
    return res.status(500).send({ error: err });
  }  
});


module.exports = router;