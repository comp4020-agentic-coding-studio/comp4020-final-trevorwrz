# 0003: A course leaderboard, not a bigger forum

## Context

Crit 8 and crit 9 built the core loop (post, read, resonate) and made it
real-time. Reviewing it ahead of crit 9's demo, the wall felt thin as a
final-project artefact — not wrong, just under-built relative to what a
distinctive "small web" app can be. The tempting fix was the generic one:
turn it into a forum — threads, replies, maybe accounts. The final project
brief argues against exactly this move: "Ask an agent for a 'multi-user,
real-time website' and it will build the median answer... a chat room with
the nouns swapped," and names accounts, profiles, feeds and scores as
"other apps' answers to questions you now have to answer yourself." Adding
any of those would have made the app bigger without making it more itself.

## Decision

Add a **course leaderboard** (`GET /courses`) instead: courses ranked by
total resonance summed across all their vents, not a generic feature bolted
onto the wall. The alternatives considered and rejected:

- **A comment/reply system** (the obvious "forum" move). Rejected outright —
  this is the exact "median answer" the brief warns against, and it needs an
  identity model (whose reply is whose) that conflicts with "anonymous,
  always."
- **A per-vent "trending" or "most resonated ever" list.** This is just the
  existing wall re-sorted; it adds a second view without adding a new
  *question answered*. Rejected as not worth a second page.
- **An individual leaderboard** (most-resonated visitor, say). Immediately
  rejected: there's no stable visitor identity to rank in the first
  place (the `visitor_id` cookie exists only to dedupe resonances —
  `CLAUDE.md`'s harness rule already bans repurposing it to identify anyone),
  and ranking people is a different, uglier app than this one.
- **Ranking courses by total resonance, summed across their vents** — the
  one that shipped. This is the one view that amplifies the app's actual
  value proposition (README: "the complaint the most people share... floats
  to the top") one level up, from "which vent" to "which course," without
  inventing a new interaction model. It reuses data and columns that already
  exist; no new write path, no new identity, no new table.

Course names are normalised (`UPPER(TRIM(...))`) for this view specifically,
since the leaderboard is where the free-text course field's lack of
validation (`README.md`, "What's deferred") would otherwise be visibly
wrong — "COMP8020" and "comp8020" reading as two different courses looks
like a bug, not a quirk, once they're side by side on a ranked list.

## Consequences

- The leaderboard rides the same SSE broadcast crit 9 already built
  (`app/events.ts`'s `broadcastChange()`) rather than needing its own
  real-time plumbing — one more reason this was cheap relative to a forum,
  and one more argument that the wall's real-time layer earns its keep
  across more than one page.
- A course with one highly-resonated vent can outrank a course with several
  ignored ones. That's the intended reading of "the whole wall agrees" — it
  wouldn't be, for a feature meant to answer "which course has the most
  gripes," which this one explicitly isn't.
- The leaderboard aggregates to the course level only; it still tells you
  nothing about who posted or resonated anything, so it doesn't reopen the
  identity question `docs/decisions/0002-presence-and-broadcast-scope.md`
  already closed.
