import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { env } from '../config/env';
import prisma from '../config/database';
import { signJwt, requireAuth } from '../middleware/auth';

const router = Router();

// ── Configure Passport Google Strategy ──────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID:     env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL:  env.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? '';
        const avatar = profile.photos?.[0]?.value ?? '';

        const user = await prisma.user.upsert({
          where:  { googleId: profile.id },
          create: { googleId: profile.id, email, name: profile.displayName, avatar },
          update: { email, name: profile.displayName, avatar },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /auth/google — Initiate Google OAuth */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/** GET /auth/google/callback — OAuth callback, issues JWT */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=auth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUser = req.user as any;

    const token = signJwt({
      userId: dbUser.id,
      email:  dbUser.email,
      name:   dbUser.name,
    });

    // Redirect to frontend with token in query (frontend stores in memory/localStorage)
    res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
  }
);

/** GET /auth/me — Get current authenticated user */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.userId },
      select: { id: true, email: true, name: true, avatar: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /auth/demo — Dev / Demo Login for Oliver Brown */
router.post('/demo', async (_req: Request, res: Response) => {
  try {
    let user = await prisma.user.findFirst({
      where: { email: 'oliver.brown@domain.io' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id',
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
      });
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /auth/logout — Clear cookie token */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
