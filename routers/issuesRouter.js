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
  let id = req.params.id;

  // get latest issue if id is 'latest'
  let issuesIds;
  if (id === 'latest') {
    issuesIds = await db.getIssuesIds();
    if (!issuesIds) {
      return res.status(404).send({ error: 'Issue not found'});
    }
    id = issuesIds[0].id;
  }
  const rows = await db.getIssueWithPieces(id, admin=req.query.admin);
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
  const pieces = {};
  rows.forEach(row => {
    if (!blocks[row.block_id]) {
      blocks[row.block_id] = {
        id: row.block_id,
        title: row.block_title,
        pieces: [],
      };
    };
    
    if (!pieces[row.piece_id]) {
      pieces[row.piece_id] = {
        id: row.piece_id,
        block_id: row.block_id,
        title: row.piece_title,
        // image_path: row.piece_image_path,
        image_path: 'pieces/piece.jpg',  // TODO: remove this line when we have real images
        authors: [{
          slug: row.author_slug,
          full_name: row.author_full_name,
        }],
      };
    } else {
      pieces[row.piece_id].authors.push({
        slug: row.author_slug,
        full_name: row.author_full_name,
      });
    }
  });

  // blocks[row.block_id].pieces.push({
  //   id: row.piece_id,
  //   title: row.piece_title,
  //   image_path: row.piece_image_path,
  //   author_slug: row.author_slug,
  //   author_full_name: row.author_full_name,
  // });

  Object.keys(pieces).forEach(key => {
    blocks[pieces[key].block_id].pieces.push(
      {
        id: pieces[key].id,
        title: pieces[key].title,
        image_path: pieces[key].image_path,
        authors: pieces[key].authors,
      }
    );
  });

  Object.keys(blocks).forEach(key => {
    issue.blocks.push(blocks[key]);
  });

  const data = {
    issue: issue,
    ...issuesIds && { issuesIds: issuesIds.map(issue => issue.id) },
  }

  return res.status(200).send(data);
});

module.exports = router;