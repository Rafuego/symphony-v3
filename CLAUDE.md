# Symphony by Interlude - Claude Code Project Guide

## Project Overview

Symphony is a client request management dashboard for Interlude Studio (a design-as-a-service business). Clients submit design requests through their own portal; admins manage the workflow, track progress, and deliver files. Each request also syncs to Notion as a task and posts a Slack notification when created.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (direct-to-storage signed URL uploads, bypasses Vercel 4.5MB limit)
- **Styling**: Tailwind CSS
- **Integrations**: Notion API (`@notionhq/client`), Slack incoming webhooks
- **Deployment**: Vercel

## Project Structure

```
symphony-app/
├── app/                                    # Next.js App Router
│   ├── page.js                            # Landing/redirect to /admin
│   ├── layout.js                          # Root layout with fonts
│   ├── globals.css                        # Tailwind + global styles
│   ├── admin/page.js                      # Admin dashboard entry
│   ├── portal/[token]/page.js             # Client portal (public, token-based)
│   ├── demo/page.js                       # Interactive demo with local state
│   └── api/
│       ├── clients/
│       │   ├── route.js                   # GET all, POST new client
│       │   └── [id]/route.js              # GET, PATCH, DELETE client
│       ├── requests/
│       │   ├── route.js                   # POST new request (creates Notion page + Slack notif)
│       │   ├── [id]/
│       │   │   ├── route.js               # PATCH request, DELETE request, syncs Notion
│       │   │   └── files/route.js         # POST working files
│       │   └── reorder/route.js           # POST reorder queue
│       ├── deals/
│       │   ├── route.js                   # GET all, POST new pending deal
│       │   └── [id]/route.js              # PATCH, DELETE deal
│       ├── upload/route.js                # POST returns signed Supabase Storage URL
│       ├── notifications/route.js         # GET unread, PATCH mark read
│       └── client/verify/route.js         # POST password verification
├── components/
│   ├── AdminClientList.js                 # Top-level admin: tabs (Clients, Paused, Pending, Alerts), view toggle (Detailed/Compact/Grid), MRR card
│   ├── AdminClientDashboard.js            # Single client view (admin): settings panel, request tabs, brand assets
│   ├── ClientPortal.js                    # Client-facing portal: requests, brand assets, plan info
│   ├── RequestCard.js                     # Request card (used in admin + client + demo)
│   ├── PlanModal.js                       # Plan configuration modal
│   ├── PasswordGate.js                    # Password protection for client portals
│   └── AlertsPanel.js                     # Notifications panel
├── lib/
│   ├── supabase.js                        # Supabase client + planConfig + statusConfig + requestTypes
│   ├── utils.js                           # renderMarkdown, getBusinessHoursRemaining (legacy)
│   ├── slack.js                           # Slack webhook notifications
│   ├── notion.js                          # Notion API integration (createPage, updatePage, fetchTemplateBlocks)
│   ├── password.js                        # bcrypt password hashing
│   └── uploadFile.js                      # Shared client-side helper for direct-to-Supabase uploads
├── supabase/
│   └── migrations/                        # SQL migrations — run in numeric order
│       ├── 001_initial_schema.sql         # Core tables (clients, requests, request_files, admin_users)
│       ├── 002_add_request_type_and_links.sql
│       ├── 003_notifications.sql          # In-app notifications table
│       ├── 004_brand_assets_deliverables.sql
│       ├── 005_notion_integration.sql     # notion_database_id, notion_page_id
│       ├── 006_notion_project_id.sql      # notion_project_id (Client relation)
│       ├── 007_client_tag.sql             # client_tag (symphony / legacy_drip)
│       ├── 008_pending_deals.sql          # pending_deals table
│       ├── 009_notion_template_id.sql     # Per-client Notion template
│       ├── 010_requested_due_date.sql     # Tentative due date on requests
│       └── 011_client_status.sql          # client_status (active / paused)
└── public/icon.png
```

## Database Schema

