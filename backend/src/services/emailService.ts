import nodemailer from 'nodemailer';
import { getTransporter } from '../config/ethereal';
import { getSmtpTransporter } from '../config/smtp';

export interface SendEmailOptions {
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

/**
 * Sends an email via real SMTP if configured, otherwise falls back to Ethereal SMTP.
 * Returns the Ethereal preview URL if Ethereal was used.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const smtpTransporter = getSmtpTransporter();
  const transporter = smtpTransporter || await getTransporter(options.fromEmail);

  const info = await transporter.sendMail({
    from: options.fromEmail,
    to: options.toEmail,
    subject: options.subject,
    html: options.body,
    text: options.body.replace(/<[^>]*>/g, ''),   // Strip HTML for plain text fallback
  });

  let previewUrl = (nodemailer.getTestMessageUrl(info) as string) || null;

  if (previewUrl) {
    console.log(`📨  Test/Ethereal Email sent to ${options.toEmail} | Preview: ${previewUrl}`);
  } else {
    console.log(`📨  Live Email sent to ${options.toEmail} | Message ID: ${info.messageId}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
