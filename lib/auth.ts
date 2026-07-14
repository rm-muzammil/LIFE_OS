import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export async function hashApiKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, SALT_ROUNDS);
}

export async function verifyApiKey(rawKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawKey, hash);
}

export function generateRawKey(prefix = 'sk'): string {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

export function generatePullSecret(): string {
  return crypto.randomBytes(24).toString('hex');
}
