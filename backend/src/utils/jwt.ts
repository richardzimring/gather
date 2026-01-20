import * as crypto from 'crypto';
import { JWT_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY } from '../constants';
import type { AuthTokens } from '../types';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

const base64UrlEncode = (str: string): string => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

const sign = (payload: JwtPayload): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Unknown unit: ${unit}`);
  }
};

export const generateTokens = (userId: string): AuthTokens => {
  const now = Math.floor(Date.now() / 1000);
  const accessExpiresIn = parseExpiry(JWT_ACCESS_EXPIRY);
  const refreshExpiresIn = parseExpiry(JWT_REFRESH_EXPIRY);
  
  const accessPayload: JwtPayload = {
    sub: userId,
    iat: now,
    exp: now + accessExpiresIn,
    type: 'access',
  };
  
  const refreshPayload: JwtPayload = {
    sub: userId,
    iat: now,
    exp: now + refreshExpiresIn,
    type: 'refresh',
  };
  
  return {
    accessToken: sign(accessPayload),
    refreshToken: sign(refreshPayload),
    expiresIn: accessExpiresIn,
  };
};

export const verifyToken = (token: string, type: 'access' | 'refresh'): { userId: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const encodedHeader = parts[0];
    const encodedPayload = parts[1];
    const signature = parts[2];
    
    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode and validate payload
    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    
    if (payload.type !== type) {
      return null;
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
    
    return { userId: payload.sub };
  } catch {
    return null;
  }
};

export const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};
