const express = require('express');

const router = express.Router();

const db = require('../db/db');

router.get('/', async (req, res) => {
  const issues = await db.getIssues();
  if (!issues) {
    return res.status(404).send({ error: 'Authors not found'});
  }
  return res.status(200).send(issues);
});

router.get('/:id', async (req, res) => {
  const rows = await db.getIssueWithPieces(req.params.id, true);
  if (rows.length === 0) {
    return res.status(404).send({ error: 'Issue not found'});
  }

  const issue = {
    id: rows[0].issue_id,
    title: rows[0].issue_title,
    issue_date: rows[0].issue_date,
    issue_number: rows[0].issue_number,
    image_path: rows[0].issue_image_path,
    annotation: rows[0].issue_annotation,
    created_at: rows[0].issue_created_at,
    blocks: [],
  };

  const blocks = {};
  rows.forEach(row => {
    if (!blocks[row.block_id]) {
      blocks[row.block_id] = {
        id: row.block_id,
        title: row.block_title,
        pieces: [],
      };
    }
    blocks[row.block_id].pieces.push({
      id: row.piece_id,
      title: row.piece_title,
      image_path: row.piece_image_path,
      author_slug: row.author_slug,
      author_full_name: row.author_full_name,
    });
  });

  Object.keys(blocks).forEach(key => {
    issue.blocks.push(blocks[key]);
  });

  return res.status(200).send(issue);
});

module.exports = router;