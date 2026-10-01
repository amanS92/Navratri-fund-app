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

## Free hosting with Render and Neon

The included `render.yaml` configures a free Render web service. Render's free
filesystem is temporary, so the hosted app uses a Neon PostgreSQL database via
`DATABASE_URL`; local development continues to use SQLite.

1. Create a Neon project on its Free plan and copy its PostgreSQL connection
  string. Neon currently lists a permanent $0 plan with usage limits; review its
  current limits and backup options before using it for important records.
2. In Render, choose **New → Blueprint**, connect this GitHub repository, and
  apply the `render.yaml` blueprint. Paste the Neon connection string when
  prompted for `DATABASE_URL`; Render generates the session and initial admin
  passwords.
3. Wait for the deploy, then retrieve the generated `ADMIN_PASSWORD` from the
  Render service's environment settings. Log in as `admin` and change that
  password immediately.

Both providers' free plans have limits. Render free web services spin down after
15 minutes idle and can take about a minute to wake. Neon Free compute scales to
zero while idle and has storage and usage limits. The database persists across
Render restarts, but free services are intended for small projects and do not
provide a production uptime guarantee. Local development uses
`navratri_fund.db` and the default login `admin` / `admin123`.

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
