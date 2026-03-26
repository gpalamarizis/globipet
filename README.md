# 🐾 GlobiPet — Monorepo

> "Best care for the best human's friends"

## Project Structure

```
globipet/
├── apps/
│   ├── web/          # React 18 + TypeScript + Tailwind (PWA)
│   ├── backend/      # Node.js + Fastify + PostgreSQL
│   └── mobile/       # React Native + Expo (iOS + Android)
├── packages/
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configs (ESLint, TS, Tailwind)
└── shared/           # Shared types & utilities
```

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Mobile | React Native + Expo SDK 51 |
| Backend | Node.js + Fastify + Prisma ORM |
| Primary DB | PostgreSQL 16 + PostGIS |
| Cache / Realtime | Redis 7 |
| Search | Elasticsearch 8 (Phase 2) |
| File Storage | Cloudflare R2 |
| Payments | Stripe |
| Push Notifications | Firebase Cloud Messaging |
| Video (Telehealth) | Daily.co |
| AI Features | OpenAI API (GPT-4o) |
| Deployment | Cloudflare Pages (web) + Railway (backend) |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- pnpm 8+ (recommended) or npm

### 1. Clone & Install
```bash
git clone https://github.com/your-org/globipet.git
cd globipet
npm install
```

### 2. Environment Setup
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files with your credentials
```

### 3. Database Setup
```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development
```bash
npm run dev          # Web + Backend
npm run dev:mobile   # Mobile (separate terminal)
```

## Deployment

### Web → Cloudflare Pages
```bash
npm run build:web
# Connect repo to Cloudflare Pages, set build output: apps/web/dist
```

### Backend → Railway
```bash
# Connect repo to Railway, set root directory: apps/backend
# Add PostgreSQL + Redis services in Railway dashboard
```

### Mobile → App Stores
```bash
cd apps/mobile
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
npx eas submit --platform ios
npx eas submit --platform android
```

## Environment Variables

See `apps/backend/.env.example` and `apps/web/.env.example` for all required variables.

## Supported Languages
- 🇬🇷 Ελληνικά (default)
- 🇬🇧 English
- 🇪🇸 Español
- 🇫🇷 Français
- 🇨🇳 中文

## License
Proprietary — GlobiPet © 2026
