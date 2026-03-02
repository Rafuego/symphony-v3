# Symphony by Interlude - Claude Code Project Guide

## Project Overview

Symphony is a client request management dashboard for a design-as-a-service business (Interlude Studio). It allows clients to submit design requests and track their progress, while admins manage the workflow.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Storage**: Supabase Storage (for file uploads)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Project Structure

```
symphony-app/
├── app/                      # Next.js App Router
│   ├── page.js              # Landing/redirect page
│   ├── layout.js            # Root layout with fonts
│   ├── globals.css          # Global styles + Tailwind
│   ├── admin/
│   │   └── page.js          # Admin dashboard entry
│   ├── portal/
│   │   └── [token]/
│   │       └── page.js      # Client portal (public URL)
│   └── api/
│       ├── clients/
│       │   ├── route.js     # GET all, POST new client
│       │   └── [id]/
│       │       └── route.js # GET, PATCH, DELETE client
│       ├── requests/
│       │   ├── route.js     # POST new request
│       │   ├── [id]/
│       │   │   ├── route.js # PATCH request (status, extensions, etc.)
│       │   │   └── files/
│       │   │       └── route.js # POST working files
│       │   └── reorder/
│       │       └── route.js # POST reorder queue
│       ├── upload/
│       │   └── route.js     # POST file upload to Supabase Storage
│       ├── notifications/
│       │   └── route.js     # GET, PATCH notifications
│       └── client/
│           └── verify/
│               └── route.js # POST password verification
├── components/
│   ├── AdminClientList.js   # Client list for admin
│   ├── AdminClientDashboard.js # Single client management (admin)
│   ├── ClientPortal.js      # Client-facing portal
│   ├── RequestCard.js       # Request display with timer, status, files
│   ├── PlanModal.js         # Plan configuration modal
│   ├── PasswordGate.js      # Password protection for client portals
│   └── AlertsPanel.js       # Notifications panel
├── lib/
│   ├── supabase.js          # Supabase client + config constants
│   ├── utils.js             # Business hours timer, markdown renderer
│   ├── slack.js             # Slack webhook notifications
│   └── password.js          # Password hashing utilities
├── supabase/
│   └── migrations/          # SQL migrations (run in order)
│       ├── 001_initial_schema.sql
│       ├── 002_add_request_type_and_links.sql
│       ├── 003_notifications.sql
│       └── 004_brand_assets_deliverables.sql
└── public/
    └── icon.png             # Favicon
```

## Database Schema

### clients
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Client/company name |
| plan | text | 'launch', 'growth', or 'scale' |
| portal_token | text | Unique URL token for client portal |
| logo | text | Logo URL (optional) |
| custom_price | integer | Override plan price |
| custom_max_active | integer | Override max active requests |
| custom_designers | text | Override designer count |
| password_hash | text | Hashed password for portal |
| password_enabled | boolean | Whether password is required |
| brand_assets | jsonb | Array of brand asset objects |
| created_at | timestamp | Creation date |

### requests
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Foreign key to clients |
| title | text | Request title |
| description | text | Request details (supports markdown) |
| status | text | 'in-queue', 'in-progress', 'in-review', 'completed' |
| priority | integer | Queue position (lower = higher priority) |
| request_type | text | 'deck', 'brand', 'social', 'print', 'web', 'misc' |
| links | jsonb | Array of reference URLs |
| attachments | jsonb | Array of uploaded file objects |
| deliverables | jsonb | Array of final deliverable files |
| started_at | timestamp | When moved to in-progress |
| completed_at | timestamp | When marked complete |
| extension_hours | integer | Total extended hours |
| extension_note | text | Reason for extension |
| extension_requested | boolean | Whether extension was requested |
| admin_notes | text | Internal admin notes |
| created_at | timestamp | Submission date |

### request_files
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| request_id | uuid | Foreign key to requests |
| name | text | File name |
| url | text | File URL |
| file_type | text | 'figma' or 'file' |
| created_at | timestamp | Upload date |

### notifications
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Foreign key to clients |
| type | text | Notification type |
| title | text | Notification title |
| message | text | Notification body |
| read | boolean | Read status |
| created_at | timestamp | Creation date |

## Key Features

### Timer System
- 48-hour base deadline (business hours only)
- Skips weekends (Sat/Sun)
- Pauses when status is "In Review"
- Extensions add hours cumulatively
- Admin can reset timer completely

### Status Flow
```
in-queue → in-progress → in-review → completed
              ↑              ↓
              └──────────────┘ (can go back)
```

### Plans
- **Launch**: $4,995/mo, 1 active request, 1 designer
- **Growth**: $9,995/mo, 2 active requests, 2 designers  
- **Scale**: $14,995/mo, 3 active requests, 3 designers

### File Handling
- **Attachments**: Client uploads with request (max 4 files, 25MB each)
- **Working Files**: Admin adds Figma links or files during work
- **Deliverables**: Final files admin uploads when complete
- **Brand Assets**: Persistent client brand files (logos, guidelines, etc.)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://symphony.interlude.studio
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optional)
```

## Common Tasks

### Add a new field to requests
1. Add column in new migration file
2. Update `/api/requests/[id]/route.js` PATCH handler
3. Update `RequestCard.js` to display/edit the field

### Add a new field to clients
1. Add column in new migration file
2. Update `/api/clients/[id]/route.js` PATCH handler
3. Update `AdminClientDashboard.js` and/or `ClientPortal.js`

### Modify the timer behavior
- Timer calculation: `lib/utils.js` → `getBusinessHoursRemaining()`
- Timer display: `components/RequestCard.js` → look for `showTimer`

### Change tab order or add tabs
- Client view: `components/ClientPortal.js` → `tabs` array
- Admin view: `components/AdminClientDashboard.js` → `tabs` array

### Add a new request type
- Update `lib/supabase.js` → `requestTypes` object

### Add a new status
- Update `lib/supabase.js` → `statusConfig` object
- Update filter logic in both portal components

## Styling Conventions

- Primary brand color: `#8B7355` (warm brown)
- Background: `#F5F0EB` (warm cream)
- Cards: White with subtle shadow
- Font: Playfair Display (serif) for headings, system sans for body
- Use Tailwind classes, avoid custom CSS

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
npm run dev
# Opens at http://localhost:3000
```

## Deployment

Push to GitHub → Vercel auto-deploys from main branch.

For database changes, run migrations manually in Supabase SQL Editor.
