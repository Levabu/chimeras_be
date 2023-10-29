const pool = require('./postgres-config').pool;

class DB {
  static getAuthors = async (admin) => {
    const fields = admin ? 'id, full_name, surname, slug, alt_image_path as image_path, bio, created_at' : 'full_name, surname, slug';
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
        piece.alt_image_path AS piece_image_path
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

  static getIssues = async () => {
    const fields = 'id, title, issue_date, issue_number, alt_image_path as image_path, annotation, created_at';
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
        issue.alt_image_path AS issue_image_path,
        issue.annotation AS issue_annotation,
        ${admin ? 'issue.created_at AS issue_created_at,' : ''}
        block.id AS block_id,
        block.title AS block_title,
        piece.id AS piece_id,
        piece.title AS piece_title,
        piece.alt_image_path AS piece_image_path,
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

  static getPiece = async (id) => {
    const query = `
      SELECT
        piece.id,
        title,
        piece.alt_image_path as image_path,
        content,
        author.full_name as author_full_name,
        author.slug as author_slug
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
}

module.exports = DB;