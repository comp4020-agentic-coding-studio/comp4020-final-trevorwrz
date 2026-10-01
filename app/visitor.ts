import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// An anonymous but stable identity: enough to tell "the same visitor" apart
// without asking for a name or an account. Set once, read on every request.
export function getOrSetVisitorId(req: Request, res: Response): string {
  const existing = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (existing) return existing;

  const id = randomUUID();
  res.cookie(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS * 1000,
  });
  return id;
}
