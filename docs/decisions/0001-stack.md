# 0001: Stack for the course vent wall (week 9 proof of life)

## Context

The final project needs a deployed, multi-user, real-time, persistent app.
This week only needs proof of life: a stranger can post and resonate, and
the trace survives a redeploy. The starter's `Dockerfile`/`fly.toml` fix the
deploy shape (one machine, one volume at `/data`, HTTP on `$PORT`) but leave
the application stack completely open.

The app itself is small: two tables, three write actions (post a vent, read
the wall, resonate), no accounts. It doesn't need a frontend build pipeline
or a heavyweight framework to prove it's alive.

## Decision

- **Node 24, running `.ts` directly.** Node's native type-stripping support
  (verified locally before committing to it) means no `tsc`/esbuild build
  step, no `dist/` to keep in sync, and the Dockerfile can `COPY` source
  straight in.
- **Express** for routing. Three routes and a form POST each; a framework
  bigger than this would be solving a problem this app doesn't have.
- **`node:sqlite`** (Node's built-in SQLite binding) instead of
  `better-sqlite3`. Same capability for this app's needs, but no native
  addon to cross-compile for the Docker image's platform — one less way for
  "works on my machine" to not work in CI.
- **Server-rendered HTML, no client JS framework.** The whole interaction —
  read the wall, submit a vent, click resonate — is two form posts and a
  page load. Shipping a bundler for that would be weight with no payoff this
  week.

## Consequences

- The "it's real-time" requirement (final project spec, not crit 8) isn't
  met yet: a second visitor's vent only appears on reload. Given the
  read-heavy, write-light shape of this app (visitors read the wall far more
  often than they post), Server-Sent Events is the leading candidate for
  crit 9 — one long-lived connection per viewer, server pushes on write — over
  WebSockets (bidirectional, which this app doesn't need) or polling (wasted
  requests from everyone who isn't resonating right now). That choice gets
  its own decision record when it's actually built.
- `node:sqlite` is a newer API than `better-sqlite3`; if it turns out to be
  missing something this app needs later (e.g. a specific pragma or
  extension), the swap is small — the query layer is already isolated in
  `app/db.ts`.
- Single SQLite file means single-writer: fine at one Fly machine with
  `auto_stop_machines`, would need revisiting if the app ever needed more
  than one machine running at once.

## If it outgrows this

Switching stack is allowed mid-project ("It's a first choice: if the app
outgrows it, switch, and write a new record saying why" — crit 8 brief). The
most likely trigger is the real-time layer needing more concurrent
connections than a single Node process comfortably holds; that's the
decision to write up if/when it happens, not now.
