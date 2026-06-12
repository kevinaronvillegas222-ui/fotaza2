-- ============================================================
-- FotoShare - Backup del esquema de base de datos
-- Desarrollado por: Villegas Kevin Aron
-- Materia: Programación Web II - Universidad de La Punta
-- ============================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'validator', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    publications_removed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: publications
-- ============================================================
CREATE TABLE IF NOT EXISTS publications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'removed')),
    comments_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: images
-- ============================================================
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    license VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (license IN ('free', 'copyright')),
    watermark_text VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: tags
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- TABLA: publication_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS publication_tags (
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (publication_id, tag_id)
);

-- ============================================================
-- TABLA: comments
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INT NOT NULL CHECK (value >= 1 AND value <= 5),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (publication_id, user_id)
);

-- ============================================================
-- TABLA: reports (denuncias de publicaciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (publication_id, user_id)
);

-- ============================================================
-- TABLA: comment_reports (denuncias de comentarios)
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_reports (
    id SERIAL PRIMARY KEY,
    comment_id INT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (comment_id, user_id)
);

-- ============================================================
-- TABLA: follows
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- ============================================================
-- TABLA: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('comment', 'rating', 'interested', 'follow', 'publication_removed')),
    from_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    publication_id INT REFERENCES publications(id) ON DELETE SET NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: collections
-- ============================================================
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: collection_publications
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_publications (
    collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, publication_id)
);

-- ============================================================
-- TABLA: messages (mensajería privada)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    publication_id INT REFERENCES publications(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: interested (me interesa)
-- ============================================================
CREATE TABLE IF NOT EXISTS interested (
    id SERIAL PRIMARY KEY,
    publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (publication_id, user_id)
);

-- ============================================================
-- ÍNDICES para mejorar rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_publications_user_id ON publications(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
CREATE INDEX IF NOT EXISTS idx_images_publication_id ON images(publication_id);
CREATE INDEX IF NOT EXISTS idx_comments_publication_id ON comments(publication_id);
CREATE INDEX IF NOT EXISTS idx_ratings_publication_id ON ratings(publication_id);
CREATE INDEX IF NOT EXISTS idx_reports_publication_id ON reports(publication_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- ============================================================
-- DATOS DE PRUEBA - Usuarios
-- Contraseñas hasheadas con bcrypt (valor: user1234 / validator1234 / admin1234)
-- ============================================================
INSERT INTO users (username, email, password, full_name, bio, role) VALUES
('juan_foto', 'juan@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan Pérez', 'Fotógrafo amateur apasionado por la naturaleza.', 'user'),
('maria_snap', 'maria@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María García', 'Me encanta capturar momentos únicos.', 'user'),
('validador', 'validador@fotaza.com', '$2b$10$LrSgHwP9k.BtJfEcvYdXmOhHqzKlMnVpWxRsAtUjDiCbEfGhIkJlM', 'Carlos Validador', 'Moderador de contenidos de FotoShare.', 'validator'),
('admin_fotoshare', 'admin@fotaza.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p99X2aEl4YuTKdi5Y2K9lm', 'Admin FotoShare', 'Administrador de la plataforma.', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- DATOS DE PRUEBA - Tags
-- ============================================================
INSERT INTO tags (name) VALUES
('naturaleza'), ('ciudad'), ('retrato'), ('paisaje'), ('abstracto'),
('arquitectura'), ('viajes'), ('animales'), ('deporte'), ('arte')
ON CONFLICT (name) DO NOTHING;
