const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publicationsController');
const { requireAuth } = require('../middlewares/auth');
const { uploadImages } = require('../middlewares/upload');

router.get('/', ctrl.showHome);
router.get('/search', ctrl.search);

router.get('/new', requireAuth, ctrl.showCreate);
router.post('/new', requireAuth, (req, res, next) => {
  uploadImages.array('images', 10)(req, res, (err) => {
    if (err) {
      console.error('MULTER ERROR:', err.message, err.stack);
      return res.render('publications/create', { title: 'Nueva publicación', errors: [{ msg: 'Error al subir imagen: ' + err.message }], old: req.body });
    }
    next();
  });
}, ctrl.create);
router.get('/:id', ctrl.show);

router.post('/:id/comments', requireAuth, ctrl.addComment);
router.post('/:id/toggle-comments', requireAuth, ctrl.toggleComments);
router.post('/:id/comments/:commentId/delete', requireAuth, ctrl.deleteComment);
router.post('/:id/comments/:commentId/report', requireAuth, ctrl.reportComment);

router.post('/images/:imageId/report', requireAuth, ctrl.reportImage);
router.post('/images/:imageId/rate', requireAuth, ctrl.rateImage);
router.post('/images/:imageId/interested', requireAuth, ctrl.markInterested);

router.post('/:id/delete', requireAuth, ctrl.deletePublication);

module.exports = router;