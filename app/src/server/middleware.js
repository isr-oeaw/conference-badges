import db from './db.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = db
    .prepare(
      `SELECT s.token, s.user_id, s.expires_at, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);

  if (!session || new Date(session.expires_at) <= new Date()) {
    if (session) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.clearCookie('session', { httpOnly: true, sameSite: 'lax' });
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = { id: session.user_id, email: session.email };
  req.sessionToken = token;
  next();
}

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
