import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { createPalette, padVisible, type RenderOptions } from "./ansi.js";
import { generateTrackMap } from "./generator.js";
import { loadTrackRoadmap } from "./roadmap.js";
import { sanitizeInlineText } from "./security.js";
import { loadTrackState } from "./state.js";
import { summarizeTrack } from "./summary.js";
import type {
  PitwallDetail,
  PitwallEntry,
  PitwallMetrics,
  PitwallOwnerLoad,
  PitwallStaleState,
  SegmentType,
  TrackHealth,
  TrackStateFile,
  TrackSummary,
} from "./types.js";

const STATE_CANDIDATES = [
  path.join(".track", "state.yaml"),
  path.join(".track", "state.yml"),
  path.join(".track", "state.json"),
];

interface PitwallScanOptions {
  now?: Date;
}

export async function scanPitwall(root: string, options?: PitwallScanOptions): Promise<PitwallEntry[]> {
  const entries: PitwallEntry[] = [];
  const repoPaths = await discoverTrackRepos(root);
  const now = options?.now ?? new Date();

  for (const repoPath of repoPaths) {
    try {
      const state = await loadTrackState(repoPath);
      const summary = summarizeTrack(state);
      entries.push({
        metrics: computePitwallMetrics(state, summary, now),
        repoPath,
        summary,
      });
    } catch {
      continue;
    }
  }

  return entries.sort(comparePitwallEntries);
}

export function renderPitwall(root: string, entries: PitwallEntry[], options?: RenderOptions): string {
  const palette = createPalette(options);
  const active = entries.length;
  const blocked = entries.filter((entry) => Boolean(entry.summary.blockedReason)).length;
  const red = entries.filter((entry) => entry.summary.health === "red").length;
  const yellow = entries.filter((entry) => entry.summary.health === "yellow").length;
  const green = entries.filter((entry) => entry.summary.health === "green").length;

  const lines = [
    palette.header("Pitwall // Race Control"),
    palette.divider(divider()),
    `ROOT     ${sanitizeInlineText(root, ".")}`,
    `SUMMARY  P:${active}  R:${palette.danger(String(red))}  Y:${palette.caution(String(yellow))}  G:${palette.success(
      String(green)
    )}  B:${blocked}`,
    palette.divider(divider()),
  ];

  if (entries.length === 0) {
    lines.push(palette.muted("NO TRACK PROJECTS FOUND"));
    return lines.join("\n");
  }

  lines.push(palette.header("FLAG   PROJECT            BAR                    OWNER        CHECKPOINT"));
  lines.push(palette.divider(divider()));

  for (const entry of entries) {
    const name = path.basename(entry.repoPath);
    const summary = entry.summary;
    const metrics = resolveMetrics(entry);
    const age = formatAge(metrics.updateAgeMinutes);
    const pace = formatPace(metrics.paceDeltaPercent);
    lines.push(
      `${palette.health(summary.health, pad(flagCode(summary.health), 6))} ${pad(sanitizeInlineText(name, "unknown"), 18)} ${padVisible(
        progressBar(summary.percentComplete, summary.health, palette),
        22
      )} ${palette.info(pad(sanitizeInlineText(summary.currentOwner ?? "unassigned", "unassigned"), 12))} ${highlightCheckpoint(
        summary.health,
        summary.activeCheckpointTitle,
        palette
      )}`
    );
    lines.push(`  LAP    ${palette.active(sanitizeInlineText(summary.activeLapLabel, "No laps defined"))}`);
    lines.push(
      `  AGE    ${colorAge(metrics.staleState, age, palette)}  PACE  ${colorPace(metrics.paceDeltaPercent, pace, palette)}`
    );
    lines.push(`  NEXT   ${palette.label(sanitizeInlineText(summary.nextAction, "No next action recorded"))}`);
    if (summary.blockedReason) {
      lines.push(`  BLOCK  ${palette.danger(sanitizeInlineText(summary.blockedReason))}`);
    }
    lines.push(palette.divider(divider()));
  }

  return lines.join("\n");
}

