import fs from 'fs';
import os from 'os';
import path from 'path';

const testRoot = path.join(os.tmpdir(), `conference-badges-test-${process.pid}`);

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = testRoot;
process.env.UPLOADS_DIR = path.join(testRoot, 'uploads');
process.env.ALLOWED_EMAIL_DOMAIN = 'oeaw.ac.at';
process.env.SESSION_SECRET = 'test-secret';
process.env.APP_URL = 'http://localhost:3000';

fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
