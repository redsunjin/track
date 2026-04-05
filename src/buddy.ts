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
  const face = buddyFace(mood);
  const rawStrip = roadmap ? generateTrackMap(roadmap, state).map(glyphForBuddy).join("") : fallbackStrip(summary.percentComplete);

  const lines = [
    ".----------------------------.",
    `| ${palette.header("TRACK COMPANION")} ${moodTone(palette, mood, pad(mood.toUpperCase(), 10))} |`,
    "|----------------------------|",
    `| ${moodTone(palette, mood, pad(face, 28))}|`,
    `| FLAG  ${palette.health(summary.health, pad(summary.health.toUpperCase(), 16))}|`,
    `| LAP   ${palette.active(pad(trim(sanitizeInlineText(summary.activeLapLabel, "No laps"), 16), 16))}|`,
    `| CP    ${palette.active(pad(trim(sanitizeInlineText(summary.activeCheckpointTitle, "No checkpoint"), 16), 16))}|`,
    `| BAR   ${styleBuddyStrip(pad(trim(rawStrip, 16), 16), palette)}|`,
    `| NEXT  ${palette.label(pad(trim(sanitizeInlineText(summary.nextAction, "No next action"), 16), 16))}|`,
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

function buddyFace(mood: string): string {
  switch (mood) {
    case "blocked":
      return "x_x  [##]";
    case "caution":
      return "o_o  [==]";
    case "push":
      return "^_^  [>>]";
    default:
      return "-_-  [--]";
  }
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
