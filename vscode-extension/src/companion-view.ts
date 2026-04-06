export interface CompanionSnapshot {
  projectName: string;
  title: string;
  health: "green" | "yellow" | "red";
  percentComplete: number;
  activeLapLabel: string;
  activeCheckpointTitle: string;
  currentOwner: string;
  nextAction: string;
  blockedReason: string | null;
  recentEvents: Array<{
    summary: string;
    timestamp?: string;
  }>;
}

export function coerceCompanionSnapshot(value: unknown): CompanionSnapshot {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    projectName: sanitizeText(source.projectName, "Track"),
    title: sanitizeText(source.title, "Track plugin MVP"),
    health: coerceHealth(source.health),
    percentComplete: clampPercent(source.percentComplete),
    activeLapLabel: sanitizeText(source.activeLapLabel, "No laps defined"),
    activeCheckpointTitle: sanitizeText(source.activeCheckpointTitle, "No active checkpoint"),
    currentOwner: sanitizeText(source.currentOwner, "unassigned"),
    nextAction: sanitizeText(source.nextAction, "No next action recorded"),
    blockedReason: sanitizeOptionalText(source.blockedReason),
    recentEvents: coerceEvents(source.recentEvents),
  };
}

export function renderCompanionDocument(
  snapshot: CompanionSnapshot | null,
  options?: {
    generatedAt?: string;
    repoRoot?: string;
    statePath?: string;
    errorMessage?: string;
  }
): string {
  const title = snapshot ? `${snapshot.projectName} // Track Companion` : "Track Companion";
  const generatedAt = escapeHtml(options?.generatedAt ?? new Date().toISOString());
  const repoRoot = escapeHtml(options?.repoRoot ?? "No workspace folder");
  const statePath = escapeHtml(options?.statePath ?? ".track/state.yaml");
  const errorMessage = options?.errorMessage ? escapeHtml(options.errorMessage) : "";
  const barValue = snapshot ? `${snapshot.percentComplete}%` : "0%";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #0f1117;
        --panel: #171a23;
        --border: #343a4f;
        --text: #f1f5ff;
        --muted: #9ea9c7;
        --green: #6af19b;
        --yellow: #ffd84d;
        --red: #ff6c6c;
        --cyan: #66d7ff;
        --blue: #74a9ff;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(180deg, rgba(102, 215, 255, 0.08), transparent 35%),
          radial-gradient(circle at top right, rgba(116, 169, 255, 0.14), transparent 28%),
          var(--bg);
        color: var(--text);
        font: 13px/1.5 "Courier New", monospace;
      }

      .shell {
        max-width: 880px;
        margin: 0 auto;
        padding: 20px;
      }

      .panel {
        border: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 22%), var(--panel);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border);
      }

      .eyebrow,
      .meta-label {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .title {
        margin-top: 4px;
        font-size: 20px;
        font-weight: 700;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        color: ${snapshot ? healthColor(snapshot.health) : "var(--muted)"};
        background: rgba(255, 255, 255, 0.03);
      }

      .pill::before {
        content: "";
        width: 10px;
        height: 10px;
        background: currentColor;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding: 16px 18px 0;
      }

      .card {
        padding: 12px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.02);
      }

      .card-value {
        margin-top: 6px;
        font-size: 16px;
      }

      .bar-shell {
        padding: 16px 18px 0;
      }

      .bar-track {
        overflow: hidden;
        height: 16px;
        border: 1px solid var(--border);
        background: #0b0d12;
      }

      .bar-fill {
        height: 100%;
        width: ${barValue};
        background:
          repeating-linear-gradient(
            90deg,
            ${snapshot ? healthColor(snapshot.health) : "var(--blue)"} 0 10px,
            rgba(255, 255, 255, 0.22) 10px 11px
          );
      }

      .track-strip {
        margin-top: 10px;
        color: ${snapshot ? healthColor(snapshot.health) : "var(--muted)"};
        letter-spacing: 0.18em;
        white-space: pre;
      }

      .events,
      .footer {
        padding: 16px 18px;
      }

      .events {
        border-top: 1px solid var(--border);
        margin-top: 16px;
      }

      .event-list {
        margin: 10px 0 0;
        padding: 0;
        list-style: none;
      }

      .event-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-top: 1px dashed rgba(255, 255, 255, 0.08);
      }

      .event-item:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .event-summary {
        color: var(--text);
      }

      .event-time {
        color: var(--muted);
        white-space: nowrap;
      }

      .alert {
        margin: 16px 18px 0;
        padding: 12px;
        border: 1px solid var(--red);
        color: var(--red);
        background: rgba(255, 108, 108, 0.08);
      }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        border-top: 1px solid var(--border);
      }

      @media (max-width: 680px) {
        .grid {
          grid-template-columns: 1fr;
        }

        .header,
        .footer,
        .event-item {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="panel">
        <header class="header">
          <div>
            <div class="eyebrow">Track Companion</div>
            <div class="title">${escapeHtml(snapshot?.title ?? "Track companion unavailable")}</div>
          </div>
          <div class="pill">${escapeHtml(snapshot ? snapshot.health.toUpperCase() : "OFFLINE")}</div>
        </header>
        ${
          errorMessage
            ? `<div class="alert">${errorMessage}</div>`
            : ""
        }
        <div class="grid">
          <article class="card">
            <div class="meta-label">Project</div>
            <div class="card-value">${escapeHtml(snapshot?.projectName ?? "No workspace folder")}</div>
          </article>
          <article class="card">
            <div class="meta-label">Owner</div>
            <div class="card-value">${escapeHtml(snapshot?.currentOwner ?? "unassigned")}</div>
          </article>
          <article class="card">
            <div class="meta-label">Lap</div>
            <div class="card-value">${escapeHtml(snapshot?.activeLapLabel ?? "No laps defined")}</div>
          </article>
          <article class="card">
            <div class="meta-label">Checkpoint</div>
            <div class="card-value">${escapeHtml(snapshot?.activeCheckpointTitle ?? "No active checkpoint")}</div>
          </article>
          <article class="card">
            <div class="meta-label">Next Action</div>
            <div class="card-value">${escapeHtml(snapshot?.nextAction ?? "No next action recorded")}</div>
          </article>
          <article class="card">
            <div class="meta-label">Blocker</div>
            <div class="card-value">${escapeHtml(snapshot?.blockedReason ?? "clear")}</div>
          </article>
        </div>
        <section class="bar-shell">
          <div class="meta-label">Progress</div>
          <div class="bar-track">
            <div class="bar-fill"></div>
          </div>
          <div class="track-strip">${escapeHtml(buildTrackStrip(snapshot?.percentComplete ?? 0))}</div>
        </section>
        <section class="events">
          <div class="meta-label">Recent Events</div>
          <ul class="event-list">
            ${renderEvents(snapshot?.recentEvents ?? [])}
          </ul>
        </section>
        <footer class="footer">
          <div>Workspace: ${repoRoot}</div>
          <div>State: ${statePath}</div>
          <div>Rendered: ${generatedAt}</div>
        </footer>
      </section>
    </main>
  </body>
</html>`;
}

function coerceEvents(value: unknown): CompanionSnapshot["recentEvents"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 3).map((event) => {
    const source = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
    return {
      summary: sanitizeText(source.summary, "Event"),
      timestamp: sanitizeOptionalText(source.timestamp) ?? undefined,
    };
  });
}

function coerceHealth(value: unknown): CompanionSnapshot["health"] {
  if (value === "red" || value === "yellow" || value === "green") {
    return value;
  }
  return "green";
}

function clampPercent(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function sanitizeOptionalText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return sanitizeText(value, "");
}

function sanitizeText(value: unknown, fallback: string): string {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function renderEvents(events: CompanionSnapshot["recentEvents"]): string {
  if (!events.length) {
    return `<li class="event-item"><span class="event-summary">No events yet</span><span class="event-time">--</span></li>`;
  }

  return events
    .map(
      (event) => `<li class="event-item">
        <span class="event-summary">${escapeHtml(event.summary)}</span>
        <span class="event-time">${escapeHtml(formatTimestamp(event.timestamp))}</span>
      </li>`
    )
    .join("");
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildTrackStrip(percent: number): string {
  const total = 18;
  const filled = Math.max(0, Math.min(total - 1, Math.round((percent / 100) * (total - 1))));
  return Array.from({ length: total }, (_, index) => {
    if (index === filled) {
      return "@";
    }
    return index < filled ? "=" : "-";
  }).join("");
}

function healthColor(health: CompanionSnapshot["health"]): string {
  if (health === "red") {
    return "var(--red)";
  }
  if (health === "yellow") {
    return "var(--yellow)";
  }
  return "var(--green)";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
