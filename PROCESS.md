# Process overview

## What this is

The course vent wall: an anonymous board where anyone posts a gripe about an
ANU course and others click "Resonate +1" if they agree, sorted so the
complaint the most people share floats to the top. As of crit 9 it's also
real-time (a change in one tab reaches every other open tab within about a
second, no reload) and has a second view, the course leaderboard, ranking
courses by total resonance. `README.md` argues what "good" means for it;
this file is about how it got built and stays rewritten each crit to reflect
where the project actually is, not a log of what happened when.

## The decisions, in order

- [`0001-stack.md`](docs/decisions/0001-stack.md): Node 24 running `.ts`
  directly, Express, `node:sqlite`, server-rendered HTML with no client
  framework — small enough that a heavier stack would be solving a problem
  this app doesn't have.
- [`0002-presence-and-broadcast-scope.md`](docs/decisions/0002-presence-and-broadcast-scope.md):
  every write (not just new vents) broadcasts live, but no presence
  indicator — a live viewer count was cheap to add once SSE existed, and
  rejected anyway because it conflicts with "anonymous, always."
- [`0003-course-leaderboard.md`](docs/decisions/0003-course-leaderboard.md):
  a course leaderboard, not a bigger forum — the generic move (comments,
  accounts) was rejected as the brief's named "median answer"; ranking
  courses by total resonance amplifies the app's actual value proposition
  instead of bolting on an unrelated feature.

## How it was built

Crit 8's build, in commit order: dependencies and config, then the schema
and anonymous-visitor cookie
([`3434427`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/3434427)),
then routes and rendering
([`36f1a41`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/36f1a41)),
then the spec
([`75c0b17`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/75c0b17)),
then the README/CLAUDE.md pair
([`7711dcb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/7711dcb)),
then the real Dockerfile
([`5724bca`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/5724bca)),
then the stack decision record
([`982ae7f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/982ae7f)).

Crit 9 added real-time on top of that: the broadcast channel and
`/events`/`/vents/fragment` routes
([`d3b2b40`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/d3b2b40)),
then `spec/realtime.test.ts`
([`f40ba15`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/f40ba15)),
then the concurrency decision record
([`6808b6a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/6808b6a)),
then the README/CLAUDE.md updates it implies
([`90836f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/90836f4)),
then a fix to the spec's own flakiness against the live deployment
([`cc07aa2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-trevorwrz/commit/cc07aa2)).
Then the course leaderboard, riding the same broadcast rather than inventing
new plumbing: `listCourseLeaderboard()` in `app/db.ts`, `/courses` and
`/courses/fragment` in `app/server.ts`, its own spec, and
`docs/decisions/0003-course-leaderboard.md`.

## Directing, grounding and correcting the agent's work

**Picking and scoping the idea (crit 8):**

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

**Making it real-time (crit 9):**

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
- I checked the spec test against the real target, not just localhost:
  after deploying, I ran `pnpm check` with `APP_URL` pointed at the live Fly
  URL and found the resonate test flaky there specifically, even though it
  was solid after 8 straight local runs. The cause was a connection-timing
  race that only shows up over a real network: `fetch("/events")` resolving
  with headers doesn't guarantee the server's handler has reached
  `addClient()` yet, and over the internet that gap is wide enough to
  occasionally race against an action triggered right after. The fix makes
  each test explicitly wait for the connection's own preamble line before
  triggering anything, which is also closer to what a real client should do.
  I wouldn't have caught this testing only against localhost, where that gap
  is too small to ever lose the race.
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

**Adding the course leaderboard (crit 9, after reviewing the week 8 build):**

- I judged the wall as a final-project artefact and found it under-built,
  not wrong — and rejected my own first instinct to fix that by making it
  bigger and more generic (a forum, with replies and accounts). Re-reading
  the brief's own warning against "the median answer" (a chat room with the
  nouns swapped) and its list of features that are "other apps' answers"
  (accounts, profiles, feeds, scores) is what redirected that instinct
  toward something smaller and more specific to this app instead.
- I had the agent consider and reject three alternatives in
  `docs/decisions/0003-course-leaderboard.md` before building anything: a
  reply system (the generic move), a per-vent trending list (adds a view
  without adding a question), and an individual leaderboard (no stable
  identity to rank, and `CLAUDE.md` already bans repurposing `visitor_id`
  for exactly that). Writing down what got rejected and why is what made
  this a defended choice rather than the first idea that came up.
- I corrected a normalisation gap before it became a visible bug: the
  course field has always been free text (`README.md`'s own "What's
  deferred" flags this), which doesn't matter when every vent is read on
  its own, but would show "COMP8020" and "comp8020" as two separate rows
  once they're side by side on a ranked list. I had the query group by
  `UPPER(TRIM(course))` rather than the raw column, and wrote
  `spec/courses.test.ts` to check it directly, rather than leaving it as a
  thing that would only surface by accident once real messy input arrived.
- I caught two bugs in my own new spec tests, not the app: both
  `spec/courses.test.ts` and the new leaderboard case in
  `spec/realtime.test.ts` generated course codes with
  `crypto.randomUUID()`, which produces lowercase hex, then checked for
  that exact (mixed-case) string in the rendered output — which the
  normalisation above correctly never produces. The first full test run
  failed deterministically (not flaky — the same two tests, every time),
  which was itself useful signal that this was a real, fixable test bug and
  not a timing issue to chase; the fix was uppercasing the generated course
  codes to match what the app actually stores.

## What's next

Crit 10 ("Fly by instruments") asks for multi-user: two classmates using the
deployed URL at once while I watch via logs. The real-time layer and the
leaderboard both already assume concurrent writers (the resonance dedup
predates this crit; the SSE broadcast has no single-writer assumption baked
in), so the work ahead is less "make it multi-user" and more "find out
where that assumption is wrong" — deliberately trying to break simultaneous
posts and resonances rather than just demonstrating the happy path.