export function renderPitwallQueue(root: string, entries: PitwallEntry[], options?: RenderOptions): string {
  const palette = createPalette(options);
  const queued = [...entries]
    .filter((entry) => {
      const metrics = resolveMetrics(entry);
      return entry.summary.blockedReason || entry.summary.health !== "green" || metrics.staleState === "stale";
    })
    .sort((a, b) => comparePitwallEntries(a, b));

  const lines = [
    palette.header("Pitwall // Queue"),
    palette.divider(divider()),
    `ROOT     ${sanitizeInlineText(root, ".")}`,
    `ITEMS    ${queued.length}`,
    palette.divider(divider()),
  ];

  if (!queued.length) {
    lines.push(palette.success("QUEUE CLEAR"));
    return lines.join("\n");
  }

  lines.push(palette.header("FLAG   PROJECT            OWNER        AGE    PACE   ISSUE"));
  lines.push(palette.divider(divider()));

  for (const entry of queued) {
    const name = path.basename(entry.repoPath);
    const issue = sanitizeInlineText(entry.summary.blockedReason ?? entry.summary.nextAction, "No issue recorded");
    const metrics = resolveMetrics(entry);
    const age = formatAge(metrics.updateAgeMinutes);
    const pace = formatPace(metrics.paceDeltaPercent);
    lines.push(
      `${palette.health(entry.summary.health, pad(flagCode(entry.summary.health), 6))} ${pad(
        sanitizeInlineText(name, "unknown"),
        18
      )} ${palette.info(
        pad(sanitizeInlineText(entry.summary.currentOwner ?? "unassigned", "unassigned"), 12)
      )} ${pad(colorAge(metrics.staleState, age, palette), 6)} ${pad(
        colorPace(metrics.paceDeltaPercent, pace, palette),
        6
      )} ${entry.summary.blockedReason ? palette.danger(issue) : metrics.staleState === "stale" ? colorAge(metrics.staleState, issue, palette) : palette.caution(issue)}`
    );
  }

  return lines.join("\n");
}

export async function loadPitwallDetail(root: string, selector: string, options?: PitwallScanOptions): Promise<PitwallDetail> {
  const repoPath = await resolvePitwallRepo(root, selector);
  const state = await loadTrackState(repoPath);
  const summary = summarizeTrack(state);
  const roadmap = await loadTrackRoadmap(repoPath).catch(() => undefined);
  const segments = roadmap ? generateTrackMap(roadmap, state) : undefined;

  return {
    metrics: computePitwallMetrics(state, summary, options?.now ?? new Date()),
    repoPath,
    state,
    summary,
    roadmap,
    segments,
  };
}

export async function loadPitwallOwnerLoad(root: string, options?: PitwallScanOptions): Promise<PitwallOwnerLoad[]> {
  const repoPaths = await discoverTrackRepos(root);
  const ownerMap = new Map<string, PitwallOwnerLoad>();
  const now = options?.now ?? new Date();

  for (const repoPath of repoPaths) {
    try {
      const state = await loadTrackState(repoPath);
      const summary = summarizeTrack(state);
      const metrics = computePitwallMetrics(state, summary, now);
      const tasks = (state.tasks ?? []).filter((task) => task.status === "doing" || task.status === "blocked");

      if (!tasks.length && summary.currentOwner) {
        upsertOwner(ownerMap, summary.currentOwner, repoPath, summary.activeCheckpointTitle, false, metrics.activeTaskCount);
      }

      for (const task of tasks) {
        upsertOwner(ownerMap, task.owner ?? "unassigned", repoPath, task.title, task.status === "blocked", 1);
      }
    } catch {
      continue;
    }
  }

  return [...ownerMap.values()].sort(compareOwnerLoad);
}

