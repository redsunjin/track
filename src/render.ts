import { createPalette, type RenderOptions } from "./ansi.js";
import { sanitizeInlineText } from "./security.js";
import type { TrackSummary } from "./types.js";

export function renderStatus(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lines = [
    palette.header("TRACK // DRIVER HUD"),
    palette.divider(divider()),
    `SIGNAL   ${palette.health(summary.health, healthSignal(summary.health))}`,
    `CHECK    ${palette.active(sanitizeInlineText(summary.activeCheckpointTitle, "No active checkpoint"))}`,
    `NEXT     ${palette.label(sanitizeInlineText(summary.nextAction, "No next action recorded"))}`,
    `CREW     ${palette.info(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"))}`,
    `LAP      ${palette.active(sanitizeInlineText(summary.activeLapLabel, "No laps defined"))}`,
    `BAR      ${progressBar(summary.percentComplete, summary.health, palette)} ${palette.label(
      padLeft(`${summary.percentComplete}%`, 4)
    )}`,
    palette.divider(divider()),
    `PROJECT  ${sanitizeInlineText(summary.projectName, "unknown")}`,
    `TITLE    ${sanitizeInlineText(summary.title, "Untitled track")}`,
    `MODE     ${sanitizeInlineText(summary.mode, "circuit")}`,
  ];

  if (summary.blockedReason) {
    lines.push(`BLOCK    ${palette.danger(sanitizeInlineText(summary.blockedReason))}`);
  }

  if (summary.openFlags.length) {
    lines.push(
      `FLAGS    ${summary.openFlags
        .map((flag) => palette.health(flag.level, `${flag.level.toUpperCase()} ${sanitizeInlineText(flag.title, "Flag")}`))
        .join(" | ")}`
    );
  }

  if (summary.recentEvents.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header("RECENT"));
    for (const event of summary.recentEvents) {
      lines.push(`> ${palette.muted(sanitizeInlineText(event.summary, "Event"))}`);
    }
  }

  return lines.join("\n");
}

export function renderNext(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lines = [
    palette.header("TRACK // NEXT MOVE"),
    palette.divider(divider()),
    `SIGNAL   ${palette.health(summary.health, healthSignal(summary.health))}`,
    `CHECK    ${palette.active(sanitizeInlineText(summary.activeCheckpointTitle, "No active checkpoint"))}`,
    `CREW     ${palette.info(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"))}`,
    `LAP      ${palette.active(sanitizeInlineText(summary.activeLapLabel, "No laps defined"))}`,
    `NEXT     ${palette.label(sanitizeInlineText(summary.nextAction, "No next action recorded"))}`,
  ];

  if (summary.blockedReason) {
    lines.push(`BLOCK    ${palette.danger(sanitizeInlineText(summary.blockedReason))}`);
  }

  return lines.join("\n");
}

function divider(): string {
  return "------------------------------------------------------------";
}

function healthSignal(health: TrackSummary["health"]): string {
  if (health === "red") {
    return "RED FLAG";
  }
  if (health === "yellow") {
    return "YELLOW FLAG";
  }
  return "GREEN FLAG";
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
