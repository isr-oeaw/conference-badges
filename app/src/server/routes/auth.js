import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import {
  generateToken,
  hashToken,
  isAllowedEmail,
  isExpired,
  magicLinkExpiry,
  sessionExpiry,
} from '../auth.js';
import { sendMagicLink } from '../mail.js';
import { getSessionCookieOptions } from '../middleware.js';

const router = Router();

const linkLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts. Please try again later.' },
      });

router.post('/request-link', linkLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'oeaw.ac.at';

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isAllowedEmail(email, domain)) {
    return res.status(403).json({
      error: `Only @${domain} email addresses are allowed`,
    });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = magicLinkExpiry(15);

  db.prepare(
    `INSERT INTO magic_links (id, token_hash, email, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(uuidv4(), tokenHash, email, expiresAt);

  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${appUrl}/api/auth/verify?token=${token}`;

  try {
    await sendMagicLink(email, link);
  } catch (err) {
    console.error('Failed to send magic link:', err);
    return res.status(500).json({ error: 'Failed to send login email' });
  }

  res.json({ ok: true, message: 'Login link sent. Check your email.' });
});

router.get('/verify', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/login?error=missing_token');
  }

  const tokenHash = hashToken(token);
  const link = db
    .prepare('SELECT * FROM magic_links WHERE token_hash = ?')
    .get(tokenHash);

  if (!link || link.used_at || isExpired(link.expires_at)) {
    return res.redirect('/login?error=invalid_token');
  }

  db.prepare(`UPDATE magic_links SET used_at = datetime('now') WHERE id = ?`).run(link.id);

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(link.email);
  if (!user) {
    const userId = uuidv4();
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, link.email);
    user = { id: userId, email: link.email };
  }

  const sessionToken = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionToken,
    user.id,
    sessionExpiry(30)
  );

  res.cookie('session', sessionToken, getSessionCookieOptions());
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('session', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

export default router;
