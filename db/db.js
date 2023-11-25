const pool = require('./postgres-config').pool;

class DB {
  static getAuthors = async (admin) => {
    const fields = admin ? 'id, full_name, surname, slug, alt_image_path as image_path, bio, created_at, updated_at' : 'full_name, surname, slug';
    const authors = await pool.query(`SELECT ${fields} FROM author`);
    return authors.rows;
  };

  static getAuthorWithPieces = async (slug, admin) => {
    const query = `
      SELECT
        author.full_name AS author_full_name,
        author.surname AS author_surname,
        author.slug AS author_slug,
        author.alt_image_path AS author_image_path,
        author.bio AS author_bio,
        ${admin ? 'author.id AS author_id, author.created_at AS author_created_at,' : ''}
        piece.id AS piece_id,
        piece.title AS piece_title,
        piece.image_path AS piece_image_path
      FROM
        author
      LEFT JOIN author_piece ON author.id = author_piece.author_id
      LEFT JOIN piece ON author_piece.piece_id = piece.id
      WHERE
        author.slug = $1;
    `

    const authors = await pool.query(query, [slug]);
    return authors.rows;
  };

  static getIssue = async (id) => {
    const fields = 'id, title, issue_date, issue_number, image_path, annotation, status, created_at, updated_at';
    const issues = await pool.query(`SELECT ${fields} FROM issue WHERE id = $1`, [id]);
    return issues.rows;
  };

  static getIssues = async () => {
    const fields = 'id, title, issue_date, issue_number, image_path, annotation, status, created_at, updated_at';
    const issues = await pool.query(`SELECT ${fields} FROM issue`);
    return issues.rows;
  };

  static getIssuesIds = async () => {
    const issues = await pool.query('SELECT id FROM issue ORDER BY created_at DESC');
    return issues.rows;
  };

  static getIssueWithPieces = async (id, admin) => {
    const query = `
      SELECT
        issue.id AS issue_id,
        issue.title AS issue_title,
        issue.issue_date AS issue_date,
        issue.issue_number AS issue_number,
        issue.image_path AS issue_image_path,
        issue.annotation AS issue_annotation,
        ${admin ? 'issue.created_at AS issue_created_at,' : ''}
        block.id AS block_id,
        block.title AS block_title,
        piece.id AS piece_id,
        piece.title AS piece_title,
        piece.image_path AS piece_image_path,
        author.slug AS author_slug,
        author.full_name AS author_full_name
      FROM
        issue
      LEFT JOIN block ON issue.id = block.issue_id
      LEFT JOIN piece ON block.id = piece.block_id
      LEFT JOIN author_piece ON piece.id = author_piece.piece_id
      LEFT JOIN author ON author_piece.author_id = author.id
      WHERE
        issue.id = $1;
    `;
    const issues = await pool.query(query, [id]);
    return issues.rows;
  };