export function renderPitwallDetail(detail: PitwallDetail, options?: RenderOptions): string {
  const palette = createPalette(options);
  const repoName = path.basename(detail.repoPath);
  const metrics = detail.metrics ?? {
    activeTaskCount: 0,
    blockedTaskCount: detail.summary.blockedReason ? 1 : 0,
    lastEventAt: null,
    paceDeltaPercent: null,
    staleState: "unknown" as const,
    updateAgeMinutes: null,
  };
  const lines = [
    palette.header("Pitwall // Detail"),
    palette.divider(divider()),
    `PROJECT  ${sanitizeInlineText(repoName, "unknown")}`,
    `PATH     ${sanitizeInlineText(detail.repoPath, ".")}`,
    `FLAG     ${palette.health(detail.summary.health, detail.summary.health.toUpperCase())}`,
    `LAP      ${palette.active(sanitizeInlineText(detail.summary.activeLapLabel, "No laps defined"))}`,
    `CP       ${palette.active(sanitizeInlineText(detail.summary.activeCheckpointTitle, "No active checkpoint"))}`,
    `BAR      ${progressBar(detail.summary.percentComplete, detail.summary.health, palette)} ${palette.label(
      padLeft(`${detail.summary.percentComplete}%`, 4)
    )}`,
    `OWNER    ${palette.info(sanitizeInlineText(detail.summary.currentOwner ?? "unassigned", "unassigned"))}`,
    `AGE      ${colorAge(metrics.staleState, formatAge(metrics.updateAgeMinutes), palette)}`,
    `PACE     ${colorPace(metrics.paceDeltaPercent, formatPace(metrics.paceDeltaPercent), palette)}`,
    `NEXT     ${palette.label(sanitizeInlineText(detail.summary.nextAction, "No next action recorded"))}`,
  ];

  if (detail.summary.blockedReason) {
    lines.push(`BLOCK    ${palette.danger(sanitizeInlineText(detail.summary.blockedReason))}`);
  }

  if (detail.segments?.length) {
    lines.push(palette.divider(divider()));
    lines.push(`COURSE   ${detail.segments.map((segment) => renderSegmentGlyph(segment, palette)).join(palette.divider("-"))}`);
  }

  const activeTasks = (detail.state.tasks ?? []).filter((task) => task.status !== "done");
  if (activeTasks.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header("TASKS"));
    for (const task of activeTasks) {
      lines.push(
        `${palette.status(task.status, pad(task.status.toUpperCase(), 8))} ${pad(
          sanitizeInlineText(task.id, "task"),
          10
        )} ${palette.info(pad(sanitizeInlineText(task.owner ?? "unassigned", "unassigned"), 12))} ${sanitizeInlineText(
          task.title,
          "Untitled task"
        )}`
      );
    }
  }

  if (detail.summary.openFlags.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header("FLAGS"));
    for (const flag of detail.summary.openFlags) {
      lines.push(
        `${palette.health(flag.level, pad(flag.level.toUpperCase(), 8))} ${sanitizeInlineText(
          flag.title,
          "Flag"
        )}${flag.detail ? ` :: ${sanitizeInlineText(flag.detail)}` : ""}`
      );
    }
  }

  if (detail.summary.recentEvents.length) {
    lines.push(palette.divider(divider()));
    lines.push(palette.header("RECENT"));
    for (const event of detail.summary.recentEvents) {
      lines.push(`> ${palette.muted(sanitizeInlineText(event.summary, "Event"))}`);
    }
  }

  return lines.join("\n");
}

export function renderPitwallOwners(root: string, owners: PitwallOwnerLoad[], options?: RenderOptions): string {
  const palette = createPalette(options);
  const lines = [
    palette.header("Pitwall // Owner Load"),
    palette.divider(divider()),
    `ROOT     ${sanitizeInlineText(root, ".")}`,
    `OWNERS   ${owners.length}`,
    palette.divider(divider()),
  ];

  if (!owners.length) {
    lines.push(palette.muted("NO ACTIVE OWNERS"));
    return lines.join("\n");
  }

  lines.push(palette.header("OWNER        ACTIVE  BLOCKED  PROJECTS  FOCUS"));
  lines.push(palette.divider(divider()));
  for (const owner of owners) {
    const focus = sanitizeInlineText(owner.checkpoints.slice(0, 2).join(" | "), "none");
    lines.push(
      `${palette.info(pad(sanitizeInlineText(owner.owner, "unassigned"), 12))} ${padLeft(String(owner.activeTasks), 6)}  ${padLeft(
        String(owner.blockedTasks),
        7
      )}  ${padLeft(String(owner.activeProjects), 8)}  ${owner.blockedTasks ? palette.danger(focus) : palette.label(focus || "none")}`
    );
  }

  return lines.join("\n");
}

