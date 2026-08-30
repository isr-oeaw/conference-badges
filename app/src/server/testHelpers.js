import db from '../db.js';

export function clearDatabase() {
  db.exec('DELETE FROM assets');
  db.exec('DELETE FROM projects');
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM magic_links');
  db.exec('DELETE FROM users');
}

export function createUserSession(email = 'user@oeaw.ac.at') {
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();

  db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, email);
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionToken,
    userId,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );

  return { userId, sessionToken, email };
}
