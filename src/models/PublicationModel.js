const db = require('../../config/db');

const PublicationModel = {
  async create({ user_id, title, description }) {
    const r = await db.query(
      `INSERT INTO publications (user_id, title, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, title, description || null]
    );
    return r.rows[0];
  },

  async findById(id) {
    const r = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar
       FROM publications p JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['title', 'description', 'comments_open', 'status'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);
    const r = await db.query(
      `UPDATE publications SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return r.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM publications WHERE id = $1', [id]);
  },

  // Obtener publicaciones con filtros combinados
  async search({ q, tag, license, user_id, status = 'active', page = 1, limit = 12 }) {
    const offset = (page - 1) * limit;
    const conditions = ['p.status = $1'];
    const values = [status];
    let i = 2;

    if (q) {
      conditions.push(`(p.title ILIKE $${i} OR p.description ILIKE $${i})`);
      values.push(`%${q}%`);
      i++;
    }
    if (tag) {
      conditions.push(
        `EXISTS (SELECT 1 FROM publication_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.publication_id = p.id AND t.name = $${i})`
      );
      values.push(tag);
      i++;
    }
    if (license) {
      conditions.push(
        `EXISTS (SELECT 1 FROM images img WHERE img.publication_id = p.id AND img.license = $${i})`
      );
      values.push(license);
      i++;
    }
    if (user_id) {
      conditions.push(`p.user_id = $${i}`);
      values.push(user_id);
      i++;
    }

    const where = conditions.join(' AND ');
    const r = await db.query(
      `SELECT p.*, u.username, u.full_name, u.avatar,
         (SELECT filename FROM images WHERE publication_id = p.id LIMIT 1) AS cover,
         (SELECT COUNT(*) FROM images WHERE publication_id = p.id) AS image_count,
         (SELECT ROUND(AVG(rt.score),1) FROM ratings rt JOIN images img ON rt.image_id = img.id WHERE img.publication_id = p.id) AS avg_rating,
         (SELECT COUNT(*) FROM ratings rt JOIN images img ON rt.image_id = img.id WHERE img.publication_id = p.id) AS rating_count
       FROM publications p JOIN users u ON p.user_id = u.id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      [...values, limit, offset]
    );
    const countR = await db.query(
      `SELECT COUNT(*) FROM publications p WHERE ${where}`,
      values
    );
    return {
      rows: r.rows,
      total: parseInt(countR.rows[0].count),
      page,
      limit,
      pages: Math.ceil(parseInt(countR.rows[0].count) / limit),
    };
  },

  // Home: mezcla de publicaciones top + algunas aleatorias para balance
  async getHome(limit = 20) {
    const r = await db.query(
      `WITH ranked AS (
        SELECT p.id,
          COALESCE(AVG(rt.score), 0) AS avg_score,
          COUNT(rt.id) AS vote_count
        FROM publications p
        LEFT JOIN images img ON img.publication_id = p.id
        LEFT JOIN ratings rt ON rt.image_id = img.id
        WHERE p.status = 'active'
        GROUP BY p.id
      ),
      top AS (
        SELECT p.*, r.avg_score, r.vote_count, u.username, u.avatar,
          (SELECT filename FROM images WHERE publication_id = p.id LIMIT 1) AS cover
        FROM publications p
        JOIN ranked r ON r.id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE r.avg_score >= 3.5 AND r.vote_count >= 3
        ORDER BY r.avg_score DESC, r.vote_count DESC
        LIMIT $1
      ),
      rest AS (
        SELECT p.*, r.avg_score, r.vote_count, u.username, u.avatar,
          (SELECT filename FROM images WHERE publication_id = p.id LIMIT 1) AS cover
        FROM publications p
        JOIN ranked r ON r.id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE p.id NOT IN (SELECT id FROM top)
          AND p.status = 'active'
        ORDER BY RANDOM()
        LIMIT $2
      )
      SELECT * FROM top UNION ALL SELECT * FROM rest`,
      [Math.floor(limit * 0.7), Math.ceil(limit * 0.3)]
    );
    return r.rows;
  },

  async addTag(publication_id, tagName) {
    const tagR = await db.query(
      `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [tagName.toLowerCase().trim()]
    );
    const tag_id = tagR.rows[0].id;
    await db.query(
      `INSERT INTO publication_tags (publication_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [publication_id, tag_id]
    );
  },

  async getTags(publication_id) {
    const r = await db.query(
      `SELECT t.name FROM tags t JOIN publication_tags pt ON t.id = pt.tag_id WHERE pt.publication_id = $1`,
      [publication_id]
    );
    return r.rows.map(row => row.name);
  },

  async getImages(publication_id) {
    const r = await db.query(
      `SELECT i.*,
        ROUND(COALESCE(AVG(rt.score), 0), 1) AS avg_rating,
        COUNT(rt.id) AS rating_count
       FROM images i
       LEFT JOIN ratings rt ON rt.image_id = i.id
       WHERE i.publication_id = $1
       GROUP BY i.id
       ORDER BY i.created_at ASC`,
      [publication_id]
    );
    return r.rows;
  },

  async getPendingReview() {
    const r = await db.query(
      `SELECT p.*, u.username,
         (SELECT COUNT(*) FROM image_reports ir JOIN images img ON ir.image_id = img.id WHERE img.publication_id = p.id) AS report_count
       FROM publications p JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending_review'
       ORDER BY p.updated_at ASC`
    );
    return r.rows;
  },

  async getFollowingPublications(user_id, page = 1, limit = 12) {
    const offset = (page - 1) * limit;
    const r = await db.query(
      `SELECT p.*, u.username, u.avatar,
         (SELECT filename FROM images WHERE publication_id = p.id LIMIT 1) AS cover
       FROM publications p
       JOIN users u ON p.user_id = u.id
       JOIN follows f ON f.following_id = p.user_id
       WHERE f.follower_id = $1 AND p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );
    return r.rows;
  },
};

module.exports = PublicationModel;
