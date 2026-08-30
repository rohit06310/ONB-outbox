import type { User, ScheduledResponse, SentResponse, SlackStatus, EmailJob } from '../types';

export const API_BASE_URL = 'https://onb-outbox.onrender.com';

export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  async getCurrentUser(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
    clearAuthToken();
  },

  // Emails
  async getScheduled(page = 1, limit = 50): Promise<ScheduledResponse> {
    return request<ScheduledResponse>(`/api/emails/scheduled?page=${page}&limit=${limit}`);
  },

  async getSent(page = 1, limit = 50): Promise<SentResponse> {
    return request<SentResponse>(`/api/emails/sent?page=${page}&limit=${limit}`);
  },

  async getEmailById(id: string): Promise<{ job: EmailJob }> {
    return request<{ job: EmailJob }>(`/api/emails/${id}`);
  },

  async scheduleEmails(data: {
    fromEmail: string;
    recipients: string[];
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenMs: number;
    hourlyLimit: number;
  }): Promise<{ message: string; batchId: string; count: number; jobs: EmailJob[] }> {
    return request('/api/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelEmail(id: string): Promise<{ message: string }> {
    return request(`/api/emails/${id}`, { method: 'DELETE' });
  },

  async searchEmails(query: string, status?: string): Promise<{ hits: any[]; total: number }> {
    const params = new URLSearchParams({ q: query });
    if (status) params.append('status', status);
    return request(`/api/emails/search?${params.toString()}`);
  },

  // Slack
  async getSlackStatus(): Promise<SlackStatus> {
    return request<SlackStatus>('/api/slack/status');
  },

  async disconnectSlack(): Promise<{ message: string }> {
    return request('/api/slack/disconnect', { method: 'DELETE' });
  },
};
