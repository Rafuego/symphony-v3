# Symphony by Interlude

A secure client request management dashboard for design-as-a-service operations. Built with Next.js 14 and Supabase.

## Features

- **Client Management**: Create and manage multiple client accounts
- **Request Tracking**: Submit, prioritize, and track design requests
- **48-Hour Timer**: Visual countdown for active requests with extension support
- **Custom Plans**: Flexible pricing and capacity configuration per client
- **Secure Client Portals**: Password-protected access links for each client
- **Auto-Queue Promotion**: Automatically starts next request when capacity opens

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Deployment**: Vercel

---

## Setup Guide

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (~2 minutes)
3. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this private!)

### 2. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run** to execute the migration
4. This creates all tables, indexes, RLS policies, and functions

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Install Dependencies & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to the admin dashboard.

---

## Deploy to Vercel

### Option A: One-Click Deploy

1. Push this code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel domain)
5. Click **Deploy**

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts and add environment variables when asked.

---

## Usage

### Admin Dashboard (`/admin`)

- View all client accounts
- Create new clients with custom plans
- Copy secure client portal links
- Manage requests, statuses, and files
- Configure plan pricing and capacity

### Client Portal (`/portal/[token]`)

- Secure access via unique token URL
- Optional password protection
- Submit new design requests
- Reorder queue priority
- View request status and files
- Request plan changes via email

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | Supabase Auth (admin) + Token-based (clients) |
| Password Hashing | bcrypt (12 rounds) |
| Access Control | Row Level Security (RLS) policies |
| Client Links | UUID v4 tokens (unguessable) |
| API Security | Server-side validation, service role keys |

---

## Database Schema

### Tables

- `clients` - Client accounts with plan configuration
- `requests` - Design requests with status and priority
- `request_files` - Files attached to requests
- `admin_users` - Admin user accounts (linked to Supabase Auth)

### Key Columns

**clients**
- `access_token` - UUID for client portal URLs
- `password_hash` - bcrypt hashed password
- `custom_price`, `custom_max_active`, `custom_designers` - Plan overrides

**requests**
- `status` - in-queue, in-progress, in-review, completed
- `priority` - Queue position (lower = higher priority)
- `started_at` - Timestamp for 48hr timer

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create new client |
| GET | `/api/clients/[id]` | Get client with requests |
| PATCH | `/api/clients/[id]` | Update client |
| DELETE | `/api/clients/[id]` | Delete client |
| POST | `/api/requests` | Create new request |
| PATCH | `/api/requests/[id]` | Update request |
| DELETE | `/api/requests/[id]` | Delete request |
| POST | `/api/requests/[id]/files` | Add file to request |
| POST | `/api/requests/reorder` | Reorder queue priority |
| POST | `/api/client/verify` | Verify client portal access |

---

## Adding Admin Authentication (Optional)

For production, you may want to protect the `/admin` route:

1. **Enable Supabase Auth** in your project
2. **Create admin users** via Supabase dashboard
3. **Add to `admin_users` table**:
   ```sql
   INSERT INTO admin_users (id, email) 
   VALUES ('user-uuid-from-auth', 'admin@interlude.studio');
   ```
4. **Add middleware** to check auth on admin routes

---

## Customization

### Branding

Edit `tailwind.config.js` to change colors:
```js
colors: {
  'symphony-gold': '#8B7355',  // Accent color
  'symphony-cream': '#F5F0EB', // Background
}
```

### Plan Defaults

Edit `lib/supabase.js` to change default plan configurations:
```js
export const planConfig = {
  launch: { defaultPrice: 2000, defaultMaxActive: 1, ... },
  growth: { defaultPrice: 3500, defaultMaxActive: 3, ... },
  scale: { defaultPrice: 5000, defaultMaxActive: 5, ... }
}
```

---

## Support

For issues or questions, contact [hello@interlude.studio](mailto:hello@interlude.studio)
