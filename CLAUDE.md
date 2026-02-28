# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Model Checker - A Next.js web application for testing AI model availability on third-party proxy platforms (NewAPI, OneAPI, etc.). Supports OpenAI-compatible, Anthropic (Claude), and Google Gemini providers.

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM + better-sqlite3 / pg (Postgres), jose (JWT)

**Deployment**: Docker (standalone output), Vercel

---

## Development Commands

```bash
# Development
npm run dev          # Start dev server (default port 3000)

# Build & Production
npm run build        # Production build (standalone output for Docker)
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint

# Database (Drizzle Kit)
npx drizzle-kit generate    # Generate migration
npx drizzle-kit migrate     # Run migration
npx drizzle-kit studio      # Open Drizzle Studio

# Docker
docker-compose up -d        # Build and start containers
docker-compose down         # Stop containers
docker-compose logs -f      # View logs
```

**Database Location**:
- **Local/Docker**: `./data/app.db` (SQLite, auto-created on first run, persisted via Docker volume)
- **Vercel**: Postgres (via `POSTGRES_URL` env var, tables auto-created by `src/instrumentation.ts`)

---

## Architecture

### Provider Adapter Pattern

The application uses an adapter pattern to support multiple AI providers through a unified interface:

```
src/lib/providers/
├── types.ts      # ProviderAdapter interface
├── openai.ts     # OpenAI-compatible (including third-party proxies)
├── anthropic.ts  # Anthropic Claude
├── gemini.ts     # Google Gemini
└── index.ts      # getProvider() factory
```

**Core Interface** (`src/lib/providers/types.ts`):
```typescript
interface ProviderAdapter {
  fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]>;
  testModel(baseUrl: string, apiKey: string, modelId: string): Promise<TestModelResult>;
}
```

**Adding a New Provider**:
1. Create `src/lib/providers/[provider].ts` implementing `ProviderAdapter`
2. Add to `src/types/index.ts`: `export type Provider = "openai" | "anthropic" | "gemini" | "new-provider";`
3. Register in `src/lib/providers/index.ts`

### OAuth Authentication

GitHub and LinuxDo OAuth login is supported via standard OAuth 2.0 flow:

```
src/lib/oauth/
├── types.ts      # OAuth type definitions
├── github.ts     # GitHub OAuth utilities
├── linuxdo.ts    # LinuxDo/Discourse OAuth utilities
└── index.ts      # Unified exports

src/app/api/auth/oauth/
├── github/route.ts       # GitHub OAuth entry (redirects to GitHub)
├── linuxdo/route.ts      # LinuxDo OAuth entry
└── callback/
    ├── github/route.ts   # GitHub callback handler (creates/updates user)
    └── linuxdo/route.ts  # LinuxDo callback handler
```

**OAuth Flow**:
1. User clicks OAuth button → `/api/auth/oauth/{provider}` (sets state cookie)
2. Redirect to provider's authorize page
3. Provider redirects back to `/api/auth/callback/{provider}?code=xxx&state=xxx`
4. Backend exchanges code for access token → fetches user info → creates/updates user
5. Sets JWT cookie and redirects to home

**Important**: OAuth callback URLs are auto-detected from the request (supports any port). No manual `OAUTH_CALLBACK_URL` needed for local development.

### Authentication & Security

- **JWT**: Handled by `src/lib/auth.ts` using `jose` library
- **Token Storage**: httpOnly cookie (`token`), 7-day expiration
- **API Key Encryption**: AES-256-GCM, see `src/lib/crypto.ts`
  - Encrypted keys stored in DB (`apiKeyEnc` field)
  - `ENCRYPTION_KEY` env var (64-char hex recommended), development defaults to all-zeros
  - **Key Length Fallback**: Non-standard length keys are automatically hashed via SHA-256 to derive a valid 32-byte key for AES-256-GCM. This prevents "Invalid key length" errors when custom keys don't meet the 64-hex-char requirement.
- **Password Hashing**: bcryptjs for email/password registration

