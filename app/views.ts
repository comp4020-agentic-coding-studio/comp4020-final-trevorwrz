import type { Vent } from "./db.ts";

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

  return `
    <li class="vent">
      <p class="vent-course">${escapeHtml(vent.course)}</p>
      <p class="vent-body">${escapeHtml(vent.body)}</p>
      <div class="vent-meta">
        <span class="vent-count">Resonance ${vent.resonanceCount}</span>
        ${button}
      </div>
    </li>`;
}

export function renderPage(vents: Vent[]): string {
  const rows = vents.length > 0
    ? vents.map(ventRow).join("\n")
    : `<li class="empty">🫙 No vents yet — write the first one.</li>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Course Vent Wall</title>
    <style>
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
      li.empty {
        text-align: center;
        color: var(--muted);
        border: 1px dashed var(--border);
        border-radius: 0.85rem;
        padding: 2rem 1rem;
        background: var(--card);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header class="hero">
        <div class="badge">📣</div>
        <h1>Course Vent Wall</h1>
        <p class="tagline">Anonymous gripes, sorted by how many people feel the same.</p>
        <p><a href="/readme/">What is this / Rules</a></p>
      </header>
      <form method="post" action="/vents" class="post-form">
        <input type="text" name="course" placeholder="Course code, e.g. COMP8020" maxlength="80" required />
        <textarea name="body" placeholder="Vent anonymously… go after the issue, not the person" maxlength="500" rows="3" required></textarea>
        <button type="submit">Post anonymously</button>
      </form>
      <ul>
        ${rows}
      </ul>
    </div>
  </body>
</html>`;
}
