# 0002: No presence indicator; broadcast every write, not just some

## Context

Crit 9 ("All at once") requires one real decision about what happens when
several people use the vent wall at once, beyond picking a transport. The
brief's prompt list includes: what reaches other people live vs. waits for a
reload, whether people can see who else is here, what happens on a
simultaneous edit, and what a returning visitor sees.

Two of those don't apply to this app's shape. There's no "same thing edited
twice" conflict to resolve: a vent is append-only (never edited, per
`README.md`'s permanence promise) and a resonance is an idempotent upsert
(`INSERT OR IGNORE`, already enforced before this crit). And a returning
visitor — tomorrow, or on reconnect — just gets a fresh `GET /`, which always
reads the current database state; there's no catch-up log to design because
the database already *is* the catch-up log.

That leaves two real questions, and they turned out to be one decision:
**what reaches people live, and whether to show who else is here.**

## Decision

- **Everything broadcasts: every new vent and every resonance reaches every
  open tab live**, not a subset. The alternative — broadcasting only new
  vents and leaving resonance counts to catch up on reload — was rejected: the
  whole point of ranking by resonance (`README.md`, "the complaint the most
  people share floats to the top") is watching that order shift as people
  agree with you in real time. Holding resonance updates back would make the
  wall's main interaction (not just its content) subject to a reload, which
  is exactly what crit 9 asks to remove.
- **No presence indicator.** The wall never shows a connection count, a "3
  people viewing" badge, or anything else derived from who currently has an
  `/events` connection open. The alternative considered was a live viewer
  count, which SSE makes nearly free to add — `app/events.ts` already tracks
  the connected-client set for broadcasting, so counting it would be a
  one-line addition. It was rejected because it cuts against the one identity
  promise this app makes:
  `README.md` says "no accounts, no names, no login," and `CLAUDE.md`'s
  harness rule bans any feature that identifies who's doing what. A bare
  number doesn't name anyone, but it still turns an anonymous, low-stakes
  space into one where people can tell whether they're posting into a crowd
  or into silence — and for a venting app, knowing you might be the only one
  reading changes what people are willing to write. The wall stays exactly as
  legible alone as it is with ten tabs open.

## Consequences

- A connected tab that never posts or resonates still receives every
  `changed` ping from every other visitor and silently re-fetches its own
  fragment each time. For this app's write volume (a cohort of students, not
  a public launch) that's a non-issue; it would be the first thing to revisit
  if the wall ever got busy enough for that polling-on-ping pattern to matter.
- Because there's no viewer count anywhere, there's also nothing to get
  wrong when a visitor's tab is backgrounded and their `EventSource`
  reconnects — there's no number that would flicker or lag. One less thing
  the reconnect logic has to get right.
- The rejected alternative (showing presence) is the one to argue for at the
  crit: it's a real, defensible choice for a different kind of app — a
  waiting room, a shared editor — just not for one whose whole definition of
  good starts with "anonymous, always."
