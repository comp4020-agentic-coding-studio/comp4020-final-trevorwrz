import type { CourseStat, Vent } from "./db.ts";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ventRow(vent: Vent): string {
  const button = vent.resonatedByVisitor
    ? `<span class="resonated">💛 Resonated +1</span>`
    : `<form method="post" action="/vents/${vent.id}/resonate" class="resonate-form">
         <button type="submit">✨ Resonate +1</button>
       </form>`;

  // Shown only to the visitor whose own visitor_id created this vent
  // (`isOwner`, computed server-side in app/db.ts's listVents) — a hint for
  // this visitor, not the enforcement itself: POST /vents/:id/delete repeats
  // the same ownership check against the stored row regardless of what this
  // markup renders, per docs/decisions/0004-vent-ownership.md.
  const deleteControl = vent.isOwner
    ? `<form method="post" action="/vents/${vent.id}/delete" class="delete-form">
         <button type="submit">🗑️ Delete</button>
       </form>`
    : "";

  return `
    <li class="vent">
      <p class="vent-course">${escapeHtml(vent.course)}</p>
      <p class="vent-body">${escapeHtml(vent.body)}</p>
      <div class="vent-meta">
        <span class="vent-count">Resonance ${vent.resonanceCount}</span>
        <div class="vent-actions">
          ${button}
          ${deleteControl}
        </div>
      </div>
    </li>`;
}

// The live-updating part of the page, on its own: both the full page (first
// load) and GET /vents/fragment (what a connected tab re-fetches when the
// SSE channel pings "changed") render through this one function, so the two
// can never drift into different markup for the same data.
export function renderVentList(vents: Vent[]): string {
  const rows = vents.length > 0
    ? vents.map(ventRow).join("\n")
    : `<li class="empty">🫙 No vents yet — write the first one.</li>`;

  return `<ul id="vents">\n${rows}\n</ul>`;
}

// Shared between the wall ("/") and the course leaderboard ("/courses"):
// one page shell so the two never drift into inconsistent styling, and a
// new page doesn't mean a second copy of this CSS to keep in sync.
const pageStyles = `
      :root {
        --ink: #1e1b2e;
        --muted: #716d8a;
        --card: rgba(255, 255, 255, 0.72);
        --border: rgba(30, 27, 46, 0.08);
        --accent1: #7c3aed;
        --accent2: #ec4899;
        --accent3: #f59e0b;
      }

      * { box-sizing: border-box; }

      body {
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        color: var(--ink);
        margin: 0;
        padding: 3rem 1rem 4rem;
        min-height: 100vh;
        background:
          radial-gradient(900px 500px at 10% -10%, #ddd6fe66, transparent 60%),
          radial-gradient(800px 500px at 110% 10%, #fbcfe866, transparent 60%),
          radial-gradient(1000px 700px at 50% 120%, #fde68a4d, transparent 60%),
          linear-gradient(180deg, #f5f3ff, #fdf2f8 60%, #fffbeb);
        background-attachment: fixed;
      }

      .wrap { max-width: 640px; margin: 0 auto; }

      header.hero { text-align: center; margin-bottom: 2rem; }
      .badge {
        display: inline-flex; align-items: center; justify-content: center;
        width: 3.5rem; height: 3.5rem; font-size: 1.6rem;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent1), var(--accent2));
        box-shadow: 0 10px 25px -8px rgba(124, 58, 237, 0.55);
        margin-bottom: 0.75rem;
      }
      h1 {
        margin: 0 0 0.35rem;
        font-size: 2rem;
        background: linear-gradient(135deg, var(--accent1), var(--accent2) 55%, var(--accent3));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .tagline { color: var(--muted); margin: 0 0 0.5rem; }
      .hero a {
        color: var(--accent1); text-decoration: none; font-weight: 600;
        border-bottom: 1px solid transparent;
      }
      .hero a:hover { border-bottom-color: currentColor; }

      form.post-form {
        background: var(--card);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 1.25rem;
        margin-bottom: 2.5rem;
        display: grid;
        gap: 0.75rem;
        box-shadow: 0 20px 40px -24px rgba(30, 27, 46, 0.25);
      }
      input, textarea, button { font: inherit; }
      input, textarea {
        padding: 0.65rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 0.6rem;
        background: #fff;
        color: var(--ink);
      }
      input:focus, textarea:focus {
        outline: none;
        border-color: var(--accent1);
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18);
      }
      textarea { resize: vertical; }
      form.post-form button {
        justify-self: start;
        padding: 0.65rem 1.4rem;
        border: none;
        border-radius: 999px;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        background: linear-gradient(135deg, var(--accent1), var(--accent2));
        box-shadow: 0 10px 20px -10px rgba(124, 58, 237, 0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      form.post-form button:hover { transform: translateY(-1px); box-shadow: 0 14px 24px -10px rgba(124, 58, 237, 0.7); }

      ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.85rem; }
      .vent {
        background: var(--card);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-left: 4px solid var(--accent1);
        border-radius: 0.85rem;
        padding: 1rem 1.1rem;
        box-shadow: 0 14px 30px -22px rgba(30, 27, 46, 0.3);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .vent:hover { transform: translateY(-2px); box-shadow: 0 18px 34px -20px rgba(30, 27, 46, 0.35); }
      .vent-course {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: var(--accent1);
        background: rgba(124, 58, 237, 0.1);
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        margin: 0 0 0.5rem;
      }
      .vent-body { margin: 0 0 0.75rem; white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
      .vent-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
      .vent-count { font-size: 0.85rem; color: var(--muted); font-weight: 600; }
      .vent-actions { display: flex; align-items: center; gap: 0.5rem; }
      .resonate-form { margin: 0; }
      .resonate-form button {
        font-size: 0.85rem;
        padding: 0.35rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .resonate-form button:hover { transform: translateY(-1px); background: #fdf4ff; }
      .resonated { font-size: 0.85rem; color: var(--muted); }
      .delete-form { margin: 0; }
      .delete-form button {
        font-size: 0.85rem;
        padding: 0.35rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: #fff;
        cursor: pointer;
        color: #b91c1c;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .delete-form button:hover { transform: translateY(-1px); background: #fef2f2; }
      li.empty {
        text-align: center;
        color: var(--muted);
        border: 1px dashed var(--border);
        border-radius: 0.85rem;
        padding: 2rem 1rem;
        background: var(--card);
      }
      .nav-links {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
        margin: 0.1rem 0 0.4rem;
      }
      ol.course-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
      .course-row {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        background: var(--card);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-left: 4px solid var(--accent3);
        border-radius: 0.85rem;
        padding: 0.85rem 1.1rem;
        box-shadow: 0 14px 30px -22px rgba(30, 27, 46, 0.3);
      }
      .course-rank { font-weight: 700; color: var(--accent1); width: 1.75rem; text-align: center; flex-shrink: 0; }
      .course-name { font-weight: 700; flex: 1; }
      .course-stats { font-size: 0.85rem; color: var(--muted); text-align: right; white-space: nowrap; }
`;

