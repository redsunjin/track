import process from "node:process";

import type { SegmentType, TrackHealth, TrackStatus } from "./types.js";

const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const RED = "\u001b[91m";
const GREEN = "\u001b[92m";
const YELLOW = "\u001b[93m";
const BLUE = "\u001b[94m";
const CYAN = "\u001b[96m";
const WHITE = "\u001b[97m";

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

export interface RenderOptions {
  color?: boolean;
}

export interface SignalPalette {
  enabled: boolean;
  active: (text: string) => string;
  caution: (text: string) => string;
  danger: (text: string) => string;
  divider: (text: string) => string;
  header: (text: string) => string;
  health: (health: TrackHealth, text: string) => string;
  info: (text: string) => string;
  label: (text: string) => string;
  muted: (text: string) => string;
  progressEmpty: (text: string) => string;
  progressFilled: (health: TrackHealth, text: string) => string;
  segment: (type: SegmentType, progressState: "active" | "done" | "upcoming", text: string) => string;
  status: (status: TrackStatus, text: string) => string;
  success: (text: string) => string;
}

export function createPalette(options?: RenderOptions): SignalPalette {
  const enabled = resolveColorEnabled(options?.color);
  const wrap = (text: string, ...codes: string[]): string => {
    if (!enabled || !text) {
      return text;
    }
    return `${codes.join("")}${text}${RESET}`;
  };

  return {
    enabled,
    active: (text) => wrap(text, BOLD, CYAN),
    caution: (text) => wrap(text, BOLD, YELLOW),
    danger: (text) => wrap(text, BOLD, RED),
    divider: (text) => wrap(text, DIM),
    header: (text) => wrap(text, BOLD, WHITE),
    health: (health, text) => {
      if (health === "red") {
        return wrap(text, BOLD, RED);
      }
      if (health === "yellow") {
        return wrap(text, BOLD, YELLOW);
      }
      return wrap(text, BOLD, GREEN);
    },
    info: (text) => wrap(text, BLUE),
    label: (text) => wrap(text, WHITE),
    muted: (text) => wrap(text, DIM),
    progressEmpty: (text) => wrap(text, DIM),
    progressFilled: (health, text) => {
      if (health === "red") {
        return wrap(text, BOLD, RED);
      }
      if (health === "yellow") {
        return wrap(text, BOLD, YELLOW);
      }
      return wrap(text, BOLD, GREEN);
    },
    segment: (type, progressState, text) => {
      if (progressState === "active") {
        return wrap(text, BOLD, CYAN);
      }
      if (progressState === "done") {
        return wrap(text, GREEN);
      }
      switch (type) {
        case "pit":
          return wrap(text, BLUE);
        case "climb":
        case "chicane":
          return wrap(text, YELLOW);
        case "hairpin":
          return wrap(text, RED);
        case "fork":
        case "sweep":
          return wrap(text, CYAN);
        case "sprint":
          return wrap(text, GREEN);
        default:
          return wrap(text, WHITE);
      }
    },
    status: (status, text) => {
      if (status === "blocked") {
        return wrap(text, BOLD, RED);
      }
      if (status === "doing") {
        return wrap(text, BOLD, CYAN);
      }
      if (status === "done") {
        return wrap(text, GREEN);
      }
      return wrap(text, DIM);
    },
    success: (text) => wrap(text, BOLD, GREEN),
  };
}

export function resolveColorEnabled(preferred?: boolean): boolean {
  if (typeof preferred === "boolean") {
    return preferred;
  }
  if (Object.prototype.hasOwnProperty.call(process.env, "NO_COLOR")) {
    return false;
  }
  const force = process.env.FORCE_COLOR;
  if (force && force !== "0") {
    return true;
  }
  if (process.env.TERM === "dumb") {
    return false;
  }
  return Boolean(process.stdout.isTTY);
}

export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

export function visibleLength(value: string): number {
  return stripAnsi(value).length;
}

export function padVisible(value: string, width: number): string {
  const length = visibleLength(value);
  return length >= width ? value : `${value}${" ".repeat(width - length)}`;
}

export function padLeftVisible(value: string, width: number): string {
  const length = visibleLength(value);
  return length >= width ? value : `${" ".repeat(width - length)}${value}`;
}
