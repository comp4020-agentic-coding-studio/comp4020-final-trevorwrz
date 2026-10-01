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
  exists only to dedupe resonances — don't repurpose it to show "who posted
  what" anywhere.
- **Vents are never deleted or edited by the app itself.** `README.md`
  promises permanence; a feature that prunes, expires, or edits existing
  vents needs a new README section (and a new decision record) before it
  ships, not a silent addition.
- **`/` and `/readme/` must keep answering `200`.** These are the two
  invariants `spec/invariants.test.ts` checks against the built Docker image;
  don't restructure routing in a way that risks either going down.