export async function resolvePitwallRepo(root: string, selector: string): Promise<string> {
  const entries = await discoverTrackRepos(root);
  const normalizedSelector = selector.trim();

  const exactPath = entries.find((repoPath) => path.resolve(repoPath) === path.resolve(root, normalizedSelector));
  if (exactPath) {
    return exactPath;
  }

  const byBaseName = entries.find((repoPath) => path.basename(repoPath) === normalizedSelector);
  if (byBaseName) {
    return byBaseName;
  }

  const partial = entries.find((repoPath) => repoPath.includes(normalizedSelector));
  if (partial) {
    return partial;
  }

  throw new Error(`No Track project matched selector: ${selector}`);
}

async function discoverTrackRepos(root: string): Promise<string[]> {
  const results = new Set<string>();

  if (await hasTrackState(root)) {
    results.add(path.resolve(root));
  }

  const dirents = await readdir(root, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isDirectory() && !dirent.isSymbolicLink()) {
      continue;
    }

    const repoPath = path.join(root, dirent.name);
    if (await hasTrackState(repoPath)) {
      results.add(path.resolve(repoPath));
    }
  }

  return [...results];
}

async function hasTrackState(repoPath: string): Promise<boolean> {
  for (const candidate of STATE_CANDIDATES) {
    try {
      await access(path.join(repoPath, candidate));
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

function comparePitwallEntries(a: PitwallEntry, b: PitwallEntry): number {
  const metricsA = resolveMetrics(a);
  const metricsB = resolveMetrics(b);
  return (
    blockedRank(a) - blockedRank(b) ||
    severityRank(a.summary.health) - severityRank(b.summary.health) ||
    staleRank(metricsA.staleState) - staleRank(metricsB.staleState) ||
    paceRank(metricsA.paceDeltaPercent) - paceRank(metricsB.paceDeltaPercent) ||
    a.summary.percentComplete - b.summary.percentComplete
  );
}

function severityRank(health: string): number {
  if (health === "red") {
    return 0;
  }
  if (health === "yellow") {
    return 1;
  }
  return 2;
}

function blockedRank(entry: PitwallEntry): number {
  return entry.summary.blockedReason ? 0 : 1;
}

function staleRank(state: PitwallStaleState): number {
  if (state === "stale") {
    return 0;
  }
  if (state === "aging") {
    return 1;
  }
  if (state === "fresh") {
    return 2;
  }
  return 3;
}

function paceRank(value: number | null): number {
  if (value == null) {
    return 0;
  }
  return value;
}

function compareOwnerLoad(a: PitwallOwnerLoad, b: PitwallOwnerLoad): number {
  return (
    b.blockedTasks - a.blockedTasks ||
    b.activeTasks - a.activeTasks ||
    b.activeProjects - a.activeProjects ||
    a.owner.localeCompare(b.owner)
  );
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

function divider(): string {
  return "--------------------------------------------------------------------------";
}

function flagCode(health: string): string {
  if (health === "red") {
    return "RED";
  }
  if (health === "yellow") {
    return "YEL";
  }
  return "GRN";
}

function progressBar(percent: number, health: TrackHealth, palette: ReturnType<typeof createPalette>): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const total = 16;
  const filled = Math.round((clamped / 100) * total);
  return `[${palette.progressFilled(health, "=".repeat(filled))}${palette.progressEmpty(".".repeat(total - filled))}]`;
}

function renderSegmentGlyph(
  segment: { type: SegmentType; progressState: "active" | "done" | "upcoming" },
  palette: ReturnType<typeof createPalette>
): string {
  const base =
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

  const glyph =
    segment.progressState === "done" ? base.toLowerCase() : segment.progressState === "active" ? "@" : base.toUpperCase();
  return palette.segment(segment.type, segment.progressState, glyph);
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${" ".repeat(width - value.length)}${value}`;
}

function highlightCheckpoint(
  health: PitwallEntry["summary"]["health"],
  value: string,
  palette: ReturnType<typeof createPalette>
): string {
  const safeValue = sanitizeInlineText(value, "No checkpoint");
  if (health === "red") {
    return palette.danger(safeValue);
  }
  if (health === "yellow") {
    return palette.caution(safeValue);
  }
  return palette.active(safeValue);
}

function resolveMetrics(entry: Pick<PitwallEntry, "metrics" | "summary">): PitwallMetrics {
  return (
    entry.metrics ?? {
      activeTaskCount: 0,
      blockedTaskCount: entry.summary.blockedReason ? 1 : 0,
      lastEventAt: null,
      paceDeltaPercent: null,
      staleState: "unknown",
      updateAgeMinutes: null,
    }
  );
}

function computePitwallMetrics(state: TrackStateFile, summary: TrackSummary, now: Date): PitwallMetrics {
  const tasks = state.tasks ?? [];
  const activeTaskCount = tasks.filter((task) => task.status === "doing" || task.status === "blocked").length;
  const blockedTaskCount = tasks.filter((task) => task.status === "blocked").length;
  const lastEventAt = findTimestamp((state.events ?? []).at(-1)?.timestamp);
  const firstEventAt = findTimestamp((state.events ?? []).find((event) => event.timestamp)?.timestamp);
  const updateAgeMinutes = lastEventAt ? Math.max(0, Math.round((now.getTime() - lastEventAt.getTime()) / 60000)) : null;
  const staleState = deriveStaleState(updateAgeMinutes);
  const targetHours = state.project.target_time_hours;
  const paceDeltaPercent =
    targetHours && firstEventAt
      ? Math.round(summary.percentComplete - clampPercent((now.getTime() - firstEventAt.getTime()) / 3600000 / targetHours * 100))
      : null;

  return {
    activeTaskCount,
    blockedTaskCount,
    lastEventAt: lastEventAt?.toISOString() ?? null,
    paceDeltaPercent,
    staleState,
    updateAgeMinutes,
  };
}

function deriveStaleState(updateAgeMinutes: number | null): PitwallStaleState {
  if (updateAgeMinutes == null) {
    return "unknown";
  }
  if (updateAgeMinutes >= 240) {
    return "stale";
  }
  if (updateAgeMinutes >= 60) {
    return "aging";
  }
  return "fresh";
}

function findTimestamp(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatAge(updateAgeMinutes: number | null): string {
  if (updateAgeMinutes == null) {
    return "--";
  }
  if (updateAgeMinutes < 60) {
    return `${updateAgeMinutes}m`;
  }
  const hours = Math.floor(updateAgeMinutes / 60);
  const minutes = updateAgeMinutes % 60;
  if (hours < 24) {
    return minutes === 0 ? `${hours}h` : `${hours}h${minutes}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatPace(paceDeltaPercent: number | null): string {
  if (paceDeltaPercent == null) {
    return "--";
  }
  return `${paceDeltaPercent >= 0 ? "+" : ""}${paceDeltaPercent}%`;
}

function colorAge(
  staleState: PitwallStaleState,
  value: string,
  palette: ReturnType<typeof createPalette>
): string {
  if (staleState === "stale") {
    return palette.danger(value);
  }
  if (staleState === "aging") {
    return palette.caution(value);
  }
  if (staleState === "fresh") {
    return palette.success(value);
  }
  return palette.muted(value);
}

function colorPace(
  paceDeltaPercent: number | null,
  value: string,
  palette: ReturnType<typeof createPalette>
): string {
  if (paceDeltaPercent == null) {
    return palette.muted(value);
  }
  if (paceDeltaPercent < 0) {
    return palette.danger(value);
  }
  if (paceDeltaPercent === 0) {
    return palette.caution(value);
  }
  return palette.success(value);
}

function upsertOwner(
  ownerMap: Map<string, PitwallOwnerLoad>,
  owner: string,
  repoPath: string,
  checkpoint: string,
  blocked: boolean,
  activeTaskDelta: number
): void {
  const key = owner.trim() || "unassigned";
  const existing =
    ownerMap.get(key) ??
    {
      activeProjects: 0,
      activeTasks: 0,
      blockedTasks: 0,
      checkpoints: [],
      owner: key,
      repos: [],
    };

  existing.activeTasks += activeTaskDelta;
  if (blocked) {
    existing.blockedTasks += 1;
  }
  if (!existing.repos.includes(repoPath)) {
    existing.repos.push(repoPath);
    existing.activeProjects += 1;
  }
  if (checkpoint && !existing.checkpoints.includes(checkpoint)) {
    existing.checkpoints.push(checkpoint);
  }

  ownerMap.set(key, existing);
}
