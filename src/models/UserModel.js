const db = require('../../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  async findById(id) {
    const r = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async findByEmail(email) {
    const r = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows[0] || null;
  },

  async findByUsername(username) {
    const r = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return r.rows[0] || null;
  },

  async create({ username, email, password, full_name }) {
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [username, email, hash, full_name]
    );
    return r.rows[0];
  },

  async update(id, fields) {
    const allowed = ['full_name', 'bio', 'avatar', 'is_active', 'taken_down_count'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);
    const r = await db.query(
      `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return r.rows[0];
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  },

  async getProfile(id) {
    const r = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.avatar, u.role, u.created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM publications WHERE user_id = u.id AND status = 'active') AS publications_count
       FROM users u WHERE u.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  },

  async incrementTakenDown(id) {
    const r = await db.query(
      `UPDATE users SET taken_down_count = taken_down_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING taken_down_count`,
      [id]
    );
    const count = r.rows[0]?.taken_down_count;
    if (count >= 3) {
      await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);
    }
    return count;
  },
};

module.exports = UserModel;
