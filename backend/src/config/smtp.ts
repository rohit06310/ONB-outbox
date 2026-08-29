import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

let smtpTransporter: Transporter | null = null;

/**
 * Creates and caches a real SMTP transporter using environment variables.
 * Returns null if the required environment variables are not set.
 */
export function getSmtpTransporter(): Transporter | null {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true'; // e.g., true for port 465

  if (!host || !user || !pass) {
    return null;
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
}
