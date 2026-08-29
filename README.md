# Full-Stack Email Job Scheduler (ReachInbox Assignment)

A production-grade email scheduling service and dashboard designed to reliably schedule, rate-limit, queue, and deliver emails at scale using **BullMQ, Redis, PostgreSQL (Prisma), Elasticsearch, Ethereal Fake SMTP, Slack OAuth, Google OAuth**, and **React.js (Vite) + Tailwind CSS**.

---

## 🎯 Architecture & System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tailwind)                  │
│  http://localhost:3000                                          │
│  Google OAuth │ Dashboard │ Compose Modal │ Scheduled/Sent Lists│
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API + JWT
┌───────────────────────────▼─────────────────────────────────────┐
│                    BACKEND (Express + TypeScript)               │
│  http://localhost:4000                                          │
│  Auth Routes │ Email Routes │ Slack Routes │ BullMQ Dashboard    │
└──────┬───────┬───────┬──────┬─────────────────────────────────┘
       │       │       │      │
   ┌───▼───┐ ┌─▼───┐ ┌─▼──┐ ┌▼──────────┐
   │Postgres│ │Redis│ │ES  │ │  Slack API│
   │(jobs, │ │(Bull│ │(idx)│ │(webhooks) │
   │ users)│ │ MQ) │ └────┘ └───────────┘
   └───────┘ └──┬──┘
              ┌─▼──────────────────────┐
              │   BullMQ Worker(s)      │
              │   - Concurrency: 5      │
              │   - Rate limit: Redis   │
              │   - Delay: 2s min       │
              │   - Ethereal SMTP       │
              └────────────────────────┘
```

### 1. How Scheduling Works (No Cron)
- Scheduling requests (`POST /api/emails/schedule`) create records in **PostgreSQL** with status `SCHEDULED` and a `scheduledAt` timestamp.
- Jobs are added to **BullMQ** (`email-jobs` queue) with a `delay` calculated as `scheduledAt - now()`.
- BullMQ stores delayed jobs natively in Redis sorted sets. No cron loops or Node cron packages are used.

### 2. State Persistence & Restart Safety
- **PostgreSQL as Source of Truth**: All jobs are persisted in PostgreSQL with a unique `id`.
- **Redis Persistence**: BullMQ delayed jobs naturally persist in Redis across server restarts.
- **Boot Reconciliation**: On backend startup, `reconcileScheduledJobs()` checks PostgreSQL for any `SCHEDULED` jobs with future runtimes. If missing from Redis (e.g. Redis was flushed), it re-enqueues them using the DB record ID as the BullMQ `jobId`. Since BullMQ deduplicates by `jobId`, jobs are **never sent twice or lost**.

### 3. Rate Limiting, Concurrency & Delay Throttling
- **Worker Concurrency**: BullMQ Worker runs with `concurrency: 5`.
- **Min Delay Between Sends**: Worker limiter enforces `minDelayMs: 2000` (min 2 seconds between sends).
- **Atomic Redis Rate Limiting**: Per-sender hourly count stored in Redis (`rate:{fromEmail}:{YYYY-MM-DD-HH}`) via atomic Lua `INCR` + `EXPIREAT`.
- **Behavior Under Over-limit Load**: When a sender exceeds their hourly limit (e.g. `50 emails/hr`), jobs are **NOT dropped or failed**. The worker moves the job back into the delayed queue for the start of the next hour window (`job.moveToDelayed(nextHourTimestamp)`), preserving job order.
- **Slack Notification**: Triggers a live message to the user's connected Slack channel the moment a sender's rate limit is reached.

---

## ⚙️ Environment Variables Setup

### Backend `.env` (`backend/.env`)
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://scheduler:scheduler_secret@localhost:5433/email_scheduler

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=change_me_to_a_secure_random_string_in_production
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/callback

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=email_jobs

# BullMQ Worker Settings
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_SENDS_MS=2000

# Rate Limits
MAX_EMAILS_PER_HOUR=200
MAX_EMAILS_PER_HOUR_PER_SENDER=50

# Bull Board Dashboard
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=admin123
```

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- Docker Desktop

### Step 1: Start Infrastructure (PostgreSQL, Redis, Elasticsearch)
```bash
docker-compose up -d
```

### Step 2: Start Backend
```bash
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```
- Server running at `http://localhost:4000`
- BullMQ Dashboard live at `http://localhost:4000/admin/queues` (Login: `admin` / `admin123`)

### Step 3: Start Frontend
```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## 🧪 Verification & Automated Testing

To run the full end-to-end backend test suite (testing JWT auth, bulk email scheduling, Ethereal fake SMTP delivery, BullMQ execution, and Elasticsearch search):

```bash
cd backend
npx ts-node src/db/test_backend.ts
```

---

## 📋 Implemented Feature Checklist

### Backend Requirements
- [x] Schedule emails via API with delayed execution
- [x] Persistent state via PostgreSQL & BullMQ Redis
- [x] Ethereal SMTP test account auto-creation per sender
- [x] Search indexed via Elasticsearch (`GET /api/emails/search`)
- [x] Live BullMQ Dashboard mounted at `/admin/queues`
- [x] Server restart recovery without job duplication or loss
- [x] Worker concurrency (5 parallel jobs)
- [x] Minimum delay between sends (2 seconds)
- [x] Redis-backed per-sender hourly rate limiting
- [x] Reschedule over-limit jobs into next hour window
- [x] Real-time Slack notification on rate limit trigger

### Frontend Requirements (Figma-Matched)
- [x] Google Login + Email Login screen
- [x] Header with user profile avatar, name, email
- [x] Sidebar with `ONB` branding, `Scheduled` and `Sent` tabs with badges
- [x] Compose Email Modal with CSV upload parser (`X email addresses detected`)
- [x] Send Later date/time picker & quick schedule presets
- [x] Scheduled Emails Table with orange time badges & cancel action
- [x] Sent Emails Table with Ethereal Preview URL link buttons
- [x] Email Detail Reader View
