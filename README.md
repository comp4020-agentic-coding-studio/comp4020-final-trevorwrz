# Course Vent Wall

A place to anonymously vent about any ANU course, and see that other people
feel the same way. Post a short gripe tagged with a course code, read
everyone else's, and click "Resonate +1" on the ones you agree with. The wall
sorts by resonance count, so the complaint the most people share about floats
to the top.

This is the week 9 ("It's alive!") version: proof that the core loop works
and survives a redeploy. Real-time updates, moderation tooling, and the full
multi-user polish the final project eventually needs are deliberately not
here yet — see "What's deferred" below.

## Who it's for

Any ANU student, about any course. Not scoped to one subject on purpose: a
single-course board would be too quiet most weeks, and the shared-complaint
effect — "oh, everyone in my tutorial feels this too" — gets stronger with
more courses mixed in.

## What "good" means here

- **Anonymous, always.** No accounts, no names, no login. The only identity
  the app keeps is an anonymous cookie, used solely to stop one visitor from
  resonating the same post twice.
- **About the course, not about a person.** A good vent complains about a
  deadline, a format, a workload — not about a named tutor, lecturer, or
  classmate. The app doesn't enforce this (no NLP moderation this week); the
  README says the norm, and that's the contract visitors agree to by posting.
- **Permanent.** A vent posted here stays. No expiry, no "top complaints of
  the week" that bury older ones — if it's still gaining resonance, it's
  still relevant.
- **One voice, one resonance.** Each vent can be resonated at most once per
  visitor, so the ranking reflects how many people agree, not how many times
  one person clicked.
- **Read before you post.** The vent wall is *read* for free; posting asks
  for nothing more than a course code and a sentence. The barrier to
  participation is deliberately almost zero — that's what makes "proof of
  life" meaningful this week: a stranger really can just show up and use it.

## What's deferred

- **Real-time:** a new vent or resonance only appears when you reload. The
  final project needs this to propagate live; that's the target for crit 9
  ("All at once"), likely via Server-Sent Events given the read-heavy,
  write-light shape of this app (see `docs/decisions/0001-stack.md`).
  Decided now, deliberately: good spec says the spec checks for proof-of-life
  signs only, "the real-time layer... can all wait."
- **Moderation:** nothing currently stops a vent from naming a person. A
  later version needs at least a report button and a way to remove a post.
- **Course validation:** the course field is free text, not checked against
  a real course list. Fine for a handful of visitors; would need fixing
  before this scales past a classroom.

## What I read while deciding

- The final project brief's notes on "good" (the small web, games for a
  handful of friends, tools built for one workshop) pushed the scope down
  from "a general confessions app" to something sized for an ANU cohort.
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
  (Nygard) — the ADR format behind `docs/decisions/0001-stack.md`.