  static createIssue = async (issue) => {
    const { title, issue_date, issue_number, image_path, annotation, status } = issue;
    const query = `
      INSERT INTO issue (title, issue_date, issue_number, image_path, annotation, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [title, issue_date, issue_number, image_path, annotation, status];
    const newIssue = await pool.query(query, values);
    return newIssue.rows[0];
  };

  static updateIssue = async (issue) => {
    const { id, title, issue_date, issue_number, image_path, annotation, status } = issue;
    const query = `
      UPDATE issue
      SET title = $1, issue_date = $2, issue_number = $3, image_path = $4, annotation = $5, status = $6
      WHERE id = $7
      RETURNING *;
    `;
    const values = [title, issue_date, issue_number, image_path, annotation, status, id];
    const updatedIssue = await pool.query(query, values);
    return updatedIssue.rows;
  };

  static deleteIssue = async (id) => {
    const query = `
      DELETE FROM issue
      WHERE id = $1;
    `;
    return (await pool.query(query, [id])).rowCount;
  };

  static getPieces = async () => {
    const query = `
      SELECT
        piece.id,
        piece.title,
        piece.image_path,
        piece.status,
        piece.created_at,
        piece.updated_at,
        piece.display_order,
        block.id as block_id,
        block.title as block_title,
        author.id as author_id,
        author.full_name as author_full_name,
        author.slug as author_slug,
        issue.id as issue_id,
        issue.title as issue_title,
        issue.status as issue_status
      FROM
        piece
      LEFT JOIN author_piece ON piece.id = author_piece.piece_id
      LEFT JOIN author ON author_piece.author_id = author.id
      LEFT JOIN block ON piece.block_id = block.id
      LEFT JOIN issue ON block.issue_id = issue.id
    `;

    const pieces = await pool.query(query);
    return pieces.rows;
  };

  static getPiece = async (id) => {
    const query = `
      SELECT
        piece.id,
        title,
        piece.image_path,
        content,
        author.full_name as author_full_name,
        author.slug as author_slug,
        display_order
      FROM
        piece
      LEFT JOIN author_piece ON piece.id = author_piece.piece_id
      LEFT JOIN author ON author_piece.author_id = author.id
      WHERE
        piece.id = $1;
    `;

    const pieces = await pool.query(query, [id]);
    return pieces.rows;
  };

  static getPieceContent = async (id) => {
    const pieces = await pool.query('SELECT content FROM piece WHERE id = $1;', [id]);
    return pieces.rows;
  }

  static createPiece = async (piece) => {
    const { title, image_path, content, status, block_id } = piece;
    const query = `
      INSERT INTO piece (title, image_path, content, status, block_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [title, image_path, content, status, block_id];
    const newPiece = await pool.query(query, values);
    return newPiece.rows[0];
  };

  static updatePiece = async (id, piece) => {
    const { title, image_path, content, status, block_id } = piece;
    // conditional query depending on whther content is provided
    const query = `
    WITH updated_piece AS (
      UPDATE piece
      SET title = $1, image_path = $2, status = $3, block_id = $4 ${content ? ', content = $6' : ''}
      WHERE id = $5
      RETURNING *
    ) 
    SELECT
      updated_piece.*,
      block.title as block_title,
      issue.id as issue_id,
      issue.title as issue_title,
      issue.status as issue_status
    FROM
      updated_piece
      LEFT JOIN block ON updated_piece.block_id = block.id
      LEFT JOIN issue ON block.issue_id = issue.id;
    `;
    const values = [title, image_path, status, block_id, id];
    if (content) values.push(content);
    const updatedPiece = await pool.query(query, values);
    return updatedPiece.rows;
  };

  static deletePiece = async (id) => {
    const query = `
      DELETE FROM piece
      WHERE id = $1;
    `;
    return (await pool.query(query, [id])).rowCount;
  };

  static getBlocks = async () => {
    const query = `
      SELECT
        id,
        title,
        issue_id,
        created_at,
        updated_at,
        display_order
      FROM
        block
      ORDER BY
        id;
    `;
    const blocks = await pool.query(query);
    return blocks.rows;
  }

  static getBlock = async (id) => {
    const query = `
      SELECT
        id,
        title,
        issue_id,
        created_at,
        updated_at,
        display_order
      FROM
        block
      WHERE
        id = $1;
    `;
    const blocks = await pool.query(query, [id]);
    return blocks.rows;
  };

  static createBlock = async (block) => {
    const { title, issue_id } = block;
    const query = `
      INSERT INTO block (title, issue_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [title, issue_id];
    const newBlock = await pool.query(query, values);
    return newBlock.rows[0];
  };

  static updateBlock = async (id, block) => {
    const { title, issue_id } = block;
    const query = `
      UPDATE block
      SET title = $1, issue_id = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [title, issue_id, id];
    const updatedBlock = await pool.query(query, values);
    return updatedBlock.rows;
  }

  static deleteBlock = async (id) => {
    const query = `
      DELETE FROM block
      WHERE id = $1;
    `;
    return (await pool.query(query, [id])).rowCount;
  };

  static getUsers = async () => {
    const query = `
      SELECT
        id,
        email,
        role,
        created_at,
        updated_at
      FROM
        user_
    `;
    const users = await pool.query(query);
    return users.rows;
  };

  static getUser = async (id) => {
    const query = `
      SELECT
        id,
        email,
        role,
        created_at,
        updated_at
      FROM
        user_
      WHERE
        id = $1;
    `;
    const users = await pool.query(query, [id]);
    return users.rows;
  };
}

module.exports = { DB, pool };