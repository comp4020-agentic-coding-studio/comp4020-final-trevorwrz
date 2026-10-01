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
    ? `<span class="resonated">共鸣已 +1</span>`
    : `<form method="post" action="/vents/${vent.id}/resonate" class="resonate-form">
         <button type="submit">共鸣 +1</button>
       </form>`;

  return `
    <li class="vent">
      <p class="vent-course">${escapeHtml(vent.course)}</p>
      <p class="vent-body">${escapeHtml(vent.body)}</p>
      <div class="vent-meta">
        <span class="vent-count">共鸣 ${vent.resonanceCount}</span>
        ${button}
      </div>
    </li>`;
}

export function renderPage(vents: Vent[]): string {
  const rows = vents.length > 0
    ? vents.map(ventRow).join("\n")
    : `<li class="empty">还没有吐槽——来写第一条吧。</li>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>课程吐槽墙</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
      .vent { border: 1px solid #ddd; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
      .vent-course { font-size: 0.85rem; color: #666; margin: 0 0 0.25rem; }
      .vent-body { margin: 0 0 0.5rem; white-space: pre-wrap; word-break: break-word; }
      .vent-meta { display: flex; align-items: center; gap: 0.75rem; }
      .resonate-form { margin: 0; }
      .resonated { color: #888; font-size: 0.9rem; }
      ul { list-style: none; padding: 0; }
      form.post-form { margin-bottom: 2rem; display: grid; gap: 0.5rem; }
      input, textarea, button { font: inherit; padding: 0.5rem; }
      textarea { resize: vertical; }
    </style>
  </head>
  <body>
    <h1>课程吐槽墙</h1>
    <p><a href="/readme/">这是什么 / 规则</a></p>
    <form method="post" action="/vents" class="post-form">
      <input type="text" name="course" placeholder="课程代码，例如 COMP8020" maxlength="80" required />
      <textarea name="body" placeholder="匿名吐槽……对事不对人" maxlength="500" rows="3" required></textarea>
      <button type="submit">匿名发布</button>
    </form>
    <ul>
      ${rows}
    </ul>
  </body>
</html>`;
}
