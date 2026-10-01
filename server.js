const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const production = process.env.NODE_ENV === 'production';

if (production && (!process.env.DATABASE_URL || !process.env.SESSION_SECRET)) {
  throw new Error('Production requires DATABASE_URL and SESSION_SECRET environment variables.');
}

if (production) app.set('trust proxy', 1);
app.use(express.json());
const databaseReady = db.initialize();
app.use((req, res, next) => databaseReady.then(() => next()).catch(next));
const sessionStore = db.postgres
  ? new (connectPgSimple(session))({ pool: db.pool, createTableIfMissing: false })
  : undefined;
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));
if (!process.env.VERCEL) app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---------- Auth helpers ----------
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
function publicUser(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role, contributor_id: u.contributor_id };
}

// ---------- Auth routes ----------
app.post('/api/login', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.user = publicUser(user);
  res.json({ user: req.session.user });
}));

app.post('/api/guest-login', (req, res) => {
  req.session.user = { id: null, name: 'Guest viewer', username: null, role: 'viewer', contributor_id: null };
  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/change-password', requireLogin, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  res.json({ ok: true });
}));

// ---------- Summary ----------
app.get('/api/summary', requireLogin, asyncRoute(async (req, res) => {
  const [collectedRow, spentRow, countRow] = await Promise.all([
    db.get('SELECT COALESCE(SUM(amount),0) AS t FROM contributors'),
    db.get('SELECT COALESCE(SUM(amount),0) AS t FROM expenses'),
    db.get('SELECT COUNT(*) AS c FROM contributors')
  ]);
  const collected = Number(collectedRow.t);
  const spent = Number(spentRow.t);
  res.json({ collected, spent, balance: collected - spent, contributorCount: Number(countRow.c) });
}));

// ---------- Contributors ----------
app.get('/api/contributors', requireLogin, asyncRoute(async (req, res) => {
  const rows = await db.all('SELECT * FROM contributors ORDER BY date DESC, id DESC');
  res.json(rows);
}));

app.post('/api/contributors', requireAdmin, asyncRoute(async (req, res) => {
  const { name, amount, date, createAccount, username, password } = req.body || {};
  if (!name || !amount || !date) return res.status(400).json({ error: 'Name, amount, and date are required' });

  const info = await db.run(
    'INSERT INTO contributors (name, amount, date) VALUES (?, ?, ?)',
    [name, Number(amount), date]
  );
  const contributorId = info.lastInsertRowid;

  if (createAccount) {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required to create an account' });
    }
    const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) return res.status(409).json({ error: 'Username already taken' });
    const hash = bcrypt.hashSync(password, 10);
    const uInfo = await db.run(
      'INSERT INTO users (name, username, password_hash, role, contributor_id) VALUES (?, ?, ?, ?, ?)',
      [name, username, hash, 'user', contributorId]
    );
    await db.run('UPDATE contributors SET user_id = ? WHERE id = ?', [uInfo.lastInsertRowid, contributorId]);
  }

  res.status(201).json(await db.get('SELECT * FROM contributors WHERE id = ?', [contributorId]));
}));

app.put('/api/contributors/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { name, amount, date } = req.body || {};
  const existing = await db.get('SELECT * FROM contributors WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Contributor not found' });
  await db.run('UPDATE contributors SET name = ?, amount = ?, date = ? WHERE id = ?', [
    name ?? existing.name, amount != null ? Number(amount) : existing.amount, date ?? existing.date, req.params.id
  ]);
  res.json(await db.get('SELECT * FROM contributors WHERE id = ?', [req.params.id]));
}));

app.delete('/api/contributors/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM contributors WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Contributor not found' });
  await db.run('DELETE FROM contributors WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Expenses ----------
app.get('/api/expenses', requireLogin, asyncRoute(async (req, res) => {
  const rows = await db.all('SELECT * FROM expenses ORDER BY date DESC, id DESC');
  res.json(rows);
}));

app.post('/api/expenses', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description, amount, date } = req.body || {};
  if (!title || !amount || !date) return res.status(400).json({ error: 'Title, amount, and date are required' });
  const info = await db.run(
    'INSERT INTO expenses (title, description, amount, date, created_by) VALUES (?, ?, ?, ?, ?)',
    [title, description || '', Number(amount), date, req.session.user.id]
  );
  res.status(201).json(await db.get('SELECT * FROM expenses WHERE id = ?', [info.lastInsertRowid]));
}));

app.put('/api/expenses/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description, amount, date } = req.body || {};
  const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  await db.run('UPDATE expenses SET title = ?, description = ?, amount = ?, date = ? WHERE id = ?', [
    title ?? existing.title, description ?? existing.description,
    amount != null ? Number(amount) : existing.amount, date ?? existing.date, req.params.id
  ]);
  res.json(await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
}));

app.delete('/api/expenses/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Users (admin only, for managing contributor logins) ----------
app.get('/api/users', requireAdmin, asyncRoute(async (req, res) => {
  const rows = await db.all('SELECT id, name, username, role, contributor_id FROM users ORDER BY id');
  res.json(rows);
}));

app.delete('/api/users/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (!process.env.VERCEL) databaseReady.then(() => {
  app.listen(PORT, () => {
    console.log(`Navratri Fund Manager running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
