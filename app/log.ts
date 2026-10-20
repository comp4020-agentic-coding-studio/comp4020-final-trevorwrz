// Server-side action log: the crit 10 presenter's only window into who did
// what (per the brief, they never touch the UI during the demo — they narrate
// from `mise exec -- flyctl logs -a <repo>`, which just tails this process's
// stdout). Each line names the acting visitor so two concurrent test users
// read as two distinct identities in the stream, and the attempted/rejected
// case is logged exactly like a success so a denied cross-visitor delete is
// visible too, not just the ones that succeed.
type Action = "vent.created" | "vent.rejected" | "vent.resonated" | "vent.delete.ok" | "vent.delete.denied";

// visitor_id is a random UUID, not something anyone would correlate across
// sessions anyway, but logging only a short prefix (enough to tell two
// concurrent visitors apart in one log stream) keeps the log from doubling as
// a visitor_id registry.
function shortId(visitorId: string): string {
  return visitorId.slice(0, 8);
}

export function logAction(
  action: Action,
  details: { visitorId: string; ventId?: number; course?: string },
): void {
  const parts = [`visitor=${shortId(details.visitorId)}`];
  if (details.ventId !== undefined) parts.push(`vent=${details.ventId}`);
  if (details.course !== undefined) parts.push(`course=${JSON.stringify(details.course)}`);
  console.log(`[${action}] ${parts.join(" ")}`);
}
