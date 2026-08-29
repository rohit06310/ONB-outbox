import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

// Cache transporters per sender email so we don't create Ethereal accounts repeatedly
const transporterCache = new Map<string, Transporter>();
let defaultTransporter: Transporter | null = null;

/**
 * Creates (or returns cached) an Ethereal SMTP transporter.
 * Each unique fromEmail gets its own Ethereal test account.
 */
export async function getTransporter(fromEmail?: string): Promise<Transporter> {
  const cacheKey = fromEmail ?? '__default__';

  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  // Create a new Ethereal test account
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log(`📧  Ethereal account created for "${cacheKey}": ${testAccount.user}`);

  transporterCache.set(cacheKey, transporter);

  if (cacheKey === '__default__') {
    defaultTransporter = transporter;
  }

  return transporter;
}

export { defaultTransporter };