// Shared by both pages' live-update listener: progressive enhancement only
// (every form still works with no JS at all, via plain POST + 303 redirect),
// this just re-fetches the page's own fragment when the shared SSE channel
// pings "changed", so other people's changes show up without a reload per
// crit 9's "within about a second, no reload" requirement.
function liveUpdateScript(elementId: string, fragmentUrl: string): string {
  return `
    <script>
      if (window.EventSource) {
        const source = new EventSource("/events");
        source.addEventListener("changed", async () => {
          try {
            const res = await fetch(${JSON.stringify(fragmentUrl)}, { credentials: "same-origin" });
            if (!res.ok) return;
            const html = await res.text();
            const current = document.getElementById(${JSON.stringify(elementId)});
            if (current) current.outerHTML = html;
          } catch {
            // A dropped fetch just means this tab stays stale until the next
            // "changed" event or a manual reload — never worth surfacing to
            // the visitor over an anonymous vent wall.
          }
        });
      }
    </script>`;
}

function courseRow(stat: CourseStat, rank: number): string {
  return `
    <li class="course-row">
      <span class="course-rank">#${rank}</span>
      <span class="course-name">${escapeHtml(stat.course)}</span>
      <span class="course-stats">${stat.totalResonance} resonance · ${stat.ventCount} vent${stat.ventCount === 1 ? "" : "s"}</span>
    </li>`;
}

// Same split-out-fragment shape as renderVentList(): the full /courses page
// and GET /courses/fragment (what a connected tab re-fetches on the same
// "changed" SSE ping the wall already listens for — this leaderboard rides
// the broadcast crit 9 built, rather than needing its own) render through
// this one function.
export function renderCourseList(stats: CourseStat[]): string {
  const rows = stats.length > 0
    ? stats.map((s, i) => courseRow(s, i + 1)).join("\n")
    : `<li class="empty">🫙 No vents yet — nothing to rank.</li>`;

  return `<ol id="courses-list" class="course-list">\n${rows}\n</ol>`;
}

export function renderCoursesPage(stats: CourseStat[]): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Course Leaderboard — Vent Wall</title>
    <style>${pageStyles}</style>
  </head>
  <body>
    <div class="wrap">
      <header class="hero">
        <div class="badge">🏆</div>
        <h1>Course Leaderboard</h1>
        <p class="tagline">Which courses the whole wall agrees are rough right now.</p>
        <p class="nav-links"><a href="/">&larr; Back to the wall</a> · <a href="/readme/">What is this / Rules</a></p>
      </header>
      ${renderCourseList(stats)}
    </div>
    ${liveUpdateScript("courses-list", "/courses/fragment")}
  </body>
</html>`;
}

export function renderPage(vents: Vent[]): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Course Vent Wall</title>
    <style>${pageStyles}</style>
  </head>
  <body>
    <div class="wrap">
      <header class="hero">
        <div class="badge">📣</div>
        <h1>Course Vent Wall</h1>
        <p class="tagline">Anonymous gripes, sorted by how many people feel the same.</p>
        <p class="nav-links"><a href="/courses">🏆 Course leaderboard</a> · <a href="/readme/">What is this / Rules</a></p>
      </header>
      <form method="post" action="/vents" class="post-form">
        <input type="text" name="course" placeholder="Course code, e.g. COMP8020" maxlength="80" required />
        <textarea name="body" placeholder="Vent anonymously… go after the issue, not the person" maxlength="500" rows="3" required></textarea>
        <button type="submit">Post anonymously</button>
      </form>
      ${renderVentList(vents)}
    </div>
    ${liveUpdateScript("vents", "/vents/fragment")}
  </body>
</html>`;
}
