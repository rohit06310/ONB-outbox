import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { exchangeSlackCode } from '../services/slackService';
import { env } from '../config/env';
import prisma from '../config/database';

const router = Router();

// ─── GET /api/slack/connect ──────────────────────────────────────────────────
/**
 * Initiates Slack OAuth flow.
 * Required Slack OAuth scopes: chat:write, incoming-webhook, channels:read
 */
router.get('/connect', requireAuth, (req: Request, res: Response) => {
  const scopes = ['chat:write', 'incoming-webhook', 'channels:read'].join(',');
  const state  = req.authUser!.userId; // Use userId as state for CSRF protection
  const url =
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${env.slack.clientId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(env.slack.redirectUri)}` +
    `&state=${state}`;

  res.redirect(url);
});

// ─── GET /api/slack/callback ─────────────────────────────────────────────────
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    console.error('Slack OAuth error:', error);
    res.redirect(`${env.frontendUrl}/dashboard?slack_error=${error}`);
    return;
  }

  if (!code || !userId) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    await exchangeSlackCode(code as string, userId as string);
    res.redirect(`${env.frontendUrl}/dashboard?slack_connected=1`);
  } catch (err: any) {
    console.error('Slack callback error:', err.message);
    res.redirect(`${env.frontendUrl}/dashboard?slack_error=exchange_failed`);
  }
});

// ─── GET /api/slack/status ───────────────────────────────────────────────────
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: req.authUser!.userId },
      select: {
        teamName:    true,
        channelName: true,
        connectedAt: true,
      },
    });

    res.json({
      connected: !!connection,
      ...(connection ?? {}),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/slack/disconnect ────────────────────────────────────────────
router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.slackConnection.deleteMany({
      where: { userId: req.authUser!.userId },
    });
    res.json({ message: 'Slack disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
