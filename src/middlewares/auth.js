const jwt = require('jsonwebtoken');
const db = require('../../config/db');

/**
 * Verifica el token JWT desde la cookie.
 * Si es válido, adjunta el usuario a req.user.
 * Si no hay token, continúa sin usuario (para rutas públicas).
 */
async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, username, email, full_name, avatar, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      res.clearCookie('token');
      res.locals.user = null;
      return next();
    }

    req.user = result.rows[0];
    res.locals.user = result.rows[0];

    // Contar notificaciones no leídas
    const notifResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.locals.unreadNotifications = parseInt(notifResult.rows[0].count);

    next();
  } catch (err) {
    res.clearCookie('token');
    res.locals.user = null;
    next();
  }
}

/**
 * Requiere que el usuario esté autenticado.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

/**
 * Requiere rol específico.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Acceso denegado',
        message: 'No tenés permisos para acceder a esta sección.',
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAuth, requireRole };
