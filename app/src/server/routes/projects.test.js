import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import db from '../db.js';
import app from '../app.js';
import { clearDatabase, createUserSession } from '../testHelpers.js';
import { createDefaultDesign } from '../defaultDesign.js';

describe('project routes', () => {
  let ownerCookie;
  let otherCookie;

  beforeEach(() => {
    clearDatabase();
    const owner = createUserSession('owner@oeaw.ac.at');
    ownerCookie = `session=${owner.sessionToken}`;
    const other = createUserSession('other@oeaw.ac.at');
    otherCookie = `session=${other.sessionToken}`;
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  it('creates and lists projects for owner', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'My conference' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('My conference');
    expect(createRes.body.design_json.objects).toBeDefined();
    expect(createRes.body.is_owner).toBe(true);

    const listRes = await request(app).get('/api/projects').set('Cookie', ownerCookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe('My conference');
  });

  it('updates design JSON', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Editable' });

    const design = { ...createDefaultDesign(), background: '#ffeeaa' };
    const updateRes = await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', ownerCookie)
      .send({ design_json: design });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.design_json.background).toBe('#ffeeaa');

    const getRes = await request(app)
      .get(`/api/projects/${createRes.body.id}`)
      .set('Cookie', ownerCookie);

    expect(getRes.body.design_json.background).toBe('#ffeeaa');
  });

  it('hides private projects from other users', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Private badge' });

    const otherList = await request(app).get('/api/projects').set('Cookie', otherCookie);
    expect(otherList.body).toHaveLength(0);

    const otherGet = await request(app)
      .get(`/api/projects/${createRes.body.id}`)
      .set('Cookie', otherCookie);
    expect(otherGet.status).toBe(404);
  });

  it('shares projects with all logged-in users', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Shared badge' });

    await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', ownerCookie)
      .send({ shared: true });

    const otherList = await request(app).get('/api/projects').set('Cookie', otherCookie);
    expect(otherList.body).toHaveLength(1);
    expect(otherList.body[0].shared).toBe(true);
    expect(otherList.body[0].is_owner).toBe(false);

    const otherUpdate = await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', otherCookie)
      .send({ name: 'Updated by other' });

    expect(otherUpdate.status).toBe(200);
    expect(otherUpdate.body.name).toBe('Updated by other');
  });

  it('allows only owner to share or delete', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Owner only' });

    const shareAttempt = await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', otherCookie)
      .send({ shared: true });

    expect(shareAttempt.status).toBe(404);

    await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', ownerCookie)
      .send({ shared: true });

    const otherShareAttempt = await request(app)
      .put(`/api/projects/${createRes.body.id}`)
      .set('Cookie', otherCookie)
      .send({ shared: false });

    expect(otherShareAttempt.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete(`/api/projects/${createRes.body.id}`)
      .set('Cookie', otherCookie);

    expect(deleteAttempt.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/projects/${createRes.body.id}`)
      .set('Cookie', ownerCookie);

    expect(deleteRes.status).toBe(200);
    expect(db.prepare('SELECT COUNT(*) AS count FROM projects').get().count).toBe(0);
  });
});
