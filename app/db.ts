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
  isOwner: boolean;
}

export interface CourseStat {
  course: string;
  ventCount: number;
  totalResonance: number;
}

const dataDir = process.env.DATA_DIR ?? "./data";
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "app.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS vents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    visitor_id TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS resonances (
    vent_id INTEGER NOT NULL REFERENCES vents(id),
    visitor_id TEXT NOT NULL,
    PRIMARY KEY (vent_id, visitor_id)
  );
`);

// `CREATE TABLE IF NOT EXISTS` above is a no-op against the live deploy's
// existing `vents` table (crit 8/9 data already lives in the volume), so the
// new `visitor_id` column needs its own migration — added only if missing,
// so this stays safe to run against a fresh table too.
const ventColumns = db.prepare("PRAGMA table_info(vents)").all() as Array<{ name: string }>;
if (!ventColumns.some((col) => col.name === "visitor_id")) {
  db.exec("ALTER TABLE vents ADD COLUMN visitor_id TEXT NOT NULL DEFAULT ''");
}

const insertVent = db.prepare(
  "INSERT INTO vents (course, body, created_at, visitor_id) VALUES (?, ?, ?, ?)",
);

const insertResonance = db.prepare(
  "INSERT OR IGNORE INTO resonances (vent_id, visitor_id) VALUES (?, ?)",
);

const deleteVentIfOwner = db.prepare(
  "DELETE FROM vents WHERE id = ? AND visitor_id = ?",
);

const deleteResonancesForVent = db.prepare(
  "DELETE FROM resonances WHERE vent_id = ?",
);

const selectVents = db.prepare(`
  SELECT
    v.id AS id,
    v.course AS course,
    v.body AS body,
    v.created_at AS createdAt,
    v.visitor_id AS ventVisitorId,
    COUNT(r.visitor_id) AS resonanceCount,
    MAX(CASE WHEN r.visitor_id = ? THEN 1 ELSE 0 END) AS resonatedByVisitor
  FROM vents v
  LEFT JOIN resonances r ON r.vent_id = v.id
  GROUP BY v.id
  ORDER BY resonanceCount DESC, v.created_at DESC
`);

// Grouped by UPPER(TRIM(course)) rather than the raw column: the course
// field is free text (README's "what's deferred" already flags this), and
// without normalising, "COMP8020" and "comp8020 " would show up as two
// separate rows on a leaderboard where that'd read as a bug, not a quirk.
const selectCourseLeaderboard = db.prepare(`
  SELECT
    UPPER(TRIM(v.course)) AS course,
    COUNT(DISTINCT v.id) AS ventCount,
    COUNT(r.visitor_id) AS totalResonance
  FROM vents v
  LEFT JOIN resonances r ON r.vent_id = v.id
  GROUP BY UPPER(TRIM(v.course))
  ORDER BY totalResonance DESC, ventCount DESC, course ASC
`);

export function listCourseLeaderboard(): CourseStat[] {
  return selectCourseLeaderboard.all() as unknown as CourseStat[];
}

export function listVents(visitorId: string): Vent[] {
  const rows = selectVents.all(visitorId) as Array<{
    id: number;
    course: string;
    body: string;
    createdAt: string;
    ventVisitorId: string;
    resonanceCount: number;
    resonatedByVisitor: number;
  }>;
  return rows.map(({ ventVisitorId, ...row }) => ({
    ...row,
    resonatedByVisitor: row.resonatedByVisitor === 1,
    isOwner: ventVisitorId === visitorId,
  }));
}

export function createVent(course: string, body: string, visitorId: string): void {
  insertVent.run(course, body, new Date().toISOString(), visitorId);
}

export function addResonance(ventId: number, visitorId: string): void {
  insertResonance.run(ventId, visitorId);
}

// Enforces ownership at the query level, not just by checking before calling
// this: the UPDATE/DELETE's own WHERE clause is the thing that can't be
// bypassed by a crafted request, per crit 10's "permission logic must be
// verified server-side" requirement. Returns whether a row actually matched
// and was deleted, so the caller (and the log line) can tell a real delete
// apart from a rejected one.
export function deleteVent(ventId: number, visitorId: string): boolean {
  const result = deleteVentIfOwner.run(ventId, visitorId);
  const deleted = result.changes === 1;
  if (deleted) deleteResonancesForVent.run(ventId);
  return deleted;
}
