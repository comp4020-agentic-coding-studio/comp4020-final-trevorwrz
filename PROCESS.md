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
