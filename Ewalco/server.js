require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'uploads', 'gallery');
const GALLERY_DB = path.join(ROOT, 'uploads', 'gallery.json');
const DESTINATION_EMAIL = 'info.ewalcosolutionsltd@gmail.com';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(GALLERY_DB)) fs.writeFileSync(GALLERY_DB, '[]\n');
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
app.use(express.static(ROOT, { extensions: ['html'] }));
app.use('/uploads/gallery', express.static(UPLOAD_DIR, { dotfiles: 'deny', index: false, maxAge: '1d' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false }));
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 10, fileSize: 18 * 1024 * 1024, fields: 12, fieldSize: 20000 } });
const galleryUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 12 * 1024 * 1024, fields: 4, fieldSize: 2000 }, fileFilter: (_req, file, cb) => cb(null, /^image\//i.test(file.mimetype)) });
const clean = value => String(value || '').trim().slice(0, 5000);
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE || 'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
app.post('/api/inquiry', upload.array('attachments', 10), async (req, res) => {
  try {
    const { name, contact, service, message } = req.body;
    if (!clean(name) || !clean(contact) || !clean(service)) return res.status(400).json({ error: 'Please provide your name, contact details, and service.' });
    const files = req.files || [];
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 18 * 1024 * 1024) return res.status(413).json({ error: 'Combined attachments must be 18 MB or less.' });
    const transporter = getTransporter();
    if (!transporter) return res.status(503).json({ error: 'Email delivery is not configured yet. Please configure the SMTP settings on the server.' });
    const safeName = clean(name).replace(/[\r\n]/g, ' ');
    const safeContact = clean(contact).replace(/[\r\n]/g, ' ');
    const safeService = clean(service).replace(/[\r\n]/g, ' ');
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: DESTINATION_EMAIL,
      replyTo: safeContact.includes('@') && !/[\r\n]/.test(safeContact) ? safeContact : undefined,
      subject: `Ewalco website inquiry — ${safeService}`,
      text: `A new inquiry was submitted through the Ewalco website.\n\nName: ${safeName}\nContact: ${safeContact}\nService: ${safeService}\n\nMessage:\n${clean(message) || 'Not provided'}\n\nAttached files: ${files.length ? files.map(f => path.basename(f.originalname)).join(', ') : 'None'}`,
      attachments: files.map(file => ({ filename: path.basename(file.originalname).replace(/[\r\n]/g, '_'), content: file.buffer, contentType: file.mimetype || 'application/octet-stream' }))
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Inquiry email failed:', error.message);
    res.status(500).json({ error: 'Email delivery failed. Please try again later or contact Ewalco directly.' });
  }
});
app.get('/api/gallery', (_req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(GALLERY_DB, 'utf8'))); }
  catch { res.status(500).json({ error: 'Gallery could not be loaded.' }); }
});
app.post('/api/gallery', galleryUpload.single('image'), (req, res) => {
  const suppliedKey = Buffer.from(String(req.get('x-gallery-admin-key') || ''));
  const expectedKey = Buffer.from(String(process.env.GALLERY_ADMIN_KEY || ''));
  if (!expectedKey.length || suppliedKey.length !== expectedKey.length || !crypto.timingSafeEqual(suppliedKey, expectedKey)) return res.status(403).json({ error: 'Invalid gallery admin key.' });
  if (!req.file) return res.status(400).json({ error: 'Choose a valid image file (up to 12 MB).' });
  const caption = clean(req.body.caption).slice(0, 120);
  if (!caption) return res.status(400).json({ error: 'Please add an image title.' });
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };
  const ext = extMap[req.file.mimetype];
  if (!ext) return res.status(415).json({ error: 'Use a JPEG, PNG, WebP, GIF, or AVIF image.' });
  const filename = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
  const entries = JSON.parse(fs.readFileSync(GALLERY_DB, 'utf8'));
  const entry = { filename, url: `/uploads/gallery/${filename}`, caption, description: clean(req.body.description).slice(0, 400), createdAt: new Date().toISOString() };
  entries.unshift(entry);
  fs.writeFileSync(GALLERY_DB, JSON.stringify(entries, null, 2) + '\n');
  res.status(201).json({ ok: true, entry });
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'A file is larger than the allowed upload limit.' : 'Please check the number and size of your uploaded files.' });
  console.error(error); res.status(500).json({ error: 'Unexpected server error.' });
});
app.listen(PORT, () => console.log(`Ewalco website running on port ${PORT}`));
