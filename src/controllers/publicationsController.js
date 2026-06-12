const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const PublicationModel = require('../models/PublicationModel');
const ImageModel = require('../models/ImageModel');
const CommentModel = require('../models/CommentModel');
const { NotificationModel } = require('../models/SocialModel');

const publicationsController = {
  async showHome(req, res) {
    try {
      const publications = await PublicationModel.getHome(20);
      res.render('publications/home', { title: 'Inicio', publications });
    } catch (err) {
      console.error(err);
      res.render('error', { title: 'Error', message: 'Error al cargar el inicio' });
    }
  },

  showCreate(req, res) {
    res.render('publications/create', { title: 'Nueva publicaci  n', errors: [], old: {} });
  },

  createValidation: [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('El t  tulo debe tener entre 3 y 200 caracteres'),
    body('tags').notEmpty().withMessage('Agregǭ al menos una etiqueta'),
  ],

  async create(req, res) {
     const validationErrors = validationResult(req);
    const allErrors = validationErrors.array();
    if (!req.files || req.files.length === 0) {
      allErrors.push({ msg: 'Debés subir al menos una imagen' });
    }
    if (allErrors.length > 0) {
      return res.render('publications/create', {
        title: 'Nueva publicación',
        errors: allErrors,
        old: req.body,
      });
    }

    try {
      const { title, description, tags, license, watermark_text } = req.body;
      const pub = await PublicationModel.create({
        user_id: req.user.id,
        title,
        description,
      });

      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const tag of tagList) {
        await PublicationModel.addTag(pub.id, tag);
      }

      for (const file of req.files) {
        const licenseValue = Array.isArray(license) ? license[0] : license || 'free';
        const watermark = Array.isArray(watermark_text) ? watermark_text[0] : watermark_text;
        const fileUrl = file.path || file.secure_url || file.url || '';
        const originalName = file.originalname || file.original_filename || 'imagen';

        await ImageModel.create({
          publication_id: pub.id,
          filename: fileUrl,
          original_name: originalName,
          license: licenseValue,
          watermark_text: watermark || null,
        });
      }

      res.redirect('/publications/' + pub.id);
    } catch (err) {
      console.error('ERROR CREATE MSG:', err && err.message); console.error('ERROR CREATE STACK:', err && err.stack); console.error('ERROR CREATE FULL:', String(err));
      if (req.files) req.files.forEach(f => { try { if (f.path && !f.path.startsWith('http')) fs.unlinkSync(f.path); } catch (_) {} });
      res.render('publications/create', {
        title: 'Nueva publicaci  n',
        errors: [{ msg: 'Error al crear la publicaci  n' }],
        old: req.body,
      });
    }
  },

  async show(req, res) {
    try {
      const pub = await PublicationModel.findById(req.params.id);
      if (!pub) return res.status(404).render('error', { title: '404', message: 'Publicaci  n no encontrada' });

      const images = await PublicationModel.getImages(pub.id);
      const filteredImages = req.user
        ? images
        : images.filter(img => img.license === 'free');

      if (!req.user && filteredImages.length === 0) {
        return res.render('publications/show', {
          title: pub.title, pub, images: [], comments: [],
          tags: [], isOwner: false, message: 'Iniciǭ sesi  n para ver este contenido.',
        });
      }

      const comments = pub.comments_open ? await CommentModel.getByPublication(pub.id) : [];
      const tags = await PublicationModel.getTags(pub.id);
      const isOwner = req.user && req.user.id === pub.user_id;

      let userRatings = {};
      let userInterests = {};
      if (req.user) {
        for (const img of images) {
          userRatings[img.id] = await ImageModel.getUserRating(img.id, req.user.id);
          userInterests[img.id] = await ImageModel.isInterested(img.id, req.user.id);
        }
      }

      res.render('publications/show', {
        title: pub.title, pub, images: filteredImages, comments, tags,
        isOwner, userRatings, userInterests,
      });
    } catch (err) {
      console.error(err);
      res.render('error', { title: 'Error', message: 'Error al cargar la publicaci  n' });
    }
  },

  async search(req, res) {
    try {
      const { q, tag, license, page = 1 } = req.query;
      const result = await PublicationModel.search({ q, tag, license, page: parseInt(page) });
      res.render('publications/search', {
        title: 'Bǧsqueda',
        ...result,
        query: { q, tag, license },
      });
    } catch (err) {
      console.error(err);
      res.render('error', { title: 'Error', message: 'Error en la bǧsqueda' });
    }
  },

  async addComment(req, res) {
    const { id } = req.params;
    const { content } = req.body;
    try {
      const pub = await PublicationModel.findById(id);
      if (!pub || !pub.comments_open) return res.redirect('/publications/' + id);

      const comment = await CommentModel.create({ publication_id: id, user_id: req.user.id, content });

      if (pub.user_id !== req.user.id) {
        await NotificationModel.create({
          user_id: pub.user_id,
          actor_id: req.user.id,
          type: 'comment',
          publication_id: pub.id,
        });
      }

      res.redirect('/publications/' + id + '#comment-' + comment.id);
    } catch (err) {
      console.error(err);
      res.redirect('/publications/' + id);
    }
  },

  async toggleComments(req, res) {
    const pub = await PublicationModel.findById(req.params.id);
    if (!pub || pub.user_id !== req.user.id) return res.status(403).json({ error: 'Sin permiso' });
    await PublicationModel.update(pub.id, { comments_open: !pub.comments_open });
    res.redirect('/publications/' + pub.id);
  },

  async deleteComment(req, res) {
    const { id, commentId } = req.params;
    const comment = await CommentModel.findById(commentId);
    const pub = await PublicationModel.findById(id);
    if (!comment || !pub || pub.user_id !== req.user.id) return res.status(403).json({ error: 'Sin permiso' });
    await CommentModel.delete(commentId);
    res.redirect('/publications/' + id);
  },

  async reportImage(req, res) {
    const { imageId } = req.params;
    const { reason, description } = req.body;
    try {
      const img = await ImageModel.findById(imageId);
      if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });
      if (await ImageModel.hasReported(imageId, req.user.id)) {
        return res.redirect('/publications/' + img.publication_id + '?error=already_reported');
      }
      await ImageModel.report({ image_id: imageId, user_id: req.user.id, reason, description });
      res.redirect('/publications/' + img.publication_id + '?reported=1');
    } catch (err) {
      console.error(err);
      res.redirect('back');
    }
  },

  async reportComment(req, res) {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    try {
      const comment = await CommentModel.findById(commentId);
      if (!comment) return res.redirect('back');
      await CommentModel.report({ comment_id: commentId, user_id: req.user.id, reason, description });
      res.redirect('/publications/' + comment.publication_id + '?comment_reported=1');
    } catch (err) {
      console.error(err);
      res.redirect('back');
    }
  },

  async rateImage(req, res) {
    const { imageId } = req.params;
    const { score } = req.body;
    try {
      const img = await ImageModel.findById(imageId);
      if (!img) return res.status(404).json({ error: 'No encontrada' });
      const pub = await PublicationModel.findById(img.publication_id);
      if (pub.user_id === req.user.id) {
        return res.redirect('/publications/' + img.publication_id + '?error=own_image');
      }
      await ImageModel.rate({ image_id: imageId, user_id: req.user.id, score: parseInt(score) });
      if (pub.user_id !== req.user.id) {
        await NotificationModel.create({
          user_id: pub.user_id, actor_id: req.user.id,
          type: 'rating', publication_id: pub.id, image_id: imageId,
        });
      }
      res.redirect('/publications/' + img.publication_id);
    } catch (err) {
      console.error(err);
      res.redirect('back');
    }
  },

  async markInterested(req, res) {
    const { imageId } = req.params;
    try {
      const img = await ImageModel.findById(imageId);
      if (!img) return res.status(404).json({ error: 'No encontrada' });
      const pub = await PublicationModel.findById(img.publication_id);
      await ImageModel.markInterested({ image_id: imageId, user_id: req.user.id });
      await NotificationModel.create({
        user_id: pub.user_id, actor_id: req.user.id,
        type: 'interested', publication_id: pub.id, image_id: imageId,
      });
      res.redirect('/publications/' + img.publication_id + '?interested=1');
    } catch (err) {
      console.error(err);
      res.redirect('back');
    }
  },

  async deletePublication(req, res) {
    try {
      const pub = await PublicationModel.findById(req.params.id);
      if (!pub) return res.status(404).render('error', { title: '404', message: 'No encontrada' });
      if (pub.user_id !== req.user.id) return res.status(403).render('error', { title: 'Error', message: 'Sin permiso' });
      await PublicationModel.delete(req.params.id);
      res.redirect('/');
    } catch (err) {
      console.error(err);
      res.redirect('/publications/' + req.params.id);
    }
  },
};

async function applyWatermark(inputPath, outputPath, text) {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  const svgText = `
    <svg width="${width}" height="${height}">
      <text x="50%" y="50%" font-family="Arial" font-size="${Math.floor(width / 15)}"
        fill="rgba(255,255,255,0.5)" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(-30, ${width / 2}, ${height / 2})">${text}</text>
    </svg>`;
  await image.composite([{ input: Buffer.from(svgText), blend: 'over' }]).toFile(outputPath);
}

module.exports = publicationsController;