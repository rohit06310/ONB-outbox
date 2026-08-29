import { WebClient } from '@slack/web-api';
import { IncomingWebhook } from '@slack/webhook';
import prisma from '../config/database';

/**
 * Get the Slack Web API client for a given userId.
 * Returns null if the user has not connected Slack.
 */
async function getSlackClient(userId: string): Promise<WebClient | null> {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId },
  });

  if (!connection) return null;
  return new WebClient(connection.accessToken);
}

/**
 * Send a Slack message to the user's connected channel.
 * Silently no-ops if user hasn't connected Slack.
 */
export async function sendSlackMessage(userId: string, text: string): Promise<void> {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      console.log(`ℹ️   No Slack connection for user ${userId} — skipping notification`);
      return;
    }

    const client = new WebClient(connection.accessToken);

    if (connection.channelId) {
      await client.chat.postMessage({
        channel: connection.channelId,
        text,
        mrkdwn: true,
      });
      console.log(`💬  Slack notification sent to ${connection.channelName} for user ${userId}`);
    } else if (connection.webhookUrl) {
      // Fallback to incoming webhook
      const webhook = new IncomingWebhook(connection.webhookUrl);
      await webhook.send({ text });
    }
  } catch (err: any) {
    // Never crash the worker due to Slack failures
    console.error(`⚠️   Slack notification failed for user ${userId}:`, err.message);
  }
}

/**
 * Send a rate-limit notification to the user's Slack.
 */
export async function notifyRateLimit(
  userId: string,
  senderEmail: string,
  windowKey: string,
  limit: number
): Promise<void> {
  const message =
    `⚠️ *Rate Limit Reached* for sender \`${senderEmail}\`\n` +
    `The hourly limit of *${limit} emails* was reached for window \`${windowKey}\`.\n` +
    `Affected jobs have been rescheduled to the next hour window.`;

  await sendSlackMessage(userId, message);
}

/**
 * Exchange Slack OAuth code for access token.
 */
export async function exchangeSlackCode(
  code: string,
  userId: string
): Promise<{ teamId: string; teamName: string; accessToken: string; channelId?: string; channelName?: string }> {
  const client = new WebClient();

  const result = await client.oauth.v2.access({
    client_id: process.env.SLACK_CLIENT_ID!,
    client_secret: process.env.SLACK_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.SLACK_REDIRECT_URI!,
  });

  if (!result.ok || !result.access_token) {
    throw new Error('Slack OAuth exchange failed');
  }

  const teamId = (result.team as any)?.id ?? '';
  const teamName = (result.team as any)?.name ?? '';
  const accessToken = result.access_token;
  const channelId = (result.incoming_webhook as any)?.channel_id;
  const channelName = (result.incoming_webhook as any)?.channel;
  const webhookUrl = (result.incoming_webhook as any)?.url;

  // Upsert into DB
  await prisma.slackConnection.upsert({
    where: { userId },
    create: { userId, accessToken, teamId, teamName, channelId, channelName, webhookUrl },
    update: { accessToken, teamId, teamName, channelId, channelName, webhookUrl },
  });

  return { teamId, teamName, accessToken, channelId, channelName };
}
