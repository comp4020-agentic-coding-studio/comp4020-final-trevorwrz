import { readFileSync } from "node:fs";
import { escapeHtml } from "./views.ts";

// Rendered verbatim (escaped) rather than through a markdown parser: the spec
// only requires the README's headings to appear, in order, in the served
// page's text, and a verbatim render can't drift from the source the way a
// hand-rolled parser could.
export function renderReadme(readmePath: string): string {
  const body = escapeHtml(readFileSync(readmePath, "utf8"));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>About / README</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #1e1b2e;
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
      a.back {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 1.25rem;
        color: #7c3aed;
        font-weight: 600;
        text-decoration: none;
      }
      a.back:hover { text-decoration: underline; }
      .card {
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(30, 27, 46, 0.08);
        border-radius: 1rem;
        padding: 1.5rem 1.75rem;
        box-shadow: 0 20px 40px -24px rgba(30, 27, 46, 0.25);
      }
      pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 0; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/">&larr; Back to vent wall</a>
      <div class="card">
        <pre>${body}</pre>
      </div>
    </div>
  </body>
</html>`;
}
