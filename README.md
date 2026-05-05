# Symphony by Interlude

A client request management dashboard for Interlude Studio's design-as-a-service operations. Clients submit and track design requests; admins manage the workflow. Each request syncs to Notion as a task and posts a Slack notification.

**Live**: https://symphony.interlude.studio
**Demo**: https://symphony.interlude.studio/demo

---

## Features

- **Multi-client portal** — Each client gets their own portal at `/portal/[token]`
- **Request workflow** — Queue → In Progress → In Review → Completed, with auto-promotion when capacity opens
- **Tentative due dates** — Clients pick a target date; visual countdown badges (overdue, soon, future)
- **Notion sync** — Each request creates a Notion page with full content, properties, and per-client templates
- **Slack notifications** — Inbound webhook fires on new requests
- **Brand assets** — Per-client persistent file library
- **Pause / resume clients** — Excludes them from MRR totals and main client list
- **Pending deals** — Track prospects before they convert to active clients
- **View modes** — Detailed / Compact / Grid layouts in admin
- **Mobile responsive** — Fully usable on phones and tablets
- **Demo environment** — `/demo` is fully interactive with local state for tutorials

---

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** — PostgreSQL + Storage (signed URL uploads)
- **Tailwind CSS**
- **Notion API** (`@notionhq/client`)
- **Slack incoming webhooks**
- **Vercel** for deployment

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd symphony-app
npm install

# 2. Copy env template
cp .env.example .env.local
# then edit .env.local with real credentials

# 3. Run migrations (see SETUP.md for full instructions)
# Run all SQL files in supabase/migrations/ in order via Supabase SQL Editor

# 4. Start the dev server
npm run dev
# Open http://localhost:3000 — redirects to /admin
```

For the full first-time setup including Supabase, Notion, and Slack configuration, see **[SETUP.md](./SETUP.md)**.

For Claude Code agents working on this project, see **[CLAUDE.md](./CLAUDE.md)** which covers project architecture, conventions, and common tasks.

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/admin` |
| `/admin` | Admin dashboard — manage clients, requests, deals |
| `/portal/[token]` | Client-facing portal (token-based access, optional password) |
| `/demo` | Interactive demo with sample data (no backend writes) |

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/api/clients` | List / create clients |
| GET / PATCH / DELETE | `/api/clients/[id]` | Get / update / delete a client |
| POST | `/api/requests` | Create new request (also creates Notion page + Slack notif) |
| PATCH / DELETE | `/api/requests/[id]` | Update / delete request (syncs to Notion) |
| POST | `/api/requests/[id]/files` | Add a working file/Figma link |
| POST | `/api/requests/reorder` | Reorder queue priority |
| POST | `/api/upload` | Returns a Supabase signed upload URL |
| GET / POST | `/api/deals` | List / create pending deals |
| PATCH / DELETE | `/api/deals/[id]` | Update / delete a pending deal |
| GET / PATCH | `/api/notifications` | In-app notifications |
| POST | `/api/client/verify` | Verify client portal password |

---

## Project Layout

```
app/                      # Next.js routes + API
components/               # React components
lib/                      # Supabase client, Notion, Slack, utils
supabase/migrations/      # SQL migrations (run in order)
.env.example              # Environment variable template
CLAUDE.md                 # Guide for Claude Code agents
SETUP.md                  # First-time setup guide
README.md                 # This file
```

---

## Plans (defaults)

| Plan | Price | Active Slots | Designers |
|------|-------|--------------|-----------|
| Launch | $2,000/mo | 1 | 1 |
| Growth | $3,500/mo | 3 | 2 |
| Scale | $5,000/mo | 5 | 3-4 |

Per-client overrides for price, max active, and designer count are supported via `custom_*` fields.

---

## License

Private — Interlude Studio internal tool.

## Support

For issues, contact [hello@interlude.studio](mailto:hello@interlude.studio).
