import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { requireAuth } from '../middleware.js';
import { createDefaultDesign } from '../defaultDesign.js';

const router = Router();
router.use(requireAuth);

const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function getOwnedProject(projectId, userId) {
  return db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, userId);
}

function getAccessibleProject(projectId, userId) {
  return db
    .prepare(
      `SELECT * FROM projects
       WHERE id = ? AND (user_id = ? OR shared = 1)`
    )
    .get(projectId, userId);
}

function ownerEmail(userId) {
  return db.prepare('SELECT email FROM users WHERE id = ?').get(userId)?.email || '';
}

router.get('/', (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.created_at, p.updated_at, p.shared, p.user_id, u.email AS owner_email
       FROM projects p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ? OR p.shared = 1
       ORDER BY updated_at DESC`
    )
    .all(req.user.id)
    .map((project) => ({
      ...project,
      shared: Boolean(project.shared),
      is_owner: project.user_id === req.user.id,
    }));
  res.json(projects);
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim() || 'Untitled badge';
  const id = uuidv4();
  const design = createDefaultDesign();

  db.prepare(
    `INSERT INTO projects (id, user_id, name, design_json)
     VALUES (?, ?, ?, ?)`
  ).run(id, req.user.id, name, JSON.stringify(design));

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(formatProject(project, req.user.id));
});

router.get('/:id', (req, res) => {
  const project = getAccessibleProject(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(formatProject(project, req.user.id));
});

router.put('/:id', (req, res) => {
  const project = getAccessibleProject(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const isOwner = project.user_id === req.user.id;
  if (req.body.shared !== undefined && !isOwner) {
    return res.status(403).json({ error: 'Only the owner can change sharing' });
  }

  const name = req.body.name !== undefined ? String(req.body.name).trim() || project.name : project.name;
  const designJson =
    req.body.design_json !== undefined
      ? typeof req.body.design_json === 'string'
        ? req.body.design_json
        : JSON.stringify(req.body.design_json)
      : project.design_json;
  const shared =
    req.body.shared !== undefined ? (req.body.shared ? 1 : 0) : project.shared;

  db.prepare(
    `UPDATE projects SET name = ?, design_json = ?, shared = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(name, designJson, shared, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(formatProject(updated, req.user.id));
});

router.delete('/:id', (req, res) => {
  const project = getOwnedProject(req.params.id, req.user.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const assets = db
    .prepare('SELECT path FROM assets WHERE project_id = ?')
    .all(req.params.id);

  for (const asset of assets) {
    try {
      fs.unlinkSync(asset.path);
    } catch {
      // ignore missing files
    }
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/assets', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, (req, res) => {
  const project = getAccessibleProject(req.params.id, req.user.id);
  if (!project) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO assets (id, project_id, filename, mime, path)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.params.id, req.file.originalname, req.file.mimetype, req.file.path);

  res.status(201).json({
    id,
    filename: req.file.originalname,
    mime: req.file.mimetype,
    url: `/api/assets/${id}`,
  });
});

function formatProject(project, currentUserId) {
  let design_json;
  try {
    design_json = JSON.parse(project.design_json);
  } catch {
    design_json = createDefaultDesign();
  }
  return {
    id: project.id,
    name: project.name,
    design_json,
    shared: Boolean(project.shared),
    is_owner: project.user_id === currentUserId,
    owner_email: ownerEmail(project.user_id),
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
}

export default router;
