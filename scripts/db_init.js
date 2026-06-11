require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fotaza2',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const schema = `
-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  bio TEXT,
  avatar VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'validator', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  taken_down_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Publicaciones
CREATE TABLE IF NOT EXISTS publications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  comments_open BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_review', 'taken_down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Imágenes
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  license VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (license IN ('free', 'copyright')),
  watermark_text VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Etiquetas
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Relación publicaciones-etiquetas
CREATE TABLE IF NOT EXISTS publication_tags (
  publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, tag_id)
);

-- Comentarios
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Denuncias de imágenes
CREATE TABLE IF NOT EXISTS image_reports (
  id SERIAL PRIMARY KEY,
  image_id INT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(image_id, user_id)
);

-- Denuncias de comentarios
CREATE TABLE IF NOT EXISTS comment_reports (
  id SERIAL PRIMARY KEY,
  comment_id INT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Valoraciones de imágenes
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  image_id INT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(image_id, user_id)
);

-- Seguidores
CREATE TABLE IF NOT EXISTS follows (
  follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('comment','rating','interested','follow')),
  publication_id INT REFERENCES publications(id) ON DELETE CASCADE,
  image_id INT REFERENCES images(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colecciones
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items de colecciones
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, publication_id)
);

-- Interés en imágenes ("me interesa")
CREATE TABLE IF NOT EXISTS interests (
  id SERIAL PRIMARY KEY,
  image_id INT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(image_id, user_id)
);

-- Mensajes privados
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_publications_user ON publications(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
CREATE INDEX IF NOT EXISTS idx_images_publication ON images(publication_id);
CREATE INDEX IF NOT EXISTS idx_comments_publication ON comments(publication_id);
CREATE INDEX IF NOT EXISTS idx_ratings_image ON ratings(image_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
`;

async function seedData(client) {
  const adminHash = await bcrypt.hash('admin1234', 10);
  const validatorHash = await bcrypt.hash('validator1234', 10);
  const userHash = await bcrypt.hash('user1234', 10);

  await client.query(`
    INSERT INTO users (username, email, password_hash, full_name, role) VALUES
      ('admin', 'admin@fotaza.com', $1, 'Administrador', 'admin'),
      ('validador', 'validador@fotaza.com', $2, 'Validador de Contenidos', 'validator'),
      ('juan_foto', 'juan@example.com', $3, 'Juan Pérez', 'user'),
      ('maria_art', 'maria@example.com', $3, 'María García', 'user'),
      ('carlos_pic', 'carlos@example.com', $3, 'Carlos López', 'user')
    ON CONFLICT DO NOTHING
  `, [adminHash, validatorHash, userHash]);

  console.log('✅ Usuarios de prueba creados');
  console.log('   admin / admin1234');
  console.log('   validador / validator1234');
  console.log('   juan_foto / user1234');
  console.log('   maria_art / user1234');
  console.log('   carlos_pic / user1234');
}

async function init() {
  const client = await pool.connect();
  try {
    console.log('🔧 Inicializando base de datos...');
    await client.query(schema);
    console.log('✅ Tablas creadas correctamente');
    await seedData(client);
    console.log('🚀 Base de datos lista');
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
