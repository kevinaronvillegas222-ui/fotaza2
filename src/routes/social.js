const express = require('express');
const router = express.Router();
const {
  usersController,
  notificationsController,
  collectionsController,
  messagesController,
  validatorController,
} = require('../controllers/socialController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Usuarios
router.get('/users/:username', usersController.showProfile);
router.post('/users/:username/follow', requireAuth, usersController.follow);
router.post('/users/:username/unfollow', requireAuth, usersController.unfollow);
router.get('/following', requireAuth, usersController.showFollowing);

// Notificaciones
router.get('/notifications', requireAuth, notificationsController.index);
router.post('/notifications/:id/read', requireAuth, notificationsController.markRead);
router.post('/notifications/read-all', requireAuth, notificationsController.markAllRead);

// Colecciones
router.get('/collections', requireAuth, collectionsController.index);
router.post('/collections', requireAuth, collectionsController.create);
router.get('/collections/:id', requireAuth, collectionsController.show);
router.post('/collections/add/:pubId', requireAuth, collectionsController.addItem);
router.post('/collections/:id/remove/:pubId', requireAuth, collectionsController.removeItem);
router.post('/collections/:id/delete', requireAuth, collectionsController.delete);

// Mensajes
router.get('/messages', requireAuth, messagesController.inbox);
router.get('/messages/:userId', requireAuth, messagesController.conversation);
router.post('/messages/:userId', requireAuth, messagesController.send);

// Panel validador
router.get('/validator', requireAuth, requireRole('validator', 'admin'), validatorController.dashboard);
router.post('/validator/:id/takedown', requireAuth, requireRole('validator', 'admin'), validatorController.takeDown);
router.post('/validator/:id/dismiss', requireAuth, requireRole('validator', 'admin'), validatorController.dismiss);

module.exports = router;