### clients
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Client/company name |
| slug | text | URL-safe slug |
| plan | text | 'launch', 'growth', or 'scale' |
| access_token | text | Unique UUID for client portal URL |
| logo | text | Emoji/icon (optional) |
| custom_price | integer | Override plan price |
| custom_max_active | integer | Override max active requests |
| custom_designers | text | Override designer count |
| password_hash | text | bcrypt-hashed portal password |
| password_enabled | boolean | Whether password is required |
| brand_assets | jsonb | Array of `{name, url, type, size, addedAt}` |
| client_tag | text | 'symphony', 'legacy_drip' (segments client list) |
| client_status | text | 'active' (default) or 'paused' (excluded from MRR/main list) |
| notion_database_id | text | Notion Tasks DB ID (defaults to global) |
| notion_project_id | text | Notion page ID for the "Client" relation |
| notion_template_id | text | Notion page ID of per-client template |
| created_at | timestamp | Creation date |

### requests
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Foreign key to clients |
| title | text | Request title |
| description | text | Markdown details |
| status | text | 'in-queue' / 'in-progress' / 'in-review' / 'completed' |
| priority | integer | Queue position (lower = higher priority) |
| request_type | text | 'brand', 'site', 'deck', 'product', 'marketing', 'misc' |
| links | jsonb | Array of reference URLs |
| attachments | jsonb | Array of `{name, url, size, type}` (client uploads) |
| deliverables | jsonb | Array of final deliverable files (admin uploads) |
| started_at | timestamp | When status moved to in-progress |
| completed_at | timestamp | When status moved to completed |
| requested_due_date | date | Client-set tentative due date |
| extension_hours | integer | Legacy: total extended hours (timer system removed but column remains) |
| extension_note | text | Legacy: extension reason |
| extension_requested | boolean | Legacy: extension request flag |
| admin_notes | text | Internal admin notes |
| notion_page_id | text | Linked Notion page ID for sync |
| created_at | timestamp | Submission date |

### request_files
Working files admin links during the work (Figma URLs or uploaded files).

### notifications
In-app notifications for new requests, status changes, etc.

### pending_deals
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Company name |
| status | text | 'lead' / 'proposal' / 'negotiation' / 'verbal' |
| contact_name | text | |
| contact_email | text | |
| plan | text | Likely plan |
| estimated_price | integer | Pipeline value |
| notes | text | |
| created_at | timestamp | |

## Key Features

### Status Flow
```
in-queue → in-progress → in-review → completed
              ↑              ↓
              └──────────────┘ (status can move back)
```
Both clients and admins can change status via the dropdown on each card.

### Plans (defaults — overridable per client)
- **Launch**: $2,000/mo, 1 active, 1 designer
- **Growth**: $3,500/mo, 3 active, 2 designers
- **Scale**: $5,000/mo, 5 active, 3-4 designers

### Auto-Promotion
When a new request is submitted, if active count < `max_active`, status starts as `in-progress`. Otherwise it goes to `in-queue` with the next priority number.

### Tentative Due Date
Clients pick an optional date when submitting. Shown as a colored badge on each request card:
- **Blue** — future
- **Amber** — within 2 days
- **Red** — overdue
- **Gray** — completed

### Notion Integration
Each request creates a Notion page in the Tasks database. The page includes:
- Symphony link callout
- Description, request type, reference links, attachments
- Per-client template content (if `notion_template_id` is set on the client)
- Properties: Task name, Status, Priority, Hours, Client (relation), Timeline (date range)

The status of the Notion page syncs back when the Symphony status changes. The "Client" relation is set when `notion_project_id` is configured.

**Default Tasks DB ID**: `24e866d074498154a2a2ca1cd1768b41` (set in `lib/notion.js`)

### Slack Notifications
Posts a message to the configured webhook when a new request is created.

### File Handling (Direct-to-Supabase Uploads)
1. Browser POSTs filename + clientId to `/api/upload`
2. Server returns a Supabase signed upload URL
3. Browser PUTs file directly to Supabase Storage (bypasses Vercel 4.5MB limit, supports up to 25MB)
4. The public URL is returned and stored on the request

