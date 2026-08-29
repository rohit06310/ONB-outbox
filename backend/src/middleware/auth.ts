import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

// Extend Express Request to include our JWT auth payload
declare global {
  namespace Express {
    interface Request {
      authUser?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * Reads token from Authorization header (Bearer) or httpOnly cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to httpOnly cookie
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized — no token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.authUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

/**
 * Generate a signed JWT for a user.
 */
export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as any,
  });
}
