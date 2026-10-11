# Crit 9 reflection — All at once

**The breakthrough that moved the work forward:** the real work this week
wasn't adding SSE — the stack decision record from crit 8 had already named
that transport and why, so wiring it up was mechanical. The actual decision
was realising that two of the brief's four suggested concurrency questions
("simultaneous edit," "what a returning visitor sees") don't apply to this
app at all: a vent is never edited, and a returning visitor's `GET /` was
already always reading current state. Seeing that let me spend the week's
real decision-making time on the one question that *did* apply — whether to
show who else is here — instead of forcing an answer to questions the app's
own shape had already closed off.

**What this changed about who I want to be as a developer:** this is the
first crit where I caught a real bug the agent introduced, not by reading the
diff and spotting it, but by writing a test that should have been trivially
green and watching it fail intermittently instead of accepting "flaky, ignore
it." The first failure was a genuine production bug (one dead SSE connection
could silently stop every later client in the broadcast loop from getting
updates). The second time the test stayed flaky after that fix, the bug was
in my own test code, not the app — and I only found that by refusing to just
widen the timeout and move on, instrumenting both sides instead. That's the
instinct I want to keep: a test that's "probably just flaky" is a claim to
verify, not a reason to loosen the assertion. Loosening it would have shipped
with the belief that real-time was solid when it wasn't actually proven.
