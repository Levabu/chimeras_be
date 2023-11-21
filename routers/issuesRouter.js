const fs = require('fs').promises;
const { v4: uuid } = require('uuid');

const express = require('express');

const router = express.Router();

const db = require('../db/db');
const multer = require('multer');

const upload = multer(
  {
    // dest: 'uploads/',
    limits: { fileSize: 30 * 1024 * 1024 },
    // fileFilter: (req, file, cb) => {
    //   if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //     return cb(new Error('File must be an image'));
    //   }
    //   cb(null, true);
    // },
  }
);

router.get('/', async (req, res) => {
  try {
    const issues = await db.getIssues();
    return res.status(200).send(issues);
  } catch (err) {
    return res.status(500).send({ error: err });
  }
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

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // write image to file
    const extension = req.file.originalname.split('.').pop();
    const image_path = `issues/${uuid()}.${extension}`;
    try {
      await fs.writeFile(`public/${image_path}`, req.file.buffer)
    } catch (err) {
      return res.status(500).send({ error: err });
    }

    // create issue
    const data = {
      ...req.body,
      image_path,
    }
    try {
      const issue = await db.createIssue(data);
      return res.status(201).send(issue);
    } catch (err) {
      await fs.unlink(`public/${image_path}`);
      return res.status(500).send({ error: err });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ error: err });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    // update image
    const old_image_path = req.body.image_path;
    let image_path;
    if (req.file) {
      const extension = req.file.originalname.split('.').pop();
      image_path = `issues/${uuid()}.${extension}`;
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
    } else {
      image_path = old_image_path;
    }

    // update issue
    const rows = await db.updateIssue({...req.body, image_path});
    if (rows.length === 0) {
      return res.status(404).send({ error: 'Issue not found'});
    }
    const issue = rows[0];
    return res.status(200).send(issue);
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // delete image
    const rows = await db.getIssue(req.params.id);
    if (rows.length === 0) {
      return res.status(404).send({ error: 'Issue not found'});
    }
    const image_path = rows[0].image_path;
    try {
      await fs.unlink(`public/${image_path}`);
    } catch (err) {
      console.log(err);
    }
    // delete issue
    const rowCount = await db.deleteIssue(req.params.id);
    if (rowCount === 0) {
      return res.status(404).send({ error: 'Issue not found'});
    }
    return res.status(204).send('Issue deleted');
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

module.exports = router;