# 0004: Vent ownership — author-only delete, no accounts

## Context

Crit 10 ("Fly by instruments") requires the app to tell two simultaneous
people apart, with at least one permission difference between them enforced
server-side, and that enforcement logged so a presenter can narrate it from
`flyctl logs` alone — no UI interaction during the demo. Until now every
visitor to the wall has had identical capabilities: post, read, resonate
once. There was nothing to differentiate two people by, and nothing a server
could refuse one of them and allow the other.

This collides with an existing harness rule (`CLAUDE.md`): "Vents are never
deleted or edited by the app itself." That rule was true because there was no
identity to gate a delete on — anyone deleting anything would have been
indistinguishable from anyone else doing it, i.e. moderation with no
moderator. Crit 10 introduces exactly the identity that rule was missing.

## Decision

**The `visitor_id` that created a vent becomes that vent's owner. Only the
owner may delete it; everyone else keeps exactly the permissions they already
had (read, resonate).** No accounts, no usernames, no login — the existing
anonymous `visitor_id` cookie (already used to dedupe resonances) is reused
for one more purpose: proving "this is the same visitor who posted this,"
nothing more.

Enforcement lives at the query level, not the route: `app/db.ts`'s
`deleteVent(ventId, visitorId)` runs
`DELETE FROM vents WHERE id = ? AND visitor_id = ?` — a crafted request
naming someone else's vent ID simply matches zero rows and nothing is
deleted, regardless of what the UI would have shown that visitor. The
UI-level delete button (shown only when `vent.isOwner`) is a convenience, not
the authorization boundary.

Every attempt — success or refusal — is logged via `app/log.ts`'s
`logAction()`, naming a short prefix of the acting visitor's id, so two
concurrent test visitors read as distinct actors in `flyctl logs`, and a
denied cross-visitor delete shows up in the log exactly as clearly as an
accepted one.

### Alternatives considered

- **No deletion at all, differentiate some other way** (e.g. who can see a
  vent). Rejected: the wall has no content worth hiding per-visitor — every
  vent is meant to be seen by everyone (README: "read before you post"), so
  a visibility split would be a permission with no real use, built only to
  satisfy the brief's letter. Delete-your-own is a permission the app's own
  shape already wants (people reconsidering an anonymous post is a real use
  case a vent wall accumulates).
- **A shared moderator role** (one visitor flagged able to delete anyone's
  vent). Rejected: it reopens the "who moderates" and "how is that role
  granted" questions that an anonymous, account-free app has no clean answer
  to, and it's a bigger permission surface than this week's spec asks for.
- **Editing instead of (or alongside) deleting.** Rejected as unnecessary
  scope: the spec requires a verified permission difference, not an editing
  feature; delete-your-own is the smaller change that satisfies it.

## Consequences

- `README.md`'s permanence promise is no longer absolute — revised to "stays,
  unless the person who posted it takes it back." This is a narrower
  exception than it might read: no one but the author can ever remove a
  vent, so the "permanent to everyone but you" character of the wall is
  unchanged.
- Deleting a vent also deletes its resonances (`deleteResonancesForVent`) to
  keep the `resonances` table's foreign key meaningful — a resonance on a
  vent that no longer exists would be a dangling reference, not a feature.
- This still doesn't reopen the identity question `0002` and `0003` already
  closed: nothing here shows who posted what to any other visitor, and there
  is still no presence indicator and no per-visitor ranking. Ownership is
  checked server-side and used for exactly one decision (can this request
  delete this row); it is never rendered as an identity anyone can see.
