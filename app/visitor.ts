import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    // A client can send any bytes it likes as a Cookie header, including a
    // percent-encoding decodeURIComponent rejects outright (a bare "%",
    // say — no real browser sends this, but nothing stops a crafted
    // request from doing it). That's someone else's malformed cookie, not
    // a reason to fail the whole request: skip just this one name rather
    // than let it throw synchronously and 500 every route that calls
    // getOrSetVisitorId, which is all of them.
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // ignore this one cookie, keep parsing the rest
    }
  }
  return out;
}

// An anonymous but stable identity: enough to tell "the same visitor" apart
// without asking for a name or an account. Set once, read on every request.
export function getOrSetVisitorId(req: Request, res: Response): string {
  const existing = parseCookies(req.headers.cookie)[COOKIE_NAME];
  // Trusting an existing cookie verbatim would let a crafted (but
  // well-formed, no decode error) Cookie header persist arbitrary bytes —
  // near Node's ~16KB header-size ceiling — into vents.visitor_id on every
  // vent that "visitor" ever posts. Requiring the shape this app itself
  // issues (a randomUUID()) closes that off without costing a real visitor
  // anything, since they never send anything else.
  if (existing && UUID_RE.test(existing)) return existing;

  const id = randomUUID();
  res.cookie(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS * 1000,
  });
  return id;
}
