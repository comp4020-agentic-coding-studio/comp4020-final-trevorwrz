import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

function jar() {
  let cookie = "";
  return {
    async fetch(path: string, init: RequestInit = {}): Promise<Response> {
      const res = await fetch(new URL(path, baseUrl), {
        ...init,
        headers: { ...init.headers, cookie },
        redirect: "manual",
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return res;
    },
  };
}

function postVent(visitor: ReturnType<typeof jar>, course: string, body: string) {
  return visitor.fetch("/vents", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ course, body }).toString(),
  });
}

function resonateAsNewVisitor(ventId: string) {
  return jar().fetch(`/vents/${ventId}/resonate`, { method: "POST" });
}

async function findVentId(page: string, marker: string): Promise<string> {
  const match = page.match(
    new RegExp(`${marker}[\\s\\S]*?action="/vents/(\\d+)/resonate"`),
  );
  if (!match) throw new Error(`could not find a resonate form for ${marker}`);
  return match[1];
}

it("ranks courses by total resonance across their vents, not just vent count", async () => {
  const author = jar();
  // Uppercase suffixes: the app normalises course names to upper case (see
  // app/db.ts), so a mixed-case marker here would never match what the
  // leaderboard actually renders.
  const quietCourse = `QUIET${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const popularCourse = `POPULAR${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // The quiet course gets three vents that nobody resonates.
  for (let i = 0; i < 3; i++) {
    await postVent(author, quietCourse, `quiet gripe ${i} ${crypto.randomUUID()}`);
  }

  // The popular course gets one vent that several visitors resonate.
  const marker = `popular gripe ${crypto.randomUUID()}`;
  await postVent(author, popularCourse, marker);
  const page = await author.fetch("/").then((r) => r.text());
  const ventId = await findVentId(page, marker);
  await resonateAsNewVisitor(ventId);
  await resonateAsNewVisitor(ventId);
  await resonateAsNewVisitor(ventId);

  const leaderboard = await author.fetch("/courses").then((r) => r.text());
  const popularIdx = leaderboard.indexOf(popularCourse);
  const quietIdx = leaderboard.indexOf(quietCourse);
  expect(popularIdx, "popular course should appear on the leaderboard").toBeGreaterThan(-1);
  expect(quietIdx, "quiet course should appear on the leaderboard").toBeGreaterThan(-1);
  expect(
    popularIdx,
    "a course with far less total resonance should not outrank one with far more, even with fewer vents",
  ).toBeLessThan(quietIdx);
});

it("normalises course names so the same course isn't split across rows by casing or whitespace", async () => {
  const author = jar();
  const base = `NORM${crypto.randomUUID().slice(0, 8)}`;
  await postVent(author, base, `one ${crypto.randomUUID()}`);
  await postVent(author, ` ${base.toLowerCase()} `, `two ${crypto.randomUUID()}`);

  const leaderboard = await author.fetch("/courses").then((r) => r.text());
  const occurrences = leaderboard.split(base.toUpperCase()).length - 1;
  expect(occurrences, `"${base}" should appear once on the leaderboard, combining both vents`).toBe(1);
  expect(leaderboard).toContain("2 vents");
});
