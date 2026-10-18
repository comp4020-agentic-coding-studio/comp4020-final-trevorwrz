# Crit 10 reflection — Fly by instruments

**The breakthrough that moved the work forward:** the brief leaves "who
counts as a person, and what can they do differently" open, and the agent's
first instinct was to reach for a shared moderator role — someone who can
delete anyone's vent. I rejected that before any code was written: a
moderator role reopens "who grants it" with no account system to answer
that, which is a bigger permission surface than the spec actually asks for.
Re-reading my own `README.md`'s "anonymous, always" commitment pointed at
the smaller answer instead — the app already has an identity, the
`visitor_id` cookie it's used since crit 8 to dedupe resonances. Reusing it
to mean "the person who posted this vent" turned a feature that looked like
it needed new infrastructure into one line of extra meaning on data that
was already there. The permission itself is also the narrowest one the
app's own shape wants: delete-your-own, not edit, not moderate, not
see-differently — "people reconsidering an anonymous post" is a real use a
vent wall accumulates, where a visibility split or a moderator role would
have been built only to satisfy the brief's letter.

**What this changed about who I want to be as a developer:** every test
this week ran against a fresh database, and every one passed — which is
exactly the condition under which a schema-migration bug stays invisible.
`CREATE TABLE IF NOT EXISTS` is a no-op against a table that already
exists, so the new `visitor_id` column never reached the live Fly volume's
real table, built back in crit 8. The deployed app crash-looped on "table
vents has no column named visitor_id" until it hit Fly's restart ceiling —
a failure that a green `pnpm check`, run against disposable tmpfs
containers every time, could never have shown me, because "does this work
against a database that already has history" was never a question the test
suite was in a position to ask. The fix is a `PRAGMA table_info` check
guarding an explicit `ALTER TABLE`, verified against a simulated
pre-crit-10 database so old rows migrate with no owner (nobody can claim
them) and new rows get a real one. The instinct I want to keep from this:
a passing test suite proves the code is correct against the state it was
tested with, not against the state it will actually run on — anything that
changes a schema needs to be checked against the deployed thing's own
history, not just a fixture that starts from nothing.