### Database (`src/lib/db/`)

**Dual Database Architecture**: The application supports both SQLite (local/Docker) and PostgreSQL (Vercel).

- **Detection**: `POSTGRES_URL` or `DATABASE_URL` env var → Postgres; otherwise → SQLite
- **Schema** (`schema.ts`): Uses unified column builders (`t`, `int`, `createTable`, `pk`) with `any` type casts to avoid TypeScript union type incompatibility between SQLite and Postgres column types. This pattern resolves compilation errors where conditional ternary operators on column builders produce uncallable union types.
- **Connection** (`index.ts`): `getDb()` returns a Drizzle instance (SQLite or Postgres based on env)
  - **SSL Fix**: Removes `sslmode` parameter from connection URL to prevent `pg` library from overriding the `rejectUnauthorized: false` setting (fixes Neon SSL certificate validation errors)
  - Returns `any` type to support dual-database compatibility
- **Auto-migration** (`src/instrumentation.ts`): On Vercel, tables are auto-created via Next.js instrumentation hook before any request is handled. Checks if `users` table exists first to avoid re-creation

### Database Schema (`src/lib/db/schema.ts`)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | `id`, `email` (nullable), `passwordHash` (nullable), `oauthProvider`, `oauthId`, `avatarUrl`, `username` |
| `savedConfigs` | Saved API configs | `id`, `name`, `baseUrl`, `apiKeyEnc`, `provider` |
| `checkHistories` | Detection history | `id`, `configId`, `results` (JSON), `modelCount`, `availableCount` |

**OAuth Users**: Identified by composite key `(oauthProvider, oauthId)`. Email and passwordHash are nullable for OAuth-only users.

### API Routes (`src/app/api/`)

| Route | Method | Purpose | Protected |
|-------|--------|---------|-----------|
| `/api/auth/register` | POST | Create user account | No |
| `/api/auth/login` | POST | Login, set JWT cookie | No |
| `/api/auth/logout` | POST | Clear JWT cookie | No |
| `/api/auth/me` | GET | Get current user | No (returns null if not auth) |
| `/api/auth/oauth/github` | GET | GitHub OAuth entry | No |
| `/api/auth/oauth/linuxdo` | GET | LinuxDo OAuth entry | No |
| `/api/auth/callback/github` | GET | GitHub OAuth callback | No |
| `/api/auth/callback/linuxdo` | GET | LinuxDo OAuth callback | No |
| `/api/configs` | GET/POST | List/create saved configs | Yes |
| `/api/configs/[id]` | GET/PUT/DELETE | Get/update/delete config | Yes |
| `/api/models` | POST | Fetch models from provider | No |
| `/api/test` | POST | Test single model | No |
| `/api/histories` | GET/POST | List/create detection history | Yes |
| `/api/histories/[id]` | DELETE | Delete history record | Yes |
| `/api/health` | GET | Health check endpoint | No |

**Protecting API Routes**:
```typescript
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... use user.userId
}
```

### Frontend Structure

- **App Router**: `src/app/` uses Next.js App Router
- **Client Components**: All page components use `"use client"`
- **Styling**: Tailwind CSS 4 + CSS variables (default dark "Terminal Monitor" theme)
- **State Management**: React Context (`src/components/AuthContext.tsx`) for authentication

| Path | Purpose |
|------|---------|
| `/` | Main testing interface |
| `/dashboard` | User dashboard (saved configs + history) |
| `/history` | Detection history details |

---

## Important Patterns

### Provider Usage

```typescript
import { getProvider } from "@/lib/providers";

const adapter = getProvider("openai");  // or "anthropic" | "gemini"
const models = await adapter.fetchModels(baseUrl, apiKey);
const result = await adapter.testModel(baseUrl, apiKey, modelId);
```

### Database Access

```typescript
import { getDb } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { users } from "@/lib/db/schema";

const db = getDb();
// Single condition
const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
// Multiple conditions (must use and())
const user = await db.select().from(users).where(
  and(eq(users.oauthProvider, "github"), eq(users.oauthId, oauthId))
).limit(1);
```

