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
  const progressDigits = String(snapshot?.percentComplete ?? 0).padStart(3, "0");
  const telemetryStrip = escapeHtml(buildTrackStrip(snapshot?.percentComplete ?? 0));
  const checkpointTitle = escapeHtml(snapshot?.activeCheckpointTitle ?? "No active checkpoint");
  const nextAction = escapeHtml(snapshot?.nextAction ?? "No next action recorded");
  const owner = escapeHtml(snapshot?.currentOwner ?? "unassigned");
  const lap = escapeHtml(snapshot?.activeLapLabel ?? "No laps defined");
  const blocker = escapeHtml(snapshot?.blockedReason ?? "clear");
  const signalLabel = escapeHtml(snapshot ? healthSignal(snapshot.health) : "Offline");
  const signalClass = snapshot ? `signal-${snapshot.health}` : "signal-offline";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #070b14;
        --panel: rgba(8, 13, 26, 0.92);
        --panel-2: rgba(11, 18, 34, 0.88);
        --border: rgba(111, 205, 255, 0.22);
        --border-strong: rgba(255, 191, 79, 0.35);
        --text: #edf4ff;
        --muted: #8fa3c8;
        --green: #63f3a6;
        --yellow: #ffd35c;
        --red: #ff6f7d;
        --cyan: #66dcff;
        --amber: #ffb84d;
        --grid: rgba(102, 220, 255, 0.07);
        --shadow: rgba(0, 0, 0, 0.34);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(180deg, rgba(102, 220, 255, 0.1), transparent 24%),
          radial-gradient(circle at top right, rgba(255, 184, 77, 0.14), transparent 24%),
          linear-gradient(90deg, transparent 0 8%, rgba(102, 220, 255, 0.05) 8% 8.2%, transparent 8.2% 100%),
          var(--bg);
        color: var(--text);
        font: 13px/1.55 "SFMono-Regular", "IBM Plex Mono", "Cascadia Code", monospace;
        position: relative;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(transparent 0 92%, rgba(255, 255, 255, 0.028) 92% 100%),
          linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 72px),
          linear-gradient(var(--grid) 0 1px, transparent 1px 54px);
        background-size: 100% 6px, 72px 100%, 100% 54px;
        opacity: 0.34;
      }

      .shell {
        max-width: 1080px;
        margin: 0 auto;
        padding: 24px;
      }

      .panel {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 18%),
          linear-gradient(135deg, rgba(255, 184, 77, 0.06), transparent 26%),
          var(--panel);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 28px 60px var(--shadow);
      }

      .panel::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(180deg, rgba(102, 220, 255, 0.08), transparent 38%),
          linear-gradient(0deg, rgba(255, 184, 77, 0.05), transparent 22%);
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        padding: 18px 22px 14px;
        border-bottom: 1px solid rgba(102, 220, 255, 0.14);
        position: relative;
        z-index: 1;
      }

      .eyebrow,
      .meta-label {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .title {
        margin-top: 4px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .subtitle {
        margin-top: 10px;
        color: var(--muted);
        max-width: 44ch;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        color: ${snapshot ? healthColor(snapshot.health) : "var(--muted)"};
        background: rgba(255, 255, 255, 0.04);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 700;
      }

      .pill::before {
        content: "";
        width: 10px;
        height: 10px;
        background: currentColor;
        box-shadow: 0 0 14px currentColor;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.95fr);
        gap: 18px;
        padding: 20px 22px 0;
        position: relative;
        z-index: 1;
      }

      .hero-main,
      .telemetry-bank,
      .events,
      .footer {
        position: relative;
        z-index: 1;
      }

      .hero-main {
        padding: 18px;
        border: 1px solid var(--border);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 24%),
          var(--panel-2);
      }

      .hero-topline {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
      }

      .project-chip {
        color: var(--amber);
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .checkpoint-display {
        margin-top: 18px;
      }

      .checkpoint-display .meta-label {
        color: var(--cyan);
      }

      .checkpoint-title {
        margin-top: 10px;
        font-size: clamp(24px, 3.2vw, 40px);
        line-height: 1.08;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        text-wrap: balance;
      }

      .next-line {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid rgba(102, 220, 255, 0.16);
      }

      .next-value {
        margin-top: 8px;
        color: var(--amber);
        font-size: 16px;
      }

      .progress-rack {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 18px;
        align-items: end;
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid rgba(102, 220, 255, 0.16);
      }

      .rack-display {
        text-align: right;
      }

      .rack-label {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 11px;
      }

      .rack-value {
        font-size: clamp(36px, 4vw, 56px);
        line-height: 0.95;
        color: var(--amber);
        text-shadow: 0 0 18px rgba(255, 184, 77, 0.2);
      }

      .rack-unit {
        display: inline-block;
        margin-left: 8px;
        font-size: 14px;
        color: var(--muted);
        letter-spacing: 0.12em;
      }

      .sector-rail {
        display: flex;
        gap: 6px;
        margin-top: 10px;
        align-items: center;
      }

      .bar-track {
        overflow: hidden;
        height: 18px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
          #050910;
      }

      .bar-fill {
        height: 100%;
        width: ${barValue};
        background:
          repeating-linear-gradient(
            90deg,
            ${snapshot ? healthColor(snapshot.health) : "var(--cyan)"} 0 12px,
            rgba(255, 255, 255, 0.22) 12px 13px
          );
      }

      .track-strip {
        margin-top: 10px;
        color: var(--cyan);
        letter-spacing: 0.28em;
        white-space: pre;
        font-size: 13px;
      }

      .telemetry-bank {
        display: grid;
        gap: 12px;
      }

      .bank-panel {
        padding: 14px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.03);
      }

      .signal-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--border-strong);
        background:
          linear-gradient(90deg, rgba(255, 184, 77, 0.09), transparent 60%),
          rgba(255, 255, 255, 0.03);
      }

      .signal-banner .meta-label {
        color: var(--amber);
      }

      .signal-word {
        margin-top: 6px;
        font-size: 19px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .signal-word.signal-green {
        color: var(--green);
      }

      .signal-word.signal-yellow {
        color: var(--yellow);
      }

      .signal-word.signal-red {
        color: var(--red);
      }

      .signal-word.signal-offline {
        color: var(--muted);
      }

      .signal-lamps {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .lamp {
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.025);
      }

      .lamp-value {
        margin-top: 6px;
        font-size: 15px;
        color: var(--text);
        word-break: break-word;
      }

      .lower-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 0.92fr);
        gap: 18px;
        padding: 18px 22px 0;
        position: relative;
        z-index: 1;
      }

      .events,
      .footer {
        padding: 16px 18px;
      }

      .events {
        border-top: 1px solid rgba(102, 220, 255, 0.14);
        margin-top: 18px;
        background: rgba(255, 255, 255, 0.015);
      }

      .diagnostic-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .diagnostic-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 8px;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
      }

      .diagnostic-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .diagnostic-value {
        max-width: 60%;
        text-align: right;
        color: var(--cyan);
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
        padding: 10px 0;
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
        border-top: 1px solid rgba(102, 220, 255, 0.14);
      }

      @media (max-width: 860px) {
        .hero,
        .lower-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 680px) {
        .header,
        .footer,
        .event-item,
        .hero-topline,
        .diagnostic-row,
        .signal-banner {
          flex-direction: column;
        }

        .signal-lamps {
          grid-template-columns: 1fr;
        }

        .progress-rack {
          grid-template-columns: 1fr;
        }

        .rack-display {
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="panel">
        <header class="header">
          <div>
            <div class="eyebrow">Track Companion // Retro Telemetry</div>
            <div class="title">${escapeHtml(snapshot?.title ?? "Track companion unavailable")}</div>
            <div class="subtitle">Driver HUD signals first. Decorative retro cues only where they improve scan speed.</div>
          </div>
          <div class="pill">${escapeHtml(snapshot ? snapshot.health.toUpperCase() : "OFFLINE")}</div>
        </header>
        ${
          errorMessage
            ? `<div class="alert">${errorMessage}</div>`
            : ""
        }
        <section class="hero">
          <article class="hero-main">
            <div class="hero-topline">
              <div>
                <div class="meta-label">Project</div>
                <div class="project-chip">${escapeHtml(snapshot?.projectName ?? "No workspace folder")}</div>
              </div>
              <div class="meta-label">Driver Board</div>
            </div>
            <div class="checkpoint-display">
              <div class="meta-label">Current Checkpoint</div>
              <div class="checkpoint-title">${checkpointTitle}</div>
            </div>
            <div class="next-line">
              <div class="meta-label">Next Action</div>
              <div class="next-value">${nextAction}</div>
            </div>
            <div class="progress-rack">
              <div>
                <div class="meta-label">Sector Rail</div>
                <div class="bar-track">
                  <div class="bar-fill"></div>
                </div>
                <div class="track-strip">${telemetryStrip}</div>
              </div>
              <div class="rack-display">
                <div class="rack-label">Progress</div>
                <div class="rack-value">${progressDigits}<span class="rack-unit">%</span></div>
              </div>
            </div>
          </article>
          <aside class="telemetry-bank">
            <section class="signal-banner">
              <div>
                <div class="meta-label">Signal Bank</div>
                <div class="signal-word ${signalClass}">${signalLabel}</div>
              </div>
              <div class="meta-label">Live</div>
            </section>
            <section class="bank-panel">
              <div class="meta-label">Telemetry Lamps</div>
              <div class="signal-lamps">
                <article class="lamp">
                  <div class="meta-label">Owner</div>
                  <div class="lamp-value">${owner}</div>
                </article>
                <article class="lamp">
                  <div class="meta-label">Lap</div>
                  <div class="lamp-value">${lap}</div>
                </article>
                <article class="lamp">
                  <div class="meta-label">Blocker</div>
                  <div class="lamp-value">${blocker}</div>
                </article>
                <article class="lamp">
                  <div class="meta-label">State Path</div>
                  <div class="lamp-value">${statePath}</div>
                </article>
              </div>
            </section>
          </aside>
        </section>
        <section class="lower-grid">
          <section class="events bank-panel">
            <div class="meta-label">Recent Events</div>
            <ul class="event-list">
              ${renderEvents(snapshot?.recentEvents ?? [])}
            </ul>
          </section>
          <section class="bank-panel">
            <div class="meta-label">Telemetry Dossier</div>
            <div class="diagnostic-list">
              <div class="diagnostic-row">
                <span class="meta-label">Workspace</span>
                <span class="diagnostic-value">${repoRoot}</span>
              </div>
              <div class="diagnostic-row">
                <span class="meta-label">Rendered</span>
                <span class="diagnostic-value">${generatedAt}</span>
              </div>
              <div class="diagnostic-row">
                <span class="meta-label">Checkpoint</span>
                <span class="diagnostic-value">${checkpointTitle}</span>
              </div>
              <div class="diagnostic-row">
                <span class="meta-label">Next Move</span>
                <span class="diagnostic-value">${nextAction}</span>
              </div>
            </div>
          </section>
        </section>
        <footer class="footer">
          <div>Track Companion</div>
          <div>Telemetry shell active</div>
          <div>Workspace: ${repoRoot}</div>
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

function healthSignal(health: CompanionSnapshot["health"]): string {
  if (health === "red") {
    return "Red Flag";
  }
  if (health === "yellow") {
    return "Yellow Flag";
  }
  return "Green Flag";
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
