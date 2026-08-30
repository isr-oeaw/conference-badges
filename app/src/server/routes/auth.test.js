import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import db from '../db.js';
import app from '../app.js';
import { clearDatabase } from '../testHelpers.js';
import { hashToken } from '../auth.js';

vi.mock('../mail.js', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
}));

import { sendMagicLink } from '../mail.js';

describe('auth routes', () => {
  beforeEach(() => {
    clearDatabase();
    vi.clearAllMocks();
  });

  it('rejects non-oeaw emails', async () => {
    const res = await request(app)
      .post('/api/auth/request-link')
      .send({ email: 'user@gmail.com' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/oeaw\.ac\.at/);
  });

  it('accepts allowed email and sends magic link', async () => {
    const res = await request(app)
      .post('/api/auth/request-link')
      .send({ email: 'user@oeaw.ac.at' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Check your email/);
    expect(sendMagicLink).toHaveBeenCalledOnce();

    const links = db.prepare('SELECT * FROM magic_links').all();
    expect(links).toHaveLength(1);
    expect(links[0].email).toBe('user@oeaw.ac.at');
  });

  it('verifies token, sets session cookie, and allows /api/me', async () => {
    const token = 'test-verify-token';
    db.prepare(
      `INSERT INTO magic_links (id, token_hash, email, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      hashToken(token),
      'verify@oeaw.ac.at',
      new Date(Date.now() + 15 * 60 * 1000).toISOString()
    );

    const verifyRes = await request(app).get(`/api/auth/verify?token=${token}`);
    expect(verifyRes.status).toBe(302);
    expect(verifyRes.headers.location).toBe('/');

    const cookie = verifyRes.headers['set-cookie']?.[0];
    expect(cookie).toMatch(/session=/);

    const meRes = await request(app).get('/api/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('verify@oeaw.ac.at');
  });

  it('redirects on invalid token', async () => {
    const res = await request(app).get('/api/auth/verify?token=invalid');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?error=invalid_token');
  });

  it('redirects when token is missing', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login?error=missing_token');
  });
});
