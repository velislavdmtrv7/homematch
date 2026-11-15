const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Модели
const User = require('./models/User');
const Request = require('./models/Request');
const Offer = require('./models/Offer');
const SavedProperty = require('./models/SavedProperty');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const Report = require('./models/Report');
const Feedback = require('./models/Feedback');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Поддръжка на Base64 снимки

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Set it in server/.env');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('Missing MONGO_URI. Set it in server/.env');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

const isSameId = (a, b) => String(a) === String(b);

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Необходим е вход в профила.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидна или изтекла сесия.' });
  }
};

const normalizeRequestPayload = (body) => ({
  ...body,
  budget: body.budget || {
    min: body.budget_min,
    max: body.budget_max
  },
  specs: body.specs || {
    bedrooms: body.bedrooms,
    min_area_sqm: body.min_area_sqm || undefined,
    furnished: body.furnished,
    pets: body.pets
  }
});

// Връзка с MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Успешна връзка с MongoDB!'))
  .catch((err) => console.error('❌ Грешка при връзка с MongoDB:', err));

// ==========================================
// 1. АВТЕНТИКАЦИЯ И ПРОФИЛ
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role, provider_type } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Имейлът вече е регистриран.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, full_name, role, provider_type });
    await newUser.save();
    
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { _id: newUser._id, email: newUser.email, full_name: newUser.full_name, role: newUser.role, phone: newUser.phone, provider_type: newUser.provider_type }, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Грешен имейл или парола.' });
    }
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { _id: user._id, email: user.email, full_name: user.full_name, role: user.role, phone: user.phone, provider_type: user.provider_type }, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/auth/profile/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате права да променяте този профил.' });
    }

    const allowed = {};
    ['full_name', 'phone', 'role', 'provider_type'].forEach((field) => {
      if (req.body[field] !== undefined) allowed[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(req.params.userId, allowed, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/public/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('full_name role provider_type');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. ЗАЯВКИ (REQUESTS) - CRUD
// ==========================================
app.post('/api/requests', authenticate, async (req, res) => {
  try {
    const payload = normalizeRequestPayload(req.body);
    const newRequest = new Request({
      ...payload,
      seeker_id: req.user.id,
      expires_at: payload.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/requests', authenticate, async (req, res) => {
  try {
    const requests = await Request.find({ status: 'active', expires_at: { $gt: new Date() } }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/requests/:id', authenticate, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена' });
    res.json(request);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/requests/:id', authenticate, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена' });
    if (!isSameId(request.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате права да редактирате тази заявка.' });
    }

    const updated = await Request.findByIdAndUpdate(req.params.id, normalizeRequestPayload(req.body), { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/requests/:id', authenticate, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена' });
    if (!isSameId(request.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате права да изтриете тази заявка.' });
    }

    await Offer.deleteMany({ request_id: req.params.id });
    await Request.findByIdAndDelete(req.params.id);
    res.json({ message: 'Заявката е изтрита' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/requests/user/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези заявки.' });
    }

    const requests = await Request.find({ seeker_id: req.params.userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. ОФЕРТИ (OFFERS)
// ==========================================

// Създаване на нова оферта -> ИЗВЕСТИЕ ДО ТЪРСЕЩИЯ
app.post('/api/offers', authenticate, async (req, res) => {
  try {
    const [responder, request] = await Promise.all([
      User.findById(req.user.id).select('role blocked'),
      Request.findById(req.body.request_id)
    ]);

    if (!responder || responder.blocked) return res.status(403).json({ error: 'Профилът няма право да изпраща оферти.' });
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена.' });
    if (isSameId(request.seeker_id, req.user.id)) return res.status(400).json({ error: 'Не можете да отговаряте на собствена заявка.' });
    if (request.status !== 'active' || request.expires_at <= new Date()) return res.status(400).json({ error: 'Заявката вече не е активна.' });
    if (request.allow_brokers === 'owners_only' && responder.role !== 'owner') return res.status(403).json({ error: 'Тази заявка е само за собственици.' });
    if (request.allow_brokers === 'yes' && responder.role !== 'broker') return res.status(403).json({ error: 'Тази заявка е само за брокери.' });

    const dailyCount = await Offer.countDocuments({
      responder_id: req.user.id,
      createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    });
    if (dailyCount >= 5) return res.status(429).json({ error: 'Достигнахте дневния лимит от 5 предложения.' });

    if (req.body.saved_property_id) {
      const savedProperty = await SavedProperty.findById(req.body.saved_property_id).select('provider_id status');
      if (!savedProperty || !isSameId(savedProperty.provider_id, req.user.id)) {
        return res.status(403).json({ error: 'Нямате достъп до избрания имот.' });
      }
      if (savedProperty.status !== 'active') return res.status(400).json({ error: 'Избраният имот не е активен.' });
    }

    const newOffer = new Offer({
      ...req.body,
      responder_id: req.user.id,
      contact_status: 'pending'
    });
    await newOffer.save();

    // Намираме заявката, за да вземем ID-то на търсещия и града
    if (request) {
      const notification = new Notification({
        user_id: request.seeker_id,
        title: "Нова оферта!",
        message: `Получихте ново предложение за заявката ви в ${request.city}.`,
        type: 'new_response',
        read: false,
        metadata: {
          response_id: newOffer._id,
          request_id: request._id
        }
      });
      await notification.save();
    }

    res.status(201).json(newOffer);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/offers/provider/:id', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.id)) {
      return res.status(403).json({ error: 'Нямате достъп до тези оферти.' });
    }

    const offers = await Offer.find({ responder_id: req.params.id });
    res.json(offers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/offers/seeker/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези оферти.' });
    }

    const userRequests = await Request.find({ seeker_id: req.params.userId });
    const offers = await Offer.find({ request_id: { $in: userRequests.map(r => r._id) } });
    res.json(offers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/offers/daily-count/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тази справка.' });
    }

    const count = await Offer.countDocuments({ responder_id: req.params.userId, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } });
    res.json(count);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Промяна на статус на оферта -> ИЗВЕСТИЕ ДО БРОКЕРА
app.put('/api/offers/:id/status', authenticate, async (req, res) => {
  try {
    if (!['approved', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Невалиден статус.' });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Офертата не е намерена' });

    const request = await Request.findById(offer.request_id);
    if (!request || !isSameId(request.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Само търсещият по заявката може да промени статуса.' });
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, { contact_status: req.body.status }, { new: true });
    
    // Създаваме известие за предлагащия (брокера)
    const statusText = req.body.status === 'approved' ? 'одобрена' : 'отхвърлена';
    const notification = new Notification({
      user_id: updated.responder_id,
      title: "Обновен статус на оферта",
      message: `Вашата оферта беше ${statusText} от клиента.`,
      type: req.body.status === 'approved' ? 'contact_approved' : 'offer_rejected',
      read: false,
      metadata: {
        response_id: updated._id,
        request_id: updated.request_id
      }
    });
    await notification.save();

    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/offers/request/:requestId', authenticate, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена' });

    if (isSameId(request.seeker_id, req.user.id)) {
      const offers = await Offer.find({ request_id: req.params.requestId }).sort({ createdAt: -1 });
      return res.json(offers);
    }

    const offers = await Offer.find({ request_id: req.params.requestId, responder_id: req.user.id }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// СТАНДАРТЕН ИЗГЛЕД НА ОФЕРТА (За брокера)
app.get('/api/offers/:id', authenticate, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Офертата не е намерена' });
    const request = await Request.findById(offer.request_id).select('city seeker_id');
    if (!isSameId(offer.responder_id, req.user.id) && !isSameId(request?.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате достъп до тази оферта.' });
    }
    const responder = await User.findById(offer.responder_id).select('full_name role phone');
    res.json({ ...offer.toObject(), responder_profile: responder, request_city: request?.city });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ИЗГЛЕД С ГЕО-ПРИВАТНОСТ (За търсещия - Privacy Circle)
app.get('/api/offers/seeker-view/:id', authenticate, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Офертата не е намерена' });

    const responder = await User.findById(offer.responder_id).select('full_name role phone');
    const request = await Request.findById(offer.request_id).select('city seeker_id');
    if (!request || !isSameId(request.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате достъп до тази оферта.' });
    }

    const offerData = offer.toObject();

    // БИЗНЕС ЛОГИКА: стабилно размиване на координатите, за да не може да се усреднява с refresh.
    const seed = String(offer._id).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const offsetLng = (((seed % 101) / 100) - 0.5) * 0.005;
    const offsetLat = ((((seed * 7) % 101) / 100) - 0.5) * 0.005;
    if (offerData.location && offerData.location.coordinates) {
      offerData.location.coordinates = [
        offerData.location.coordinates[0] + offsetLng,
        offerData.location.coordinates[1] + offsetLat
      ];
    }
    
    offerData.display_mode = 'circle'; // Винаги е кръг

    // БИЗНЕС ЛОГИКА: "Одобрението" отключва САМО телефона
    if (offerData.contact_status !== 'approved') {
      if (responder) responder.phone = 'Скрито до одобрение';
    }

    res.json({ ...offerData, responder_profile: responder, request_city: request?.city });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ВЗЕМАНЕ НА РЕЗЮМЕ ПО ЗАЯВКА И БРОКЕР
app.get('/api/offers/request-summary/:requestId/:brokerId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.brokerId)) {
      return res.status(403).json({ error: 'Нямате достъп до тази справка.' });
    }

    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Заявката не е намерена' });

    const offers = await Offer.find({ request_id: req.params.requestId, responder_id: req.params.brokerId });
    let seekerPhone = null;
    if (offers.some(o => o.contact_status === 'approved')) {
      const seeker = await User.findById(request.seeker_id).select('phone');
      seekerPhone = seeker?.phone;
    }
    res.json({ request, offers, seekerPhone });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. ЗАПАЗЕНИ ИМОТИ (SAVED PROPERTIES)
// ==========================================
app.post('/api/properties/saved', authenticate, async (req, res) => {
  try {
    const newProperty = new SavedProperty({ ...req.body, provider_id: req.user.id });
    await newProperty.save();
    res.status(201).json(newProperty);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/properties/saved/user/:providerId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.providerId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези имоти.' });
    }

    const properties = await SavedProperty.find({ provider_id: req.params.providerId }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/properties/saved/:id', authenticate, async (req, res) => {
  try {
    const property = await SavedProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Имотът не е намерен' });
    if (!isSameId(property.provider_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате достъп до този имот.' });
    }
    res.json(property);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/properties/saved/:id', authenticate, async (req, res) => {
  try {
    const property = await SavedProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Имотът не е намерен' });
    if (!isSameId(property.provider_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате права да редактирате този имот.' });
    }

    const updated = await SavedProperty.findByIdAndUpdate(req.params.id, { ...req.body, provider_id: req.user.id }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/properties/saved/:id/status', authenticate, async (req, res) => {
  try {
    const property = await SavedProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Имотът не е намерен' });
    if (!isSameId(property.provider_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате права да променяте този имот.' });
    }

    const updated = await SavedProperty.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/properties/saved/:id', authenticate, async (req, res) => {
  try {
    const property = await SavedProperty.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Имотът не е намерен' });
    if (!isSameId(property.provider_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате права да изтриете този имот.' });
    }

    await Offer.updateMany({ saved_property_id: req.params.id, contact_status: 'approved' }, { $set: { saved_property_id: null } });
    await Offer.deleteMany({ saved_property_id: req.params.id, contact_status: { $ne: 'approved' } });
    await SavedProperty.findByIdAndDelete(req.params.id);
    res.json({ message: 'Имотът е изтрит' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. ИЗВЕСТИЯ
// ==========================================
app.get('/api/notifications/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези известия.' });
    }

    const notifications = await Notification.find({ user_id: req.params.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notifications/unread-count/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези известия.' });
    }

    const count = await Notification.countDocuments({ user_id: req.params.userId, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/read-all/:userId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.userId)) {
      return res.status(403).json({ error: 'Нямате достъп до тези известия.' });
    }

    await Notification.updateMany({ user_id: req.params.userId, read: false }, { $set: { read: true } });
    res.json({ message: 'Done' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 6. ОТЗИВИ И СИГНАЛИ
// ==========================================

// Взимане на статистика (Рейтинг)
// Взимане на статистика (Рейтинг)
app.get('/api/reviews/stats/:providerId', async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { provider_id: new mongoose.Types.ObjectId(req.params.providerId) } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    // Връщаме оригиналния формат (avgRating), за да работи с твоя useProviderRating hook!
    res.json(stats[0] || { avgRating: 0, count: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Зареждане на последните ревюта за профила (с имената на потребителите)
app.get('/api/reviews/provider/:providerId', async (req, res) => {
  try {
    const reviews = await Review.find({ provider_id: req.params.providerId })
      .populate('reviewer_id', 'full_name') // Това връзва ID-то с името на човека
      .sort({ createdAt: -1 })
      .limit(5); // Взимаме само последните 5
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Проверка дали потребител вече е оценил даден брокер
app.get('/api/reviews/check/:providerId/:reviewerId', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.reviewerId)) {
      return res.status(403).json({ error: 'Нямате достъп до тази проверка.' });
    }

    const review = await Review.findOne({
      provider_id: req.params.providerId,
      reviewer_id: req.params.reviewerId
    });
    // Връщаме true, ако има намерено ревю
    res.json({ hasReviewed: !!review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Добавяне/Обновяване на ревю (ЗАБРАНА ЗА ДУБЛИРАНЕ)
app.post('/api/reviews', authenticate, async (req, res) => {
  try {
    if (!req.body.response_id) return res.status(400).json({ error: 'Липсва оферта за отзива.' });

    const offer = await Offer.findById(req.body.response_id);
    if (!offer) return res.status(404).json({ error: 'Офертата не е намерена.' });
    if (!isSameId(offer.responder_id, req.body.provider_id) || offer.contact_status !== 'approved') {
      return res.status(403).json({ error: 'Можете да оценявате само одобрени оферти.' });
    }

    const request = await Request.findById(offer.request_id);
    if (!request || !isSameId(request.seeker_id, req.user.id)) {
      return res.status(403).json({ error: 'Нямате право да оцените тази оферта.' });
    }

    const filter = { reviewer_id: req.user.id, provider_id: req.body.provider_id, response_id: req.body.response_id };
    const update = { 
      rating: req.body.rating, 
      text: req.body.comment || req.body.text, // Поддържаме и двете имена на променливи
      response_id: req.body.response_id 
    };

    const review = await Review.findOneAndUpdate(filter, update, { upsert: true, new: true });
    res.json(review);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/reports', authenticate, async (req, res) => {
  try {
    if (!req.body.reason?.trim()) return res.status(400).json({ error: 'Опишете причина за сигнала.' });
    if (!req.body.reported_user_id && !req.body.reported_response_id && !req.body.reported_request_id) {
      return res.status(400).json({ error: 'Липсва обект за докладване.' });
    }

    const report = new Report({
      reporter_id: req.user.id,
      reported_user_id: req.body.reported_user_id || null,
      reported_response_id: req.body.reported_response_id || null,
      reported_request_id: req.body.reported_request_id || null,
      reason: req.body.reason.trim()
    });
    await report.save();
    res.status(201).json(report);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/feedback', authenticate, async (req, res) => {
  try {
    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Опишете какво трябва да подобрим.' });
    if (message.length > 2000) return res.status(400).json({ error: 'Обратната връзка е твърде дълга.' });

    const allowedTypes = new Set(['bug', 'idea', 'confusing', 'other']);
    const feedback = new Feedback({
      user_id: req.user.id,
      type: allowedTypes.has(req.body.type) ? req.body.type : 'other',
      message,
      page: typeof req.body.page === 'string' ? req.body.page.slice(0, 200) : undefined,
      user_agent: (req.headers['user-agent'] || '').slice(0, 300),
    });

    await feedback.save();
    res.status(201).json({ message: 'Благодарим за обратната връзка.' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ==========================================
// 7. СТАТИСТИКИ ЗА ТАБЛОТО
// ==========================================

app.get('/api/stats/provider/:id', authenticate, async (req, res) => {
  try {
    if (!isSameId(req.user.id, req.params.id)) {
      return res.status(403).json({ error: 'Нямате достъп до тази статистика.' });
    }

    const stats = await Offer.aggregate([
      { $match: { responder_id: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: "$contact_status", count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сървърът е активен на порт ${PORT}`));
