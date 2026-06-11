const db = require('../../config/db');

const FollowModel = {
  async follow(follower_id, following_id) {
    if (follower_id === following_id) throw new Error('No podés seguirte a vos mismo');
    const r = await db.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [follower_id, following_id]
    );
    return r.rows[0] || null;
  },

  async unfollow(follower_id, following_id) {
    await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [follower_id, following_id]
    );
  },

  async isFollowing(follower_id, following_id) {
    const r = await db.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [follower_id, following_id]
    );
    return r.rows.length > 0;
  },

  async getFollowers(user_id) {
    const r = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar
       FROM follows f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1`,
      [user_id]
    );
    return r.rows;
  },

  async getFollowing(user_id) {
    const r = await db.query(
      `SELECT u.id, u.username, u.full_name, u.avatar
       FROM follows f JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1`,
      [user_id]
    );
    return r.rows;
  },
};

const NotificationModel = {
  async create({ user_id, actor_id, type, publication_id = null, image_id = null }) {
    const r = await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, publication_id, image_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, actor_id, type, publication_id, image_id]
    );
    return r.rows[0];
  },

  async getByUser(user_id, limit = 50) {
    const r = await db.query(
      `SELECT n.*, u.username AS actor_username, u.avatar AS actor_avatar
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT $2`,
      [user_id, limit]
    );
    return r.rows;
  },

  async markRead(id, user_id) {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
  },

  async markAllRead(user_id) {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [user_id]
    );
  },

  async countUnread(user_id) {
    const r = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [user_id]
    );
    return parseInt(r.rows[0].count);
  },
};

const CollectionModel = {
  async create(user_id, name) {
    const r = await db.query(
      `INSERT INTO collections (user_id, name) VALUES ($1, $2) RETURNING *`,
      [user_id, name]
    );
    return r.rows[0];
  },

  async getByUser(user_id) {
    const r = await db.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM collection_items WHERE collection_id = c.id) AS item_count
       FROM collections c WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
      [user_id]
    );
    return r.rows;
  },

  async findById(id, user_id) {
    const r = await db.query(
      'SELECT * FROM collections WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
    return r.rows[0] || null;
  },

  async addItem(collection_id, publication_id) {
    const r = await db.query(
      `INSERT INTO collection_items (collection_id, publication_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [collection_id, publication_id]
    );
    return r.rows[0] || null;
  },

  async removeItem(collection_id, publication_id) {
    await db.query(
      'DELETE FROM collection_items WHERE collection_id = $1 AND publication_id = $2',
      [collection_id, publication_id]
    );
  },

  async getItems(collection_id) {
    const r = await db.query(
      `SELECT p.*, u.username,
         (SELECT filename FROM images WHERE publication_id = p.id LIMIT 1) AS cover
       FROM collection_items ci
       JOIN publications p ON ci.publication_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE ci.collection_id = $1
       ORDER BY ci.added_at DESC`,
      [collection_id]
    );
    return r.rows;
  },

  async delete(id, user_id) {
    await db.query(
      'DELETE FROM collections WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
  },
};

const MessageModel = {
  async send({ sender_id, receiver_id, content }) {
    const r = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [sender_id, receiver_id, content]
    );
    return r.rows[0];
  },

  async getConversation(user1_id, user2_id) {
    const r = await db.query(
      `SELECT m.*, u.username AS sender_username
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [user1_id, user2_id]
    );
    return r.rows;
  },

  async getInbox(user_id) {
    const r = await db.query(
      `SELECT DISTINCT ON (LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id))
         m.*, u.username AS other_username, u.avatar AS other_avatar,
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_id
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id), m.created_at DESC`,
      [user_id]
    );
    return r.rows;
  },
};

module.exports = { FollowModel, NotificationModel, CollectionModel, MessageModel };
