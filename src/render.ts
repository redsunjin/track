import { createPalette, type RenderOptions } from "./ansi.js";
import { field, healthSignal, msg, renderLanguage } from "./i18n.js";
import { sanitizeInlineText } from "./security.js";
import type { TrackSummary } from "./types.js";

export function renderStatus(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lang = renderLanguage(options);
  const lines = [
    palette.header(msg(lang, "statusHeader")),
    palette.divider(divider()),
    `${field(lang, "signal")} ${palette.health(summary.health, healthSignal(summary.health, lang))}`,
    `${field(lang, "check")} ${palette.active(sanitizeInlineText(summary.activeCheckpointTitle, "No active checkpoint"))}`,
    `${field(lang, "next")} ${palette.label(sanitizeInlineText(summary.nextAction, "No next action recorded"))}`,
    `${field(lang, "crew")} ${palette.info(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"))}`,
    `${field(lang, "lap")} ${palette.active(sanitizeInlineText(summary.activeLapLabel, "No laps defined"))}`,
    `${field(lang, "bar")} ${progressBar(summary.percentComplete, summary.health, palette)} ${palette.label(
      padLeft(`${summary.percentComplete}%`, 4)
    )}`,
    palette.divider(divider()),
    `${field(lang, "project")} ${sanitizeInlineText(summary.projectName, "unknown")}`,
    `${field(lang, "title")} ${sanitizeInlineText(summary.title, "Untitled track")}`,
    `${field(lang, "mode")} ${sanitizeInlineText(summary.mode, "circuit")}`,
  ];

  if (summary.blockedReason) {
    lines.push(`${field(lang, "block")} ${palette.danger(sanitizeInlineText(summary.blockedReason))}`);
  }

  if (summary.openFlags.length) {
    lines.push(
      `${field(lang, "flags")} ${summary.openFlags
        .map((flag) => palette.health(flag.level, `${flag.level.toUpperCase()} ${sanitizeInlineText(flag.title, "Flag")}`))
        .join(" | ")}`
    );
  }

  if (summary.recentEvents.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header(msg(lang, "recent")));
    for (const event of summary.recentEvents) {
      lines.push(`> ${palette.muted(sanitizeInlineText(event.summary, "Event"))}`);
    }
  }

  return lines.join("\n");
}

export function renderNext(summary: TrackSummary, options?: RenderOptions): string {
  const palette = createPalette(options);
  const lang = renderLanguage(options);
  const lines = [
    palette.header(msg(lang, "nextHeader")),
    palette.divider(divider()),
    `${field(lang, "signal")} ${palette.health(summary.health, healthSignal(summary.health, lang))}`,
    `${field(lang, "check")} ${palette.active(sanitizeInlineText(summary.activeCheckpointTitle, "No active checkpoint"))}`,
    `${field(lang, "crew")} ${palette.info(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"))}`,
    `${field(lang, "lap")} ${palette.active(sanitizeInlineText(summary.activeLapLabel, "No laps defined"))}`,
    `${field(lang, "next")} ${palette.label(sanitizeInlineText(summary.nextAction, "No next action recorded"))}`,
  ];

  if (summary.blockedReason) {
    lines.push(`${field(lang, "block")} ${palette.danger(sanitizeInlineText(summary.blockedReason))}`);
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
