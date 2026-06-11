require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { authMiddleware } = require('./middlewares/auth');

const app = express();

// View engine
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Auth middleware (popula req.user en todas las rutas)
app.use(authMiddleware);

// Locals globales para las vistas
app.use((req, res, next) => {
  res.locals.APP_NAME = process.env.APP_NAME || 'Fotaza 2';
  res.locals.APP_URL = process.env.APP_URL || 'http://localhost:3000';
  next();
});

// Rutas
app.use('/auth', require('./routes/auth'));
app.use('/publications', require('./routes/publications'));
app.use('/', require('./routes/social'));

// Home redirect
app.get('/', (req, res) => res.redirect('/publications'));

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: '404', message: 'Página no encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).render('error', { title: 'Error', message: 'El archivo es demasiado grande (máx. 10MB)' });
  }
  res.status(500).render('error', { title: 'Error', message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Fotaza 2 corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
