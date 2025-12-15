import sqlite3 from "sqlite3";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const usePg = Boolean(process.env.DATABASE_URL);
const dbFile = process.env.DB_FILE || path.join(process.cwd(), "data.sqlite");
const db = usePg ? null : new sqlite3.Database(dbFile);
const pool = usePg ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

export function init() {
  if (!usePg) {
    db.serialize(() => {
      db.run(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE, email TEXT, optin INTEGER, tags TEXT, status TEXT, created_at TEXT)"
      );
      db.run(
        "CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, template TEXT, segment TEXT, status TEXT, created_at TEXT)"
      );
      db.run(
        "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT, user_id INTEGER, campaign_id INTEGER, status TEXT, created_at TEXT)"
      );
    });
  } else {
    const q = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        phone TEXT UNIQUE,
        email TEXT,
        optin INTEGER,
        tags TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT,
        template TEXT,
        segment TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        external_id TEXT,
        user_id INTEGER,
        campaign_id INTEGER,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`;
    return pool.query(q);
  }
}

export function upsertUser(u) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        "INSERT INTO users (name, phone, email, optin, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name, email=excluded.email, optin=excluded.optin, tags=excluded.tags, status=excluded.status",
        [u.name || "", u.phone, u.email || null, u.optin ? 1 : 0, u.tags || "", u.status || "", now],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  } else {
    const q = `INSERT INTO users (name, phone, email, optin, tags, status) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, optin=EXCLUDED.optin, tags=EXCLUDED.tags, status=EXCLUDED.status RETURNING id`;
    const vals = [u.name || "", u.phone, u.email || null, u.optin ? 1 : 0, u.tags || "", u.status || ""];
    return pool.query(q, vals).then(r => r.rows[0]?.id);
  }
}

export function getUsers() {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM users ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  } else {
    return pool.query("SELECT * FROM users ORDER BY created_at DESC").then(r => r.rows);
  }
}

export function findUserByPhone(phone) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  } else {
    return pool.query("SELECT * FROM users WHERE phone = $1", [phone]).then(r => r.rows[0] || null);
  }
}

export function setOptinByPhone(phone, optin) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE users SET optin = ? WHERE phone = ?", [optin ? 1 : 0, phone], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  } else {
    return pool.query("UPDATE users SET optin = $1 WHERE phone = $2", [optin ? 1 : 0, phone]).then(r => r.rowCount);
  }
}

export function insertCampaign(c) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        "INSERT INTO campaigns (name, template, segment, status, created_at) VALUES (?, ?, ?, ?, ?)",
        [c.name, c.template, JSON.stringify(c.segment || {}), c.status || "draft", now],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  } else {
    const q = "INSERT INTO campaigns (name, template, segment, status) VALUES ($1,$2,$3,$4) RETURNING id";
    return pool.query(q, [c.name, c.template, JSON.stringify(c.segment || {}), c.status || "draft"]).then(r => r.rows[0]?.id);
  }
}

export function getCampaign(id) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM campaigns WHERE id = ?", [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  } else {
    return pool.query("SELECT * FROM campaigns WHERE id = $1", [id]).then(r => r.rows[0] || null);
  }
}

export function updateCampaignStatus(id, status) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE campaigns SET status = ? WHERE id = ?", [status, id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  } else {
    return pool.query("UPDATE campaigns SET status = $1 WHERE id = $2", [status, id]).then(r => r.rowCount);
  }
}

export function selectUsersBySegment(segment) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      const clauses = [];
      const params = [];
      clauses.push("optin = 1");
      if (segment?.status) {
        clauses.push("status = ?");
        params.push(segment.status);
      }
      if (segment?.tags) {
        clauses.push("tags LIKE ?");
        params.push(`%${segment.tags}%`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      db.all(`SELECT * FROM users ${where}`, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  } else {
    const clauses = ["optin = 1"];
    const params = [];
    if (segment?.status) {
      clauses.push("status = $" + (params.length + 1));
      params.push(segment.status);
    }
    if (segment?.tags) {
      clauses.push("tags LIKE $" + (params.length + 1));
      params.push(`%${segment.tags}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return pool.query(`SELECT * FROM users ${where}`, params).then(r => r.rows);
  }
}

export function insertMessage(m) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.run(
        "INSERT INTO messages (external_id, user_id, campaign_id, status, created_at) VALUES (?, ?, ?, ?, ?)",
        [m.external_id || null, m.user_id, m.campaign_id || null, m.status, now],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  } else {
    const q = "INSERT INTO messages (external_id, user_id, campaign_id, status) VALUES ($1,$2,$3,$4) RETURNING id";
    return pool.query(q, [m.external_id || null, m.user_id, m.campaign_id || null, m.status]).then(r => r.rows[0]?.id);
  }
}

export function updateMessageStatusByExternalId(externalId, status) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE messages SET status = ? WHERE external_id = ?",
        [status, externalId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  } else {
    return pool.query("UPDATE messages SET status = $1 WHERE external_id = $2", [status, externalId]).then(r => r.rowCount);
  }
}

export function stats() {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM campaigns WHERE status = 'active') AS active_campaigns, (SELECT COUNT(*) FROM messages WHERE status = 'replied') AS open_conversations",
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows[0]);
        }
      );
    });
  } else {
    const q = "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM campaigns WHERE status = 'active') AS active_campaigns, (SELECT COUNT(*) FROM messages WHERE status = 'replied') AS open_conversations";
    return pool.query(q).then(r => r.rows[0]);
  }
}

export function messageCountsByCampaign(campaignId) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT status, COUNT(*) as count FROM messages WHERE campaign_id = ? GROUP BY status",
        [campaignId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  } else {
    return pool.query("SELECT status, COUNT(*) as count FROM messages WHERE campaign_id = $1 GROUP BY status", [campaignId]).then(r => r.rows);
  }
}

export function inbox(limit = 50) {
  if (!usePg) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT m.id, m.status, m.created_at, u.name, u.phone FROM messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.status = 'replied' ORDER BY m.created_at DESC LIMIT ?",
        [limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  } else {
    return pool
      .query(
        "SELECT m.id, m.status, m.created_at, u.name, u.phone FROM messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.status = 'replied' ORDER BY m.created_at DESC LIMIT $1",
        [limit]
      )
      .then((r) => r.rows);
  }
}
