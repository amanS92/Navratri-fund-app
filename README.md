# Navratri Fund Manager

A real full-stack web app for managing Navratri festival fund collections and expenses:
Node.js + Express backend, SQLite for local development and PostgreSQL for hosting,
password-based login with role-based access control enforced on the backend.

## Setup

Requires [Node.js](https://nodejs.org) 18 or later.

```bash
cd navratri-fund-app
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

On first run the app creates `navratri_fund.db` (SQLite) automatically and seeds one
admin account:

- **Username:** `admin`
- **Password:** `admin123`

Log in and change this password immediately (Account tab → Change Password).

## How it works

- **Admin** accounts can add/edit/delete contributors and expenses, and manage login
  accounts (Account tab → Login Accounts).
- **User** accounts (one per contributor, created by the admin when adding a
  contributor) are read-only: the UI hides edit/delete controls, and the backend
  also rejects any write request from a non-admin session — so permissions can't be
  bypassed by editing the page or calling the API directly.
- Remaining balance is never stored — it's always computed on the server as
  `SUM(contributions) − SUM(expenses)`.
- A contributor's own row is highlighted when they're logged in under their linked
  account.

## Free hosting with Vercel and Neon

Vercel runs the Express API as a serverless function and serves files in `public/`
from its CDN. Hosted API data and login sessions use Neon PostgreSQL through
`DATABASE_URL`; local development continues to use SQLite.

1. Create a Neon project and copy its pooled PostgreSQL connection string. Keep
the connection string private.
2. Import this GitHub repository into Vercel. Set the project root to the repo
root and keep the detected Express framework settings.
3. Add these Production environment variables in Vercel, then redeploy:
  `DATABASE_URL` (Neon connection string), `SESSION_SECRET` (a long random
  secret), and `ADMIN_PASSWORD` (a new strong initial admin password).
  `NODE_ENV` is supplied by Vercel for production deployments.
4. Open the deployment URL and log in as `admin` with `ADMIN_PASSWORD`. Change
  the password immediately from **Account**.

Neon's Free plan is currently $0 with usage limits (including 0.5 GB storage and
limited compute). Vercel Hobby is currently $0 for personal, non-commercial use;
check that its terms fit your use. Both plans have usage limits and are not a
production uptime guarantee. The current local SQLite data is not automatically
copied into Neon. Local development uses `navratri_fund.db` and the default login
`admin` / `admin123`.

## Project structure

```
navratri-fund-app/
├── server.js        # Express app + all API routes + auth
├── db.js            # SQLite schema + seeds default admin
├── package.json
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js        # frontend logic (fetch-based, no build step)
└── navratri_fund.db  # created automatically on first run
```

No build tools, bundlers, or frontend framework needed — it's plain HTML/CSS/JS
talking to a small REST API.
