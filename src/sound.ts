import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

import type { TrackEvent, TrackSummary } from "./types.js";

export type TrackSoundCue = "green" | "yellow" | "red" | "task-done" | "checkpoint-done" | "lap-done";
export type TrackSoundMode = "auto" | "afplay" | "bell";
export type TrackSoundTheme = "retro";

export interface TrackSoundOptions {
  enabled: boolean;
  mode: TrackSoundMode;
  theme: TrackSoundTheme;
}

export interface ResolveTrackSoundOptionsContext {
  json?: boolean;
}

export interface TrackSoundPlaybackResult {
  cue: TrackSoundCue;
  file?: string;
  method: "disabled" | "afplay" | "bell" | "unsupported";
  played: boolean;
}

interface TrackSoundPlaybackRuntime {
  existsSync?: (filePath: string) => boolean;
  platform?: NodeJS.Platform;
  spawn?: SpawnFn;
  stderr?: Pick<NodeJS.WriteStream, "write">;
}

type SpawnFn = (
  command: string,
  args: string[],
  options: { detached: true; stdio: "ignore" }
) => { unref?: () => void };

const DARWIN_RETRO_SOUND_FILES: Record<TrackSoundCue, string> = {
  green: "/System/Library/Sounds/Glass.aiff",
  yellow: "/System/Library/Sounds/Ping.aiff",
  red: "/System/Library/Sounds/Basso.aiff",
  "task-done": "/System/Library/Sounds/Pop.aiff",
  "checkpoint-done": "/System/Library/Sounds/Glass.aiff",
  "lap-done": "/System/Library/Sounds/Hero.aiff",
};
const DARWIN_AFPLAY = "/usr/bin/afplay";

export function resolveTrackSoundOptions(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  context: ResolveTrackSoundOptionsContext = {}
): TrackSoundOptions {
  const disabledByFlag = args.includes("--no-sound");
  const enabledByFlag = args.includes("--sound");
  const envSound = normalizeEnvToggle(env.TRACK_SOUND);
  const enabled = !context.json && !disabledByFlag && (enabledByFlag || envSound === true);

  return {
    enabled,
    mode: normalizeSoundMode(readFlag(args, "--sound-mode") ?? env.TRACK_SOUND_MODE),
    theme: normalizeSoundTheme(readFlag(args, "--sound-theme") ?? env.TRACK_SOUND_THEME ?? envSoundTheme(env.TRACK_SOUND)),
  };
}

export function soundCueFromSummary(summary: Pick<TrackSummary, "health" | "blockedReason">): TrackSoundCue {
  if (summary.health === "red" || summary.blockedReason) {
    return "red";
  }
  if (summary.health === "yellow") {
    return "yellow";
  }
  return "green";
}

export function soundCueFromEvent(event: Pick<TrackEvent, "type">, fallback: TrackSummary): TrackSoundCue {
  if (event.type === "task.completed") {
    return "task-done";
  }
  if (event.type === "checkpoint.advanced") {
    return "checkpoint-done";
  }
  if (event.type === "task.blocked") {
    return "red";
  }
  if (event.type === "task.unblocked" || event.type === "task.started") {
    return "green";
  }
  return soundCueFromSummary(fallback);
}

export function playTrackSound(
  cue: TrackSoundCue,
  options: TrackSoundOptions,
  runtime: TrackSoundPlaybackRuntime = {}
): TrackSoundPlaybackResult {
  if (!options.enabled) {
    return { cue, method: "disabled", played: false };
  }

  const platform = runtime.platform ?? process.platform;
  const exists = runtime.existsSync ?? existsSync;
  const spawnSound = runtime.spawn ?? spawn;

  if ((options.mode === "auto" || options.mode === "afplay") && platform === "darwin") {
    const file = resolveDarwinRetroSoundFile(cue);
    if (exists(file)) {
      try {
        const child = spawnSound(DARWIN_AFPLAY, [file], { detached: true, stdio: "ignore" });
        child.unref?.();
        return { cue, file, method: "afplay", played: true };
      } catch {
        if (options.mode === "afplay") {
          return { cue, file, method: "unsupported", played: false };
        }
      }
    } else if (options.mode === "afplay") {
      return { cue, file, method: "unsupported", played: false };
    }
  }

  if (options.mode === "auto" || options.mode === "bell") {
    (runtime.stderr ?? process.stderr).write(renderBellCue(cue));
    return { cue, method: "bell", played: true };
  }

  return { cue, method: "unsupported", played: false };
}

export function renderBellCue(cue: TrackSoundCue): string {
  const count = cue === "red" || cue === "lap-done" ? 3 : cue === "yellow" || cue === "checkpoint-done" ? 2 : 1;
  return "\u0007".repeat(count);
}

export function resolveDarwinRetroSoundFile(cue: TrackSoundCue): string {
  return DARWIN_RETRO_SOUND_FILES[cue];
}

function normalizeEnvToggle(raw: string | undefined): boolean | null {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on", "retro"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "none"].includes(normalized)) {
    return false;
  }
  return null;
}

function envSoundTheme(raw: string | undefined): string | undefined {
  return raw?.trim().toLowerCase() === "retro" ? "retro" : undefined;
}

function normalizeSoundMode(raw: string | undefined): TrackSoundMode {
  if (!raw) {
    return "auto";
  }
  if (raw === "auto" || raw === "afplay" || raw === "bell") {
    return raw;
  }
  throw new Error("`--sound-mode` must be one of auto, afplay, or bell.");
}

function normalizeSoundTheme(raw: string | undefined): TrackSoundTheme {
  if (!raw || raw === "retro") {
    return "retro";
  }
  throw new Error("`--sound-theme` must be `retro`.");
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}
