export interface User {
  id: string;
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  bullJobId?: string;
  sentAt?: string;
  errorMessage?: string;
  previewUrl?: string;
  delayBetweenMs: number;
  hourlyLimit: number;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledResponse {
  jobs: EmailJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SentResponse {
  jobs: EmailJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  channelName?: string;
  connectedAt?: string;
}

export interface ComposeFormState {
  fromEmail: string;
  recipients: string[];
  toInput: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenSec: number;
  hourlyLimit: number;
}
