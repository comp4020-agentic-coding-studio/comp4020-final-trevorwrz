import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface Vent {
  id: number;
  course: string;
  body: string;
  createdAt: string;
  resonanceCount: number;
  resonatedByVisitor: boolean;
}

const dataDir = process.env.DATA_DIR ?? "./data";
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "app.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS vents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS resonances (
    vent_id INTEGER NOT NULL REFERENCES vents(id),
    visitor_id TEXT NOT NULL,
    PRIMARY KEY (vent_id, visitor_id)
  );
`);

const insertVent = db.prepare(
  "INSERT INTO vents (course, body, created_at) VALUES (?, ?, ?)",
);

const insertResonance = db.prepare(
  "INSERT OR IGNORE INTO resonances (vent_id, visitor_id) VALUES (?, ?)",
);

const selectVents = db.prepare(`
  SELECT
    v.id AS id,
    v.course AS course,
    v.body AS body,
    v.created_at AS createdAt,
    COUNT(r.visitor_id) AS resonanceCount,
    MAX(CASE WHEN r.visitor_id = ? THEN 1 ELSE 0 END) AS resonatedByVisitor
  FROM vents v
  LEFT JOIN resonances r ON r.vent_id = v.id
  GROUP BY v.id
  ORDER BY resonanceCount DESC, v.created_at DESC
`);

export function listVents(visitorId: string): Vent[] {
  const rows = selectVents.all(visitorId) as Array<{
    id: number;
    course: string;
    body: string;
    createdAt: string;
    resonanceCount: number;
    resonatedByVisitor: number;
  }>;
  return rows.map((row) => ({
    ...row,
    resonatedByVisitor: row.resonatedByVisitor === 1,
  }));
}

export function createVent(course: string, body: string): void {
  insertVent.run(course, body, new Date().toISOString());
}

export function addResonance(ventId: number, visitorId: string): void {
  insertResonance.run(ventId, visitorId);
}
