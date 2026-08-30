import crypto from 'crypto';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function isAllowedEmail(email, domain) {
  const normalized = email.trim().toLowerCase();
  const pattern = new RegExp(`^[^@]+@${domain.replace(/\./g, '\\.')}$`, 'i');
  return pattern.test(normalized);
}

export function sessionExpiry(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function magicLinkExpiry(minutes = 15) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function isExpired(isoDate) {
  return new Date(isoDate) <= new Date();
}
