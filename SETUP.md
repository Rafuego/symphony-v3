# Symphony Setup Guide

A complete first-time setup guide for getting Symphony running locally and deployed to production. Follow these in order.

---

## Prerequisites

- Node.js 18+ and npm
- A Supabase account
- A Notion account (optional but recommended)
- A Slack workspace (optional)
- A Vercel account (for deployment)

---

## 1. Supabase Setup

### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose any region close to your users
3. Save the database password somewhere safe
4. Wait ~2 minutes for provisioning

### Get API Keys
Go to **Project Settings → API** and copy:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (treat like a password)

### Run Database Migrations

In Supabase Dashboard → **SQL Editor**, run each migration **in order**:

1. `supabase/migrations/001_initial_schema.sql` — clients, requests, request_files, admin_users tables + RLS policies
2. `supabase/migrations/002_add_request_type_and_links.sql` — request_type and links columns
3. `supabase/migrations/003_notifications.sql` — notifications table
4. `supabase/migrations/004_brand_assets_deliverables.sql` — brand assets and deliverables
5. `supabase/migrations/005_notion_integration.sql` — notion_database_id, notion_page_id
6. `supabase/migrations/006_notion_project_id.sql` — Notion Client relation
7. `supabase/migrations/007_client_tag.sql` — Symphony / Legacy Drip tag
8. `supabase/migrations/008_pending_deals.sql` — pending_deals table
9. `supabase/migrations/009_notion_template_id.sql` — per-client Notion templates
10. `supabase/migrations/010_requested_due_date.sql` — tentative due dates
11. `supabase/migrations/011_client_status.sql` — pause / resume clients

**Tip:** If you get `relation "X" does not exist`, prefix the table name with `public.`:
```sql
ALTER TABLE public.clients ADD COLUMN ...
```

### Storage Bucket
The `request-files` storage bucket is auto-created by `/api/upload` on first upload. No manual setup needed — but if you want it public from the start:
1. Storage → Create bucket `request-files` → Public

---

## 2. Notion Setup (Optional but Recommended)

Symphony creates a Notion page for every request and syncs status updates back. Skip this if you don't use Notion.

### Create the Tasks Database

You need one Notion database called "Tasks" with these properties (exact names matter — Notion API is strict):

| Property Name | Type |
|---------------|------|
| Task name | Title |
| Status | Status (with options: Not Started, In Progress, Client Review, Completed) |
| Priority | Select (with options: High, Medium, Low) |
| Hours | Rich text |
| Timeline | Date (with end date enabled) |
| Completed on | Date |
| Client | Relation (to your Projects database, optional) |

The default global Tasks DB ID hardcoded in `lib/notion.js` is `24e866d074498154a2a2ca1cd1768b41`. **Change this** to your own Tasks DB ID, or override per-client via the `notion_database_id` column.

### Get the Tasks DB ID
Open your Tasks database in Notion → click `...` → Copy link. The ID is the long string in the URL (32 hex characters).

Update `lib/notion.js`:
```javascript
export const DEFAULT_NOTION_DATABASE_ID = 'your-tasks-db-id-here'
```

### Create Notion Integration
1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click **New integration**
3. Name it "Symphony"
4. Choose your workspace
5. Capabilities: read, update, insert content
6. Copy the **Internal Integration Token** → `NOTION_API_KEY`

### Share Pages with the Integration
For each database/page Symphony needs to access:
1. Open the page in Notion
2. Click `...` → **Connections** → Add your "Symphony" integration

Share at minimum: the Tasks database. If using the Client relation, also share the Projects database. If using per-client templates, also share each template page.

### Per-Client Templates (Optional)
You can configure a Notion template page for each client. Symphony will copy the template's content into every new task page for that client.

In Symphony admin → client Settings → Notion Integration → paste the template page ID. Get the ID from the URL of the template page in Notion (the 32-char hex string).

---

## 3. Slack Setup (Optional)

Symphony posts a notification to Slack when a new request is created.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. Choose **From scratch** → name it "Symphony" → pick your workspace
3. Sidebar → **Incoming Webhooks** → toggle on
4. **Add New Webhook to Workspace** → choose the channel
5. Copy the webhook URL → `SLACK_WEBHOOK_URL`

---

## 4. Local Environment

```bash
git clone <repo-url>
cd symphony-app
npm install
cp .env.example .env.local
```

Edit `.env.local` with your real values (see `.env.example` for the template).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/admin`.

---

## 5. Deploy to Vercel

### Push to GitHub
```bash
git remote add origin git@github.com:your-org/symphony.git
git push -u origin main
```

### Connect to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add environment variables (copy from `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — your production URL (e.g., `https://symphony.yourdomain.com`)
   - `NOTION_API_KEY` (if using)
   - `SLACK_WEBHOOK_URL` (if using)
5. Deploy

### Custom Domain
Vercel → Project → Settings → Domains → Add. Update DNS, then update `NEXT_PUBLIC_APP_URL` to match.

---

## 6. Post-Setup

### Create Your First Client
1. Go to `/admin`
2. Click **+ New Client**
3. Name it, choose a plan, optionally set a password
4. Click the row → settings → optional Notion config

### Test the Client Portal
1. Click **🔗 Copy Link** on a client row
2. Open the link in an incognito window
3. Submit a test request
4. Verify:
   - The request appears in `/admin`
   - A Notion page was created (if configured)
   - A Slack message was posted (if configured)

---

## Customization

### Branding
Edit `tailwind.config.js` colors:
```js
colors: {
  'symphony-gold': '#8B7355',
  'symphony-cream': '#F5F0EB',
}
```

### Plan Defaults
Edit `lib/supabase.js`:
```javascript
export const planConfig = {
  launch: { defaultPrice: 2000, defaultMaxActive: 1, defaultDesigners: '1', ... },
  growth: { defaultPrice: 3500, defaultMaxActive: 3, defaultDesigners: '2', ... },
  scale:  { defaultPrice: 5000, defaultMaxActive: 5, defaultDesigners: '3-4', ... }
}
```

### Request Types
Edit the `requestTypes` array in `lib/supabase.js`:
```javascript
export const requestTypes = [
  { id: 'brand', label: 'Brand', emoji: '🎨' },
  // ... add or modify
]
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `relation "clients" does not exist` in SQL Editor | Prefix with `public.`: `ALTER TABLE public.clients ...` |
| `Could not find the 'X' column of 'clients' in the schema cache` | Migration didn't run; re-run it. If it ran, refresh Supabase dashboard to clear schema cache. |
| Notion page not created | Check Vercel logs for `Notion result`. Common causes: API key not set, integration not shared with the page, property name mismatch. |
| Notion error: `'Initial Start Date' is not a property` | Your Notion DB schema doesn't match — check property names (use `Timeline`, not `Initial Start Date`). |
| Notion error: `body failed validation: paragraph.icon should be...` | A null value in a template block. The `stripNulls` helper handles this. Make sure `lib/notion.js` is up to date. |
| File upload fails with "Request Entity Too Large" | The signed URL upload should bypass this. Check that `lib/uploadFile.js` is being used and `/api/upload` returns a signed URL. |

---

## Useful Files for Future Claude Code Sessions

When opening this project in a new Claude account:

1. **`CLAUDE.md`** — full project architecture and conventions (Claude reads this automatically)
2. **`README.md`** — high-level overview and links
3. **`SETUP.md`** — this file
4. **`.env.example`** — env var template with comments

Just paste the repo URL into a new Claude Code session — it'll pick up CLAUDE.md and have full context immediately.
