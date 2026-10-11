# Process overview

## What this is

A proof-of-life version of the course vent wall: an anonymous board where
anyone posts a gripe about an ANU course and others click "Resonate +1" if they
agree. The README argues what "good" means for it; this file is about how it
got built.

## Choosing the stack

[`982ae7f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/982ae7f)
is the decision record (`docs/decisions/0001-stack.md`): Node 24 running
TypeScript directly (no build step — verified locally before committing to
it), Express for three routes, `node:sqlite` instead of `better-sqlite3` to
avoid a native addon in the Docker image, and server-rendered HTML with no
client framework, since the whole interaction is two form posts and a page
load.

## Order of work

[`619d8c6...982ae7f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/compare/619d8c6...982ae7f)
is the whole build, committed in the order I actually did it: dependencies
and config first, then the schema and anonymous-visitor cookie
([`3434427`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/3434427)),
then routes and rendering
([`36f1a41`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/36f1a41)),
then the spec
([`75c0b17`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/75c0b17)),
then the README/CLAUDE.md pair
([`7711dcb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/7711dcb)),
then the real Dockerfile
([`5724bca`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/5724bca)).

## Directing, grounding and correcting the agent's work

- I picked the app from a list of example ideas the agent proposed (social
  space / game / instrument / tool / satire) rather than accepting the first
  "generic multi-user app" suggestion — the brief warns that's the median
  answer an agent defaults to, and the examples it listed were deliberately
  the opposite: small, specific, varied in tone.
- I made the scoping calls the brief says are the actual work: generic
  cross-course (not one subject), posts permanent (not expiring), sorted by
  resonance (not recency). These went into the README as the definition of
  good, not just into code.
- I had the agent verify its own assumptions rather than trust them: before
  committing to "Node runs `.ts` directly" and "`node:sqlite` works without
  flags," it ran both locally first (see the stack ADR) instead of writing
  the Dockerfile around an untested assumption.
- I grounded the "proof of life" claim concretely rather than taking a green
  `pnpm check` as sufficient: posted a real vent and resonated it against the
  locally running dev server, then against the actual Fly deployment, then
  redeployed and confirmed the same vent and resonance count were still
  there — the spec's "trace still there when they come back" promise,
  checked by hand against the real thing, not just asserted in a test.
- I corrected the escaping behaviour by asking for an explicit XSS check in
  the spec (`spec/vents.test.ts`, the "never rendered as raw HTML" test)
  rather than trusting that `escapeHtml()` was used everywhere just because
  it existed.

## What I'd do differently next crit

Real-time (SSE, per the ADR) is the obvious next step and is deliberately
not here — the crit 8 spec only asks for proof of life, and a correct
real-time layer deserves its own decision record and its own crit rather
than being squeezed in at the end of this one.

## Crit 9: making it real-time ("All at once")

### What changed

- `app/events.ts` is new: a module-level `Set<Response>` of open `/events`
  connections and a `broadcastChange()` that writes one `event: changed`
  SSE message to each of them. It carries no payload on purpose — see
  `docs/decisions/0002-presence-and-broadcast-scope.md`.
- `app/server.ts` gained `GET /events` (the SSE stream, with a 15s heartbeat
  so Fly's proxy doesn't time out an idle connection) and
  `GET /vents/fragment` (the same vent-list markup `/` renders, on its own,
  scoped to whichever visitor cookie requests it). Both `POST /vents` and
  `POST /vents/:id/resonate` now call `broadcastChange()` after writing.
- `app/views.ts` split `renderVentList()` out of `renderPage()` so the full
  page and the fragment endpoint render from the exact same function — they
  can't drift into different markup for the same data. `renderPage()` also
  gained a small inline `<script>`: on a `changed` event it re-fetches
  `/vents/fragment` and swaps it in. Every form on the page still works with
  JS disabled; this only affects what *other* open tabs see.
- `docs/decisions/0002-presence-and-broadcast-scope.md` is the crit's
  required decision record: broadcast every write (not just new vents), and
  no presence indicator — argued against showing a live viewer count, which
  SSE would make nearly free to add but which conflicts with the "anonymous,
  always" promise in `README.md`.
- `spec/realtime.test.ts` is new: it opens a real SSE connection as one
  visitor, has a second visitor post (and separately, resonate), and asserts
  the first visitor's stream receives a `changed` event — the "within about
  a second, no reload" requirement made mechanical rather than only
  checkable by eye at the crit.

### Directing, grounding and correcting the agent's work

- I had the agent read `docs/decisions/0001-stack.md` before writing any
  code: it already named SSE as "the leading candidate for crit 9" and gave
  the reasoning (read-heavy, write-light). Rather than re-deciding the
  transport, that let the week's actual decision-making time go to the
  concurrency question the brief asks for, not the plumbing.
- The one decision this crit requires — what reaches people live, and
  whether to show who else is here — I made by re-reading my own
  `README.md`'s "what good means here" before letting the agent reach for
  the easy, almost-free feature (a connection count). "Anonymous, always"
  was already my own commitment from week 9; this crit is what it costs to
  keep it when a feature that would break it got cheap to add.
- I corrected a real concurrency bug the agent introduced on the first pass:
  `broadcastChange()` originally called `res.write()` on every connected
  client with no error handling. A client whose connection had reset (a
  closed tab, or a cancelled test reader) made that one `write()` throw,
  which aborted the whole `for` loop — every client after the dead one in
  iteration order silently stopped receiving updates. I caught this by
  writing `spec/realtime.test.ts` against two *sequential* SSE connections
  and watching the second one occasionally miss its event; the fix wraps
  each write in its own `try/catch` and drops only the dead client.
- The fix above initially looked like it hadn't worked — the new spec test
  stayed flaky after it. I didn't accept "the test is just flaky" as the
  explanation and instead added temporary logging on both the server (did
  the write actually happen?) and compared successful vs. failing runs. The
  server was writing and succeeding every time; the actual bug turned out
  to be in my own test helper, which raced a fresh `reader.read()` against
  a timeout on every loop iteration — losing that race left a read already
  pending while a second one started, and one of them silently consumed the
  very event the other was waiting to see. Rewritten to one read at a time,
  cancelled from a single timer on timeout, it has since passed every one
  of a dozen back-to-back local runs. I verified this at the level the
  symptom actually lived at (instrumenting both sides and reading output)
  rather than silencing the failure by loosening the deadline, which would
  have hidden a real intermittent bug under a longer wait.
- I grounded "no reload" by hand, not just by the spec test: against the
  local dev server, I opened one terminal session watching `/events` live
  and, from a second, independent session (its own cookie jar — a different
  visitor), posted a vent and confirmed the watching session received the
  `changed` ping with no action of its own; then fetched the first session's
  own fragment and confirmed the new vent was already there. Repeated the
  same for a resonance: posted it from the second session, watched the ping
  arrive on the first, then confirmed the first session's fragment showed
  the resonance count having ticked up to 1 — all without the first session
  reloading or acting at all. This is the same shape as two browser tabs,
  done over curl so the timing of each push is visible in the terminal
  rather than trusted by eye.
