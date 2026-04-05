import { createPalette, type RenderOptions } from "./ansi.js";
import type { TrackSummary } from "./types.js";

export function renderStatus(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lines = [
    palette.header("TRACK // DRIVER HUD"),
    palette.divider(divider()),
    `PROJECT  ${summary.projectName}`,
    `TITLE    ${summary.title}`,
    `MODE     ${summary.mode}`,
    `FLAG     ${palette.health(summary.health, summary.health.toUpperCase())}`,
    `LAP      ${palette.active(summary.activeLapLabel)}`,
    `CP       ${palette.active(summary.activeCheckpointTitle)}`,
    `BAR      ${progressBar(summary.percentComplete, summary.health, palette)} ${palette.label(
      padLeft(`${summary.percentComplete}%`, 4)
    )}`,
    `OWNER    ${palette.info(summary.currentOwner ?? "unassigned")}`,
    `NEXT     ${palette.label(summary.nextAction)}`,
  ];

  if (summary.blockedReason) {
    lines.push(`BLOCK    ${palette.danger(summary.blockedReason)}`);
  }

  if (summary.openFlags.length) {
    lines.push(
      `FLAGS    ${summary.openFlags
        .map((flag) => palette.health(flag.level, `${flag.level.toUpperCase()} ${flag.title}`))
        .join(" | ")}`
    );
  }

  if (summary.recentEvents.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header("RECENT"));
    for (const event of summary.recentEvents) {
      lines.push(`> ${palette.muted(event.summary)}`);
    }
  }

  return lines.join("\n");
}

export function renderNext(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lines = [
    palette.header("TRACK // NEXT MOVE"),
    palette.divider(divider()),
    `FLAG     ${palette.health(summary.health, summary.health.toUpperCase())}`,
    `CP       ${palette.active(summary.activeCheckpointTitle)}`,
    `OWNER    ${palette.info(summary.currentOwner ?? "unassigned")}`,
    `NEXT     ${palette.label(summary.nextAction)}`,
  ];

  if (summary.blockedReason) {
    lines.push(`BLOCK    ${palette.danger(summary.blockedReason)}`);
  }

  return lines.join("\n");
}

function divider(): string {
  return "------------------------------------------------------------";
}

function progressBar(percent: number, health: TrackSummary["health"], palette: ReturnType<typeof createPalette>): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const total = 20;
  const filled = Math.round((clamped / 100) * total);
  return `[${palette.progressFilled(health, "#".repeat(filled))}${palette.progressEmpty(".".repeat(total - filled))}]`;
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${" ".repeat(width - value.length)}${value}`;
}
