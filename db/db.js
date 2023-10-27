const pool = require('./postgres-config').pool;

class DB {
  static getAuthors = async (admin) => {
    const fields = admin ? 'id, full_name, surname, slug, alt_image_path as image_path, bio, created_at' : 'full_name, surname, slug';
    const authors = await pool.query(`SELECT ${fields} FROM author`);
    return authors.rows;
  };

  static getAuthor = async (slug, admin) => {
    let fields = 'full_name, surname, slug, alt_image_path as image_path, bio';
    if (admin) fields = `id, ${fields}, created_at`;
    const authors = await pool.query(`SELECT ${fields} FROM author WHERE slug = $1`, [slug]);
    return authors.rows;
  };

  static getIssues = async () => {
    const fields = 'id, title, issue_date, issue_number, alt_image_path as image_path, annotation, created_at';
    const issues = await pool.query(`SELECT ${fields} FROM issue`);
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

  static getPieceContent = async (id) => {
    const pieces = await pool.query('SELECT contents FROM piece WHERE id = $1;', [id]);
    return pieces.rows;
  }
}

module.exports = DB;