const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UserModel = require('../models/UserModel');

const authController = {
  showRegister(req, res) {
    if (req.user) return res.redirect('/');
    res.render('auth/register', { title: 'Registrarse', errors: [], old: {} });
  },

  registerValidation: [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Solo letras, números y guiones bajos'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('confirm_password').custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Las contraseñas no coinciden');
      return true;
    }),
    body('full_name').trim().isLength({ min: 2 }).withMessage('Ingresá tu nombre completo'),
  ],

  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Registrarse',
        errors: errors.array(),
        old: req.body,
      });
    }

    try {
      const { username, email, password, full_name } = req.body;

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return res.render('auth/register', {
          title: 'Registrarse',
          errors: [{ msg: 'El email ya está registrado' }],
          old: req.body,
        });
      }
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        return res.render('auth/register', {
          title: 'Registrarse',
          errors: [{ msg: 'El nombre de usuario ya está en uso' }],
          old: req.body,
        });
      }

      await UserModel.create({ username, email, password, full_name });
      res.redirect('/auth/login?registered=1');
    } catch (err) {
      console.error(err);
      res.render('auth/register', {
        title: 'Registrarse',
        errors: [{ msg: 'Error al registrarse. Intente nuevamente.' }],
        old: req.body,
      });
    }
  },

  showLogin(req, res) {
    if (req.user) return res.redirect('/');
    res.render('auth/login', {
      title: 'Iniciar sesión',
      error: null,
      registered: req.query.registered,
    });
  },

  async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = await UserModel.findByEmail(email);
      if (!user || !(await UserModel.verifyPassword(user, password))) {
        return res.render('auth/login', {
          title: 'Iniciar sesión',
          error: 'Email o contraseña incorrectos',
          registered: null,
        });
      }
      if (!user.is_active) {
        return res.render('auth/login', {
          title: 'Iniciar sesión',
          error: 'Tu cuenta está desactivada por incumplimiento de las normas de la comunidad',
          registered: null,
        });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      const redirect = req.query.redirect || '/';
      res.redirect(redirect);
    } catch (err) {
      console.error(err);
      res.render('auth/login', {
        title: 'Iniciar sesión',
        error: 'Error interno. Intente nuevamente.',
        registered: null,
      });
    }
  },

  logout(req, res) {
    res.clearCookie('token');
    res.redirect('/');
  },
};

module.exports = authController;