`lib/uploadFile.js` is the shared helper used by all 6 upload sites.

### Client Status (Pause)
Clients can be marked as "paused" via Settings — they:
- Move to a separate **Paused** tab
- Are excluded from MRR calculations
- Are hidden from the main Clients tab

### Pending Deals
A separate **Pending** tab tracks deals before they become clients. A "Convert to Client" button creates a real client record from a deal's info.

### Admin View Modes
The Clients tab supports three view modes via a toggle:
- **Detailed** — full info per row (default)
- **Compact** — slim, dense rows
- **Grid** — 1/2/3 column cards

### Mobile Responsiveness
All major layouts (admin list, client portal, dashboard, request card, demo) collapse cleanly below 1024px / 640px breakpoints. Tabs scroll horizontally when too many to fit.

### Demo Environment (`/demo`)
A fully interactive demo with local state — clients can:
- Submit new requests (added to local state)
- Upload brand assets (simulated)
- See tentative due dates
- Reset to initial sample data anytime

Useful for tutorial recordings.

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://symphony.interlude.studio

# Optional but recommended
NOTION_API_KEY=secret_...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

See `.env.example` for the template and setup instructions for Notion / Slack.

## Common Tasks

### Add a new field to requests
1. Add column in a new migration file (e.g., `012_my_field.sql`)
2. Update `app/api/requests/[id]/route.js` PATCH handler
3. Update `app/api/requests/route.js` POST handler if it should be set on creation
4. Update `RequestCard.js` for display/edit
5. Update Notion sync in `lib/notion.js` if it should propagate

### Add a new field to clients
1. Add column in a new migration file
2. Update `app/api/clients/[id]/route.js` PATCH handler
3. Update `AdminClientDashboard.js` settings panel
4. Update `AdminClientList.js` if it should display in the list

### Add a new request type
- Update `lib/supabase.js` → `requestTypes` array
- The new type automatically appears in all forms and request cards

### Add a new client tag
- Add to the `<select>` in `AdminClientDashboard.js` (search for `clientTag`)
- Update the badge rendering in `AdminClientList.js` (search for `client_tag`)

### Modify Notion sync behavior
- Page creation: `lib/notion.js` → `createNotionPage()`
- Page updates: `lib/notion.js` → `updateNotionPage()`
- Property names must match the actual Notion DB schema (Task name, Status, Priority, Hours, Client, Timeline, Completed on)

## Styling Conventions

- Primary brand color: `#8B7355` (warm brown)
- Background: `#F5F0EB` (warm cream)
- Cards: White with subtle shadow
- Font: Playfair Display (serif) for headings, system sans for body
- Use Tailwind utility classes; keep custom CSS minimal
- Mobile-first: use `sm:` (640px), `md:` (768px), `lg:` (1024px) breakpoints

## API Patterns

All API routes follow this pattern:
```javascript
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const updates = {}
    if (body.fieldName !== undefined) updates.db_column = body.fieldName

    const { data, error } = await supabase
      .from('table')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
```

## Running Locally

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                   # opens at http://localhost:3000
```

## Deployment

- Push to GitHub → Vercel auto-deploys from `main`
- Database changes: run migrations manually in Supabase SQL Editor (in numeric order)
- Storage bucket `request-files` is auto-created by `/api/upload` on first use

## Common Gotchas

- **Notion "column does not exist"** — usually means a property name in `lib/notion.js` doesn't match the actual Notion DB. The actual schema uses `Task name`, `Timeline` (not `Initial Start Date` / `Initial Due Date`), and `Due Date` is a read-only formula.
- **Notion blocks rejected** — `null` values on block content (e.g., `icon: null`) are rejected by the API. The `stripNulls` helper in `lib/notion.js` handles this when copying template blocks.
- **`relation "clients" does not exist`** in SQL Editor — prefix with `public.`: `ALTER TABLE public.clients ...`
- **Supabase column not found** — make sure the migration was run AND the Supabase schema cache is up to date (sometimes refreshing the dashboard helps)
