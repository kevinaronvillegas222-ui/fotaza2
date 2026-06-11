const db = require('../../config/db');

const ImageModel = {
  async create({ publication_id, filename, original_name, license, watermark_text }) {
    const r = await db.query(
      `INSERT INTO images (publication_id, filename, original_name, license, watermark_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [publication_id, filename, original_name, license || 'free', watermark_text || null]
    );
    return r.rows[0];
  },

  async findById(id) {
    const r = await db.query('SELECT * FROM images WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  // Denuncias de imágenes
  async report({ image_id, user_id, reason, description }) {
    const r = await db.query(
      `INSERT INTO image_reports (image_id, user_id, reason, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [image_id, user_id, reason, description]
    );
    // Contar denuncias únicas para esta imagen
    const countR = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS cnt FROM image_reports WHERE image_id = $1`,
      [image_id]
    );
    const cnt = parseInt(countR.rows[0].cnt);
    if (cnt > 3) {
      // Pasar publicación a pending_review
      await db.query(
        `UPDATE publications SET status = 'pending_review', updated_at = NOW()
         WHERE id = (SELECT publication_id FROM images WHERE id = $1)`,
        [image_id]
      );
    }
    return r.rows[0];
  },

  async hasReported(image_id, user_id) {
    const r = await db.query(
      'SELECT 1 FROM image_reports WHERE image_id = $1 AND user_id = $2',
      [image_id, user_id]
    );
    return r.rows.length > 0;
  },

  async getReports(image_id) {
    const r = await db.query(
      `SELECT ir.*, u.username FROM image_reports ir JOIN users u ON ir.user_id = u.id
       WHERE ir.image_id = $1 ORDER BY ir.created_at DESC`,
      [image_id]
    );
    return r.rows;
  },

  // Valoraciones
  async rate({ image_id, user_id, score }) {
    const r = await db.query(
      `INSERT INTO ratings (image_id, user_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (image_id, user_id) DO UPDATE SET score = EXCLUDED.score
       RETURNING *`,
      [image_id, user_id, score]
    );
    return r.rows[0];
  },

  async getUserRating(image_id, user_id) {
    const r = await db.query(
      'SELECT score FROM ratings WHERE image_id = $1 AND user_id = $2',
      [image_id, user_id]
    );
    return r.rows[0]?.score || null;
  },

  async getAverageRating(image_id) {
    const r = await db.query(
      `SELECT ROUND(COALESCE(AVG(score), 0), 1) AS avg, COUNT(*) AS cnt
       FROM ratings WHERE image_id = $1`,
      [image_id]
    );
    return r.rows[0];
  },

  // Interés en imagen
  async markInterested({ image_id, user_id }) {
    const r = await db.query(
      `INSERT INTO interests (image_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING *`,
      [image_id, user_id]
    );
    return r.rows[0] || null;
  },

  async isInterested(image_id, user_id) {
    const r = await db.query(
      'SELECT 1 FROM interests WHERE image_id = $1 AND user_id = $2',
      [image_id, user_id]
    );
    return r.rows.length > 0;
  },

  async getInterestedUsers(image_id) {
    const r = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar, i.created_at
       FROM interests i JOIN users u ON i.user_id = u.id
       WHERE i.image_id = $1 ORDER BY i.created_at DESC`,
      [image_id]
    );
    return r.rows;
  },
};

module.exports = ImageModel;
