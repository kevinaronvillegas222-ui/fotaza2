const db = require('../../config/db');

const CommentModel = {
  async create({ publication_id, user_id, content }) {
    const r = await db.query(
      `INSERT INTO comments (publication_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [publication_id, user_id, content]
    );
    return r.rows[0];
  },

  async findById(id) {
    const r = await db.query(
      `SELECT c.*, u.username, u.avatar FROM comments c
       JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  async getByPublication(publication_id) {
    const r = await db.query(
      `SELECT c.*, u.username, u.full_name, u.avatar,
         (SELECT COUNT(*) FROM comment_reports WHERE comment_id = c.id) AS report_count
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.publication_id = $1 AND c.is_deleted = FALSE
       ORDER BY c.created_at ASC`,
      [publication_id]
    );
    return r.rows;
  },

  async delete(id) {
    await db.query('UPDATE comments SET is_deleted = TRUE WHERE id = $1', [id]);
  },

  async report({ comment_id, user_id, reason, description }) {
    const r = await db.query(
      `INSERT INTO comment_reports (comment_id, user_id, reason, description)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *`,
      [comment_id, user_id, reason, description]
    );
    return r.rows[0] || null;
  },

  async getReportsForAuthor(publication_id) {
    const r = await db.query(
      `SELECT cr.*, c.content, c.user_id AS commenter_id,
         u_commenter.username AS commenter_username,
         u_reporter.username AS reporter_username,
         cr.reason, cr.description, cr.created_at AS report_date
       FROM comment_reports cr
       JOIN comments c ON cr.comment_id = c.id
       JOIN users u_commenter ON c.user_id = u_commenter.id
       JOIN users u_reporter ON cr.user_id = u_reporter.id
       WHERE c.publication_id = $1 AND c.is_deleted = FALSE
       ORDER BY cr.created_at DESC`,
      [publication_id]
    );
    return r.rows;
  },
};

module.exports = CommentModel;
