const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.status(200).send('ok'));

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
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.user = publicUser(user);
  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/change-password', requireLogin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

// ---------- Summary ----------
app.get('/api/summary', requireLogin, (req, res) => {
  const collected = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM contributors').get().t;
  const spent = db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM expenses').get().t;
  const count = db.prepare('SELECT COUNT(*) AS c FROM contributors').get().c;
  res.json({ collected, spent, balance: collected - spent, contributorCount: count });
});

// ---------- Contributors ----------
app.get('/api/contributors', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT * FROM contributors ORDER BY date DESC, id DESC').all();
  res.json(rows);
});

app.post('/api/contributors', requireAdmin, (req, res) => {
  const { name, amount, date, createAccount, username, password } = req.body || {};
  if (!name || !amount || !date) return res.status(400).json({ error: 'Name, amount, and date are required' });

  const insertContributor = db.prepare(
    'INSERT INTO contributors (name, amount, date) VALUES (?, ?, ?)'
  );
  const info = insertContributor.run(name, Number(amount), date);
  const contributorId = info.lastInsertRowid;

  if (createAccount) {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required to create an account' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'Username already taken' });
    const hash = bcrypt.hashSync(password, 10);
    const uInfo = db.prepare(
      'INSERT INTO users (name, username, password_hash, role, contributor_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, username, hash, 'user', contributorId);
    db.prepare('UPDATE contributors SET user_id = ? WHERE id = ?').run(uInfo.lastInsertRowid, contributorId);
  }

  res.status(201).json(db.prepare('SELECT * FROM contributors WHERE id = ?').get(contributorId));
});

app.put('/api/contributors/:id', requireAdmin, (req, res) => {
  const { name, amount, date } = req.body || {};
  const existing = db.prepare('SELECT * FROM contributors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contributor not found' });
  db.prepare('UPDATE contributors SET name = ?, amount = ?, date = ? WHERE id = ?').run(
    name ?? existing.name, amount != null ? Number(amount) : existing.amount, date ?? existing.date, req.params.id
  );
  res.json(db.prepare('SELECT * FROM contributors WHERE id = ?').get(req.params.id));
});

app.delete('/api/contributors/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM contributors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contributor not found' });
  db.prepare('DELETE FROM contributors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Expenses ----------
app.get('/api/expenses', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
  res.json(rows);
});

app.post('/api/expenses', requireAdmin, (req, res) => {
  const { title, description, amount, date } = req.body || {};
  if (!title || !amount || !date) return res.status(400).json({ error: 'Title, amount, and date are required' });
  const info = db.prepare(
    'INSERT INTO expenses (title, description, amount, date, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description || '', Number(amount), date, req.session.user.id);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/expenses/:id', requireAdmin, (req, res) => {
  const { title, description, amount, date } = req.body || {};
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  db.prepare('UPDATE expenses SET title = ?, description = ?, amount = ?, date = ? WHERE id = ?').run(
    title ?? existing.title, description ?? existing.description,
    amount != null ? Number(amount) : existing.amount, date ?? existing.date, req.params.id
  );
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
});

app.delete('/api/expenses/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Users (admin only, for managing contributor logins) ----------
app.get('/api/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, name, username, role, contributor_id FROM users ORDER BY id').all();
  res.json(rows);
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Navratri Fund Manager running at http://localhost:${PORT}`);
});