**Important**:
- Drizzle ORM does not support chained `.where()` calls. Use `and()` for multiple conditions.
- Use `await` for all queries (Postgres is async). SQLite also works with `await` via drizzle compatibility.
- Schema tables and `getDb()` return `any` types to support dual-database. Do not rely on type inference from query results.
- When defining schemas, use the unified column builders (`t`, `int`, `createTable`, `pk`) from `schema.ts` instead of directly importing from drizzle-orm to avoid union type issues.

### OAuth Implementation

When adding a new OAuth provider:
1. Create `src/lib/oauth/[provider].ts` with:
   - `get[Provider]AuthorizeUrl(state)` - returns authorization URL
   - `exchangeCodeForToken(code)` - exchanges code for access token
   - `get[Provider]User(accessToken)` - fetches user info
   - `normalize[Provider]User(user)` - converts to `OAuthUserInfo`
2. Create API routes:
   - `/api/auth/oauth/[provider]/route.ts` - entry point (sets callback URL from request)
   - `/api/auth/callback/[provider]/route.ts` - callback handler (creates/updates user)
3. Export functions from `src/lib/oauth/index.ts`

---

## URL Parameters

Home page supports URL parameter injection for quick testing:

- `?baseUrl=https://api.example.com&apiKey=sk-xxx&provider=openai`
- `?configId=123` (load saved config by ID, decrypts API key)

---

## Docker Deployment

The application uses Next.js standalone output for minimal Docker images:

**Key Files**:
- `Dockerfile` - Multi-stage build (deps → builder → runner)
- `docker-compose.yml` - Service orchestration with volume mount
- `.dockerignore` - Build context optimization

**Configuration**:
- Database persists in `./data` directory (volume mount)
- Health check: `/api/health` (30s interval, 3 retries)
- Non-root user: `nextjs:nodejs` (1001:1001)
- `next.config.ts` has `output: "standalone"` enabled

**Environment Variables** (see `.env.docker.example`):
```bash
JWT_SECRET=your-jwt-secret-key-min-64-characters-long
ENCRYPTION_KEY=your-64-character-hex-string
GITHUB_CLIENT_ID=...  # Optional, for GitHub OAuth
GITHUB_CLIENT_SECRET=...
LINUXDO_CLIENT_ID=...  # Optional, for LinuxDo OAuth
LINUXDO_CLIENT_SECRET=...
OAUTH_CALLBACK_URL=http://localhost:3000  # Optional, auto-detected from request
```

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `JWT_SECRET` | JWT signing secret (64+ chars recommended) | `dev-secret-change-in-production` |
| `ENCRYPTION_KEY` | AES-256 key (64 hex chars recommended, non-standard lengths auto-SHA256-hashed) | All zeros (dev only) |
| `POSTGRES_URL` | PostgreSQL connection string (Vercel Postgres) | - |
| `DATABASE_URL` | PostgreSQL connection string (fallback) | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | - |
| `LINUXDO_CLIENT_ID` | LinuxDo OAuth app client ID | - |
| `LINUXDO_CLIENT_SECRET` | LinuxDo OAuth app secret | - |
| `OAUTH_CALLBACK_URL` | OAuth callback URL override | Auto-detected from request |
| `GITHUB_OAUTH_TIMEOUT` | GitHub OAuth request timeout (ms) | 30000 |
| `GITHUB_OAUTH_MAX_RETRIES` | GitHub OAuth retry attempts | 3 |

---

## Path Aliases

- `@/*` → `./src/*` (configured in `tsconfig.json`)

---

## Known Issues

### GitHub OAuth Timeout in China

GitHub API may timeout when accessed from mainland China. Solutions:
- Use LinuxDo OAuth instead (recommended for China users)
- Use VPN/proxy
- Deploy to overseas server (Vercel, etc.)

The application automatically detects timeout errors and suggests alternatives to users.
