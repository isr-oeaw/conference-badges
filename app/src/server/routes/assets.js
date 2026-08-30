import { Router } from 'express';
import fs from 'fs';
import db from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/:id', (req, res) => {
  const asset = db
    .prepare(
      `SELECT a.*, p.user_id, p.shared
       FROM assets a
       JOIN projects p ON p.id = a.project_id
       WHERE a.id = ? AND (p.user_id = ? OR p.shared = 1)`
    )
    .get(req.params.id, req.user.id);

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  if (!fs.existsSync(asset.path)) {
    return res.status(404).json({ error: 'File missing' });
  }

  res.setHeader('Content-Type', asset.mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(asset.path).pipe(res);
});

export default router;
