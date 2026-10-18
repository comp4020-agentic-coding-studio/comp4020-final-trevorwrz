# Your harness

Rules derived from `README.md`'s definition of good — what the agent's work
on this app must never violate, regardless of what feature it's building.

- **Never render a vent's `course` or `body` as raw HTML.** Always go through
  `escapeHtml()` in `app/views.ts`. User-submitted text is the one untrusted
  input this app renders; a change that reintroduces unescaped interpolation
  is a regression, not a style choice.
- **A resonate action must stay idempotent per visitor.** Resonating the same
  vent twice from the same `visitor_id` must never change the count a second
  time. If the schema or query for this changes, `spec/vents.test.ts`'s
  dedup test must still pass.
- **No feature that identifies a real person.** No accounts, no usernames, no
  IP logging surfaced anywhere in the UI. The anonymous `visitor_id` cookie
  exists to dedupe resonances and (since crit 10) to gate vent deletion — it
  must never be surfaced in the UI as "who posted what," including on vents
  the viewer doesn't own.
- **No presence indicator.** No viewer count, no "N people here" badge, no UI
  derived from how many `/events` connections are open. Decided deliberately
  in `docs/decisions/0002-presence-and-broadcast-scope.md`; a real-time
  feature that surfaces how many people are watching needs a new decision
  record before it ships, not a one-line addition to `app/events.ts`.
- **Only a vent's own author can delete it, and the server must enforce
  that, not just the UI.** `app/db.ts`'s `deleteVent()` is the single place
  this is checked — its SQL `WHERE id = ? AND visitor_id = ?` is what
  actually refuses a non-owner's request, and that check must never move to
  "hide the button and trust the request." See
  `docs/decisions/0004-vent-ownership.md`. There is still no editing, and no
  one but the author may delete — a moderator role or any other change to who
  can act on someone else's vent needs a new decision record before it ships.
- **`/` and `/readme/` must keep answering `200`.** These are the two
  invariants `spec/invariants.test.ts` checks against the built Docker image;
  don't restructure routing in a way that risks either going down.
- **Every state-changing route logs one line to stdout naming the acting
  visitor.** `app/log.ts`'s `logAction()` is the only place that happens; a
  new mutating route needs a call into it, including on the rejected branch
  (a denied delete is as important to the log as an accepted one — crit 10's
  presenter narrates the crit entirely from this stream).
