const UserModel = require('../models/UserModel');
const PublicationModel = require('../models/PublicationModel');
const { FollowModel, NotificationModel, CollectionModel, MessageModel } = require('../models/SocialModel');

const usersController = {
  async showProfile(req, res) {
    try {
      const profile = await UserModel.getProfile(req.params.username
        ? (await UserModel.findByUsername(req.params.username))?.id
        : req.user.id);
      if (!profile) return res.status(404).render('error', { title: '404', message: 'Usuario no encontrado' });

      const pubs = await PublicationModel.search({ user_id: profile.id, status: 'active' });
      let isFollowing = false;
      if (req.user && req.user.id !== profile.id) {
        isFollowing = await FollowModel.isFollowing(req.user.id, profile.id);
      }

      res.render('users/profile', {
        title: profile.username,
        profile,
        publications: pubs.rows,
        isFollowing,
        isOwner: req.user?.id === profile.id,
      });
    } catch (err) {
      console.error(err);
      res.render('error', { title: 'Error', message: 'Error al cargar perfil' });
    }
  },

  async follow(req, res) {
    const target = await UserModel.findByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.id === req.user.id) return res.redirect('/users/' + req.params.username);

    const result = await FollowModel.follow(req.user.id, target.id);
    if (result) {
      await NotificationModel.create({
        user_id: target.id, actor_id: req.user.id, type: 'follow',
      });
    }
    res.redirect('/users/' + req.params.username);
  },

  async unfollow(req, res) {
    const target = await UserModel.findByUsername(req.params.username);
    if (target) await FollowModel.unfollow(req.user.id, target.id);
    res.redirect('/users/' + req.params.username);
  },

  async showFollowing(req, res) {
    const pubs = await PublicationModel.getFollowingPublications(req.user.id);
    res.render('publications/following', { title: 'Usuarios que sigo', publications: pubs });
  },
};

const notificationsController = {
  async index(req, res) {
    const notifications = await NotificationModel.getByUser(req.user.id);
    res.render('notifications/index', { title: 'Notificaciones', notifications });
  },

  async markRead(req, res) {
    await NotificationModel.markRead(req.params.id, req.user.id);
    res.redirect('/notifications');
  },

  async markAllRead(req, res) {
    await NotificationModel.markAllRead(req.user.id);
    res.redirect('/notifications');
  },
};

const collectionsController = {
  async index(req, res) {
    const collections = await CollectionModel.getByUser(req.user.id);
    res.render('collections/index', { title: 'Mis colecciones', collections });
  },

  async create(req, res) {
    const { name } = req.body;
    if (!name?.trim()) return res.redirect('/collections');
    await CollectionModel.create(req.user.id, name.trim());
    res.redirect('/collections');
  },

  async show(req, res) {
    const collection = await CollectionModel.findById(req.params.id, req.user.id);
    if (!collection) return res.status(404).render('error', { title: '404', message: 'Colección no encontrada' });
    const items = await CollectionModel.getItems(collection.id);
    res.render('collections/show', { title: collection.name, collection, items });
  },

  async addItem(req, res) {
    const { collection_id } = req.body;
    const collection = await CollectionModel.findById(collection_id, req.user.id);
    if (collection) await CollectionModel.addItem(collection.id, req.params.pubId);
    res.redirect('/publications/' + req.params.pubId + '?saved=1');
  },

  async removeItem(req, res) {
    const collection = await CollectionModel.findById(req.params.id, req.user.id);
    if (collection) await CollectionModel.removeItem(collection.id, req.params.pubId);
    res.redirect('/collections/' + req.params.id);
  },

  async delete(req, res) {
    await CollectionModel.delete(req.params.id, req.user.id);
    res.redirect('/collections');
  },
};

const messagesController = {
  async inbox(req, res) {
    const conversations = await MessageModel.getInbox(req.user.id);
    res.render('messages/inbox', { title: 'Mensajes', conversations });
  },

  async conversation(req, res) {
    const other = await UserModel.findById(req.params.userId);
    if (!other) return res.status(404).render('error', { title: '404', message: 'Usuario no encontrado' });
    const messages = await MessageModel.getConversation(req.user.id, other.id);
    res.render('messages/conversation', { title: 'Chat con ' + other.username, messages, other });
  },

  async send(req, res) {
    const { content } = req.body;
    if (!content?.trim()) return res.redirect('back');
    await MessageModel.send({ sender_id: req.user.id, receiver_id: req.params.userId, content: content.trim() });
    res.redirect('/messages/' + req.params.userId);
  },
};

const validatorController = {
  async dashboard(req, res) {
    const pending = await PublicationModel.getPendingReview();
    res.render('validator/dashboard', { title: 'Panel de Validador', pending });
  },

  async takeDown(req, res) {
    const pub = await PublicationModel.findById(req.params.id);
    if (!pub) return res.redirect('/validator');
    await PublicationModel.update(pub.id, { status: 'taken_down' });
    await UserModel.incrementTakenDown(pub.user_id);
    res.redirect('/validator');
  },

  async dismiss(req, res) {
    await PublicationModel.update(req.params.id, { status: 'active' });
    res.redirect('/validator');
  },
};

module.exports = {
  usersController,
  notificationsController,
  collectionsController,
  messagesController,
  validatorController,
};
