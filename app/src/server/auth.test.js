import { describe, expect, it } from 'vitest';
import {
  generateToken,
  hashToken,
  isAllowedEmail,
  isExpired,
  magicLinkExpiry,
  sessionExpiry,
} from './auth.js';

describe('auth helpers', () => {
  it('accepts valid oeaw.ac.at emails', () => {
    expect(isAllowedEmail('user@oeaw.ac.at', 'oeaw.ac.at')).toBe(true);
    expect(isAllowedEmail('  User@OEAW.AC.AT  ', 'oeaw.ac.at')).toBe(true);
  });

  it('rejects other domains and subdomains', () => {
    expect(isAllowedEmail('user@gmail.com', 'oeaw.ac.at')).toBe(false);
    expect(isAllowedEmail('user@mail.oeaw.ac.at', 'oeaw.ac.at')).toBe(false);
    expect(isAllowedEmail('user@notoeaw.ac.at', 'oeaw.ac.at')).toBe(false);
  });

  it('hashes tokens consistently', () => {
    const token = 'abc123';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it('generates unique tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('detects expired dates', () => {
    expect(isExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false);
  });

  it('creates future expiry timestamps', () => {
    expect(new Date(sessionExpiry(30)) > new Date()).toBe(true);
    expect(new Date(magicLinkExpiry(15)) > new Date()).toBe(true);
  });
});
