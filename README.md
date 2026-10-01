# Navratri Fund Manager

A real full-stack web app for managing Navratri festival fund collections and expenses:
Node.js + Express backend, SQLite database (file-based, no separate server to install),
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

## Deploying it to Render

The included `render.yaml` configures a hosted Node service, HTTPS-aware login
cookies, generated secrets, and a persistent disk for the SQLite database. The
persistent disk requires Render's paid Starter plan; without persistent storage,
the database can be lost when the service restarts.

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and apply the
  `render.yaml` blueprint. Render will build and deploy the app and provide a
  public `onrender.com` URL that works from other devices while the service is up.
3. In the Render service's environment settings, retrieve the generated
  `ADMIN_PASSWORD` value. Log in with username `admin` and that password, then
  change the password from **Account**. Do not share the initial password.

The database is stored at `/var/data/navratri_fund.db` on the attached persistent
disk. Keep that disk attached when changing service settings or redeploying.
Local development still uses `navratri_fund.db` in the project folder and the
default local login `admin` / `admin123`.

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
