# Course Vent Wall

A place to anonymously vent about any ANU course, and see that other people
feel the same way. Post a short gripe tagged with a course code, read
everyone else's, and click "Resonate +1" on the ones you agree with. The wall
sorts by resonance count, so the complaint the most people share about floats
to the top.

This is the week 10 ("All at once") version: the wall is real-time now — a
vent or a resonance posted in one tab shows up in every other open tab
within about a second, with no reload. There's also a
[course leaderboard](/courses/), ranking courses by total resonance across
their vents — the same "everyone agrees" effect, one level up from a single
vent. Moderation tooling and the rest of the multi-user polish the final
project eventually needs are still deliberately not here — see "What's
deferred" below.

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
- **No presence indicator.** The wall never shows who else is connected, or
  how many — not a viewer count, not a "someone's here" badge. Anonymity
  means not knowing you're the only one reading, not just not knowing which
  one anyone is. See `docs/decisions/0002-presence-and-broadcast-scope.md`.
- **Growth means sharper, not bigger.** The obvious way to make this feel
  more like a "real" final project was to bolt on a forum — replies,
  accounts, threads. That's rejected on purpose: it's the generic answer the
  final project brief explicitly warns against, and it needs an identity
  model this app doesn't have. The course leaderboard exists instead because
  it's a sharper view of the same value this app already has, not a new one.
  See `docs/decisions/0003-course-leaderboard.md`.

## What's deferred

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
