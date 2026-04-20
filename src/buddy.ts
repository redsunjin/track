import { createPalette, type RenderOptions } from "./ansi.js";
import { generateTrackMap } from "./generator.js";
import { sanitizeInlineText } from "./security.js";
import type { TrackRoadmapFile, TrackStateFile, TrackSummary } from "./types.js";

export function renderBuddy(
  summary: TrackSummary,
  roadmap?: TrackRoadmapFile,
  state?: TrackStateFile,
  options?: RenderOptions
): string {
  const palette = createPalette(options);
  const mood = buddyMood(summary);
  const rawStrip = roadmap ? generateTrackMap(roadmap, state).map(glyphForBuddy).join("") : fallbackStrip(summary.percentComplete);

  const lines = [
    ".----------------------------.",
    `| ${palette.header("TRACK COMPANION")} ${moodTone(palette, mood, pad(mood.toUpperCase(), 10))} |`,
    "|----------------------------|",
    `| ${moodTone(palette, mood, pad(`SIGNAL ${healthSignal(summary.health)}`, 28))}|`,
    `| ${palette.active(pad(`CHECK  ${trim(sanitizeInlineText(summary.activeCheckpointTitle, "No checkpoint"), 21)}`, 28))}|`,
    `| ${palette.info(pad(`CREW   ${trim(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"), 21)}`, 28))}|`,
    `| ${palette.active(pad(`LAP    ${trim(sanitizeInlineText(summary.activeLapLabel, "No laps"), 21)}`, 28))}|`,
    `| BAR   ${styleBuddyStrip(pad(trim(rawStrip, 22), 22), palette)}|`,
    `| ${palette.label(pad(`NEXT   ${trim(sanitizeInlineText(summary.nextAction, "No next action"), 21)}`, 28))}|`,
    ".----------------------------.",
  ];

  return lines.join("\n");
}

function buddyMood(summary: TrackSummary): "cruise" | "push" | "caution" | "blocked" {
  if (summary.blockedReason || summary.health === "red") {
    return "blocked";
  }
  if (summary.health === "yellow") {
    return "caution";
  }
  if (summary.percentComplete >= 70) {
    return "push";
  }
  return "cruise";
}

function glyphForBuddy(segment: { type: string; progressState: string }): string {
  const core =
    segment.type === "straight" || segment.type === "sprint"
      ? "="
      : segment.type === "sweep"
        ? "~"
        : segment.type === "chicane"
          ? "s"
          : segment.type === "hairpin"
            ? "u"
            : segment.type === "climb"
              ? "^"
              : segment.type === "pit"
                ? "p"
                : "y";

  if (segment.progressState === "done") {
    return core.toLowerCase();
  }
  if (segment.progressState === "active") {
    return "@";
  }
  return core.toUpperCase();
}

function fallbackStrip(percent: number): string {
  const total = 12;
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * total);
  return `${"=".repeat(filled)}@${"-".repeat(Math.max(0, total - filled - 1))}`;
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

function moodTone(palette: ReturnType<typeof createPalette>, mood: string, value: string): string {
  switch (mood) {
    case "blocked":
      return palette.danger(value);
    case "caution":
      return palette.caution(value);
    case "push":
      return palette.active(value);
    default:
      return palette.muted(value);
  }
}

function styleBuddyStrip(value: string, palette: ReturnType<typeof createPalette>): string {
  return [...value]
    .map((char) => {
      if (char === "@") {
        return palette.active(char);
      }
      if (char === "-" || char === " ") {
        return palette.muted(char);
      }
      if (/[a-z=]/.test(char)) {
        return palette.success(char);
      }
      return palette.caution(char);
    })
    .join("");
}

function trim(value: string, width: number): string {
  return value.length <= width ? value : `${value.slice(0, Math.max(0, width - 1))}…`;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}
