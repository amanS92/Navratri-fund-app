const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const postgres = Boolean(process.env.DATABASE_URL);
let db;

if (postgres) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 5
  });
  const convertPlaceholders = sql => {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  };
  db = {
    pool,
    async get(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return result.rows[0];
    },
    async all(sql, params = []) {
      const result = await pool.query(convertPlaceholders(sql), params);
      return result.rows;
    },
    async run(sql, params = []) {
      const statement = /^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)
        ? `${sql} RETURNING id`
        : sql;
      const result = await pool.query(convertPlaceholders(statement), params);
      return { lastInsertRowid: result.rows[0]?.id };
    },
    async exec(sql) { return pool.query(sql); }
  };
} else {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'navratri_fund.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  db = {
    async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
    async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
    async run(sql, params = []) { return sqlite.prepare(sql).run(...params); },
    exec(sql) { return sqlite.exec(sql); }
  };
}

async function initialize() {
  if (postgres) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','user')),
        contributor_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS contributors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "session" (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);
    `);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','user')),
        contributor_id INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS contributors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
  }

  const adminCount = await db.get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
  if (Number(adminCount.c) === 0) {
    if (postgres && !process.env.ADMIN_PASSWORD) {
      throw new Error('Set ADMIN_PASSWORD before initializing the hosted database.');
    }
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    await db.run("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')", [
      'Administrator', 'admin', hash
    ]);
    console.log('Seeded initial admin account -> username: admin (change this password after first login)');
  }
}

module.exports = { ...db, initialize, pool: postgres ? db.pool : null, postgres };
