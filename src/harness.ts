import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadTrackRoadmap } from "./roadmap.js";
import { loadTrackState } from "./state.js";

export interface HarnessSliceRef {
  id: string;
  title: string;
}

export interface HarnessWorksheetRef {
  path: string;
  officialActiveLoop: boolean;
}

export interface HarnessCheckResult {
  ok: boolean;
  activeSlice: HarnessSliceRef | null;
  nextSessionPlan: HarnessSliceRef | null;
  worksheet: HarnessWorksheetRef | null;
  runtimeStatus: "ok" | "error";
  issues: string[];
}

export async function checkHarnessConsistency(cwd: string): Promise<HarnessCheckResult> {
  const issues: string[] = [];
  const todoPath = path.resolve(cwd, "TODO.md");
  const nextSessionPlanPath = path.resolve(cwd, "NEXT_SESSION_PLAN.md");
  const worksheetsDir = path.resolve(cwd, "docs", "worksheets");

  const activeSlice = await loadActiveSlice(todoPath, issues);
  const nextSessionPlan = await loadNextSessionPlan(nextSessionPlanPath, issues);

  if (activeSlice && nextSessionPlan) {
    if (activeSlice.id !== nextSessionPlan.id) {
      issues.push(
        `NEXT_SESSION_PLAN active id \`${nextSessionPlan.id}\` does not match TODO active id \`${activeSlice.id}\`.`
      );
    }
    if (activeSlice.title !== nextSessionPlan.title) {
      issues.push(
        `NEXT_SESSION_PLAN active title \`${nextSessionPlan.title}\` does not match TODO active title \`${activeSlice.title}\`.`
      );
    }
  }

  const worksheet = activeSlice ? await loadActiveWorksheet(cwd, worksheetsDir, activeSlice.id, issues) : null;
  const runtimeStatus = await validateRuntimeFiles(cwd, issues);

  return {
    ok: issues.length === 0,
    activeSlice,
    nextSessionPlan,
    worksheet,
    runtimeStatus,
    issues,
  };
}

export function renderHarnessCheck(result: HarnessCheckResult): string {
  const lines = [result.ok ? "HARNESS OK" : "HARNESS FAIL"];

  lines.push(formatSliceLine("ACTIVE", result.activeSlice));
  lines.push(formatSliceLine("PLAN", result.nextSessionPlan));
  lines.push(
    `WORKSHEET ${result.worksheet ? result.worksheet.path : "missing"}${
      result.worksheet && !result.worksheet.officialActiveLoop ? " (official_active_loop != yes)" : ""
    }`
  );
  lines.push(
    `RUNTIME   ${result.runtimeStatus === "ok" ? "roadmap/state checks clean" : "roadmap/state validation failed"}`
  );

  if (result.issues.length) {
    lines.push("");
    lines.push("Issues:");
    for (const issue of result.issues) {
      lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}

async function loadActiveSlice(todoPath: string, issues: string[]): Promise<HarnessSliceRef | null> {
  const todo = await readRequiredFile(todoPath, "TODO.md", issues);
  if (!todo) {
    return null;
  }

  const activeSection = extractLevelTwoSection(todo, "Active");
  if (!activeSection) {
    issues.push("TODO.md is missing the `## Active` section.");
    return null;
  }

  const bullets = activeSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

  if (bullets.length === 0) {
    issues.push("TODO.md `## Active` section does not define an active slice.");
    return null;
  }

  const realBullets = bullets.filter((line) => line !== "- no active slice selected");
  if (realBullets.length === 0) {
    issues.push("TODO.md still says `no active slice selected`.");
    return null;
  }

  if (realBullets.length > 1) {
    issues.push("TODO.md `## Active` section contains more than one active slice.");
  }

  return parseSliceBullet(realBullets[0], "TODO.md active slice", issues);
}

async function loadNextSessionPlan(
  nextSessionPlanPath: string,
  issues: string[]
): Promise<HarnessSliceRef | null> {
  const nextSessionPlan = await readRequiredFile(nextSessionPlanPath, "NEXT_SESSION_PLAN.md", issues);
  if (!nextSessionPlan) {
    return null;
  }

  const activeSection = extractLevelTwoSection(nextSessionPlan, "Active Slice");
  if (!activeSection) {
    issues.push("NEXT_SESSION_PLAN.md is missing the `## Active Slice` section.");
    return null;
  }

  const idMatch = activeSection.match(/^- id:\s*`([^`]+)`/m);
  const titleMatch = activeSection.match(/^- title:\s*`([^`]+)`/m);

  if (!idMatch || !titleMatch) {
    issues.push("NEXT_SESSION_PLAN.md must declare both `- id:` and `- title:` inside `## Active Slice`.");
    return null;
  }

  if (idMatch[1] === "none") {
    issues.push("NEXT_SESSION_PLAN.md still points at `none` instead of an active slice.");
    return null;
  }

  return {
    id: idMatch[1],
    title: titleMatch[1],
  };
}

async function loadActiveWorksheet(
  cwd: string,
  worksheetsDir: string,
  sliceId: string,
  issues: string[]
): Promise<HarnessWorksheetRef | null> {
  let entries;
  try {
    entries = await readdir(worksheetsDir, { withFileTypes: true });
  } catch (error: unknown) {
    issues.push(formatReadError("docs/worksheets", error));
    return null;
  }

  const matches: HarnessWorksheetRef[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const fullPath = path.join(worksheetsDir, entry.name);
    const raw = await readRequiredFile(fullPath, path.relative(cwd, fullPath), issues);
    if (!raw) {
      continue;
    }

    const worksheetSliceId = raw.match(/^- slice_id:\s*`([^`]+)`/m)?.[1];
    if (worksheetSliceId !== sliceId) {
      continue;
    }

    matches.push({
      path: path.relative(cwd, fullPath),
      officialActiveLoop: raw.match(/^- official_active_loop:\s*(.+)$/m)?.[1].trim() === "yes",
    });
  }

  if (matches.length === 0) {
    issues.push(`No worksheet under \`docs/worksheets\` matches active slice \`${sliceId}\`.`);
    return null;
  }

  if (matches.length > 1) {
    issues.push(`Multiple worksheets under \`docs/worksheets\` match active slice \`${sliceId}\`.`);
  }

  if (!matches[0].officialActiveLoop) {
    issues.push(`Worksheet \`${matches[0].path}\` must set \`official_active_loop: yes\`.`);
  }

  return matches[0];
}

async function validateRuntimeFiles(cwd: string, issues: string[]): Promise<"ok" | "error"> {
  try {
    const [roadmap, state] = await Promise.all([loadTrackRoadmap(cwd), loadTrackState(cwd)]);
    const runtimeIssues: string[] = [];
    validateRuntimeParity(
      roadmap as unknown as Record<string, unknown>,
      state as unknown as Record<string, unknown>,
      runtimeIssues
    );
    issues.push(...runtimeIssues);
    return runtimeIssues.length === 0 ? "ok" : "error";
  } catch (error: unknown) {
    issues.push(formatReadError(".track runtime files", error));
    return "error";
  }
}

function validateRuntimeParity(
  roadmap: Record<string, unknown>,
  state: Record<string, unknown>,
  issues: string[]
): void {
  const roadmapProject = asRecord(roadmap.project);
  const stateProject = asRecord(state.project);

  if (readString(roadmapProject, "id") !== readString(stateProject, "id")) {
    issues.push(
      `Roadmap project id \`${String(readString(roadmapProject, "id"))}\` does not match state project id \`${String(readString(stateProject, "id"))}\`.`
    );
  }

  if (readString(roadmapProject, "name") !== readString(stateProject, "name")) {
    issues.push(
      `Roadmap project name \`${String(readString(roadmapProject, "name"))}\` does not match state project name \`${String(readString(stateProject, "name"))}\`.`
    );
  }

  const stateTrack = asRecord(state.track);
  const roadmapMode = readString(roadmapProject, "mode");
  const stateTopology = readString(stateTrack, "topology");
  if (roadmapMode && stateTopology && roadmapMode !== stateTopology) {
    issues.push(`Roadmap project mode \`${roadmapMode}\` does not match state topology \`${stateTopology}\`.`);
  }

  const roadmapPhases = asRecordArray(asRecord(roadmap.roadmap).phases);
  const stateLaps = asRecordArray(state.laps);
  if (roadmapPhases.length !== stateLaps.length) {
    issues.push(`Roadmap phase count ${roadmapPhases.length} does not match state lap count ${stateLaps.length}.`);
  }

  const totalLaps = readNumber(stateTrack, "total_laps");
  if (typeof totalLaps === "number" && totalLaps !== stateLaps.length) {
    issues.push(`State track.total_laps ${totalLaps} does not match state lap count ${stateLaps.length}.`);
  }
  if (typeof totalLaps === "number" && totalLaps !== roadmapPhases.length) {
    issues.push(`State track.total_laps ${totalLaps} does not match roadmap phase count ${roadmapPhases.length}.`);
  }

  const activeLap = readNumber(stateTrack, "active_lap");
  if (typeof activeLap === "number" && (activeLap < 1 || activeLap > Math.max(stateLaps.length, 1))) {
    issues.push(`State track.active_lap ${activeLap} is outside the defined lap range 1-${Math.max(stateLaps.length, 1)}.`);
  }

  const roadmapCheckpointCount = roadmapPhases.reduce(
    (sum: number, phase) => sum + asRecordArray(phase.checkpoints).length,
    0
  );
  const stateCheckpointCount = stateLaps.reduce(
    (sum: number, lap) => sum + asRecordArray(lap.checkpoints).length,
    0
  );
  if (roadmapCheckpointCount !== stateCheckpointCount) {
    issues.push(
      `Roadmap checkpoint count ${roadmapCheckpointCount} does not match state checkpoint count ${stateCheckpointCount}.`
    );
  }

  validatePhaseLapParity(roadmapPhases, stateLaps, issues);
  validateTaskParity(asRecordArray(state.tasks), stateLaps, issues);
}

function validatePhaseLapParity(
  roadmapPhases: Record<string, unknown>[],
  stateLaps: Record<string, unknown>[],
  issues: string[]
): void {
  const pairCount = Math.min(roadmapPhases.length, stateLaps.length);
  for (let phaseIndex = 0; phaseIndex < pairCount; phaseIndex += 1) {
    const roadmapPhase = roadmapPhases[phaseIndex];
    const stateLap = stateLaps[phaseIndex];
    const phaseNumber = phaseIndex + 1;
    const roadmapTitle = readString(roadmapPhase, "title");
    const stateTitle = readString(stateLap, "title");

    if (roadmapTitle !== stateTitle) {
      issues.push(
        `Roadmap phase ${phaseNumber} title \`${String(roadmapTitle)}\` does not match state lap ${phaseNumber} title \`${String(stateTitle)}\`.`
      );
    }

    const roadmapCheckpoints = asRecordArray(roadmapPhase.checkpoints);
    const stateCheckpoints = asRecordArray(stateLap.checkpoints);
    if (roadmapCheckpoints.length !== stateCheckpoints.length) {
      issues.push(
        `Roadmap phase ${phaseNumber} checkpoint count ${roadmapCheckpoints.length} does not match state lap ${phaseNumber} checkpoint count ${stateCheckpoints.length}.`
      );
    }

    const checkpointPairCount = Math.min(roadmapCheckpoints.length, stateCheckpoints.length);
    for (let checkpointIndex = 0; checkpointIndex < checkpointPairCount; checkpointIndex += 1) {
      const roadmapCheckpoint = roadmapCheckpoints[checkpointIndex];
      const stateCheckpoint = stateCheckpoints[checkpointIndex];
      const checkpointNumber = checkpointIndex + 1;
      const roadmapCheckpointId = readString(roadmapCheckpoint, "id");
      const stateCheckpointId = readString(stateCheckpoint, "id");
      const roadmapCheckpointTitle = readString(roadmapCheckpoint, "title");
      const stateCheckpointTitle = readString(stateCheckpoint, "title");

      if (roadmapCheckpointId !== stateCheckpointId) {
        issues.push(
          `Roadmap phase ${phaseNumber} checkpoint ${checkpointNumber} id \`${String(roadmapCheckpointId)}\` does not match state lap ${phaseNumber} checkpoint ${checkpointNumber} id \`${String(stateCheckpointId)}\`.`
        );
      }

      if (roadmapCheckpointTitle !== stateCheckpointTitle) {
        issues.push(
          `Roadmap phase ${phaseNumber} checkpoint ${checkpointNumber} title \`${String(roadmapCheckpointTitle)}\` does not match state lap ${phaseNumber} checkpoint ${checkpointNumber} title \`${String(stateCheckpointTitle)}\`.`
        );
      }
    }
  }
}

function validateTaskParity(
  tasks: Record<string, unknown>[],
  stateLaps: Record<string, unknown>[],
  issues: string[]
): void {
  const lapIds = new Set<string>();
  const checkpointToLap = new Map<string, string>();

  for (const lap of stateLaps) {
    const lapId = readString(lap, "id");
    if (lapId) {
      lapIds.add(lapId);
    }

    for (const checkpoint of asRecordArray(lap.checkpoints)) {
      const checkpointId = readString(checkpoint, "id");
      if (checkpointId) {
        checkpointToLap.set(checkpointId, lapId ?? "");
      }
    }
  }

  for (const task of tasks) {
    const taskId = readString(task, "id") ?? "<unknown-task>";
    const taskCheckpointId = readString(task, "checkpoint_id");
    const taskLapId = readString(task, "lap_id");

    if (taskCheckpointId && !checkpointToLap.has(taskCheckpointId)) {
      issues.push(`State task \`${taskId}\` references unknown checkpoint \`${taskCheckpointId}\`.`);
    }

    if (taskLapId && !lapIds.has(taskLapId)) {
      issues.push(`State task \`${taskId}\` references unknown lap \`${taskLapId}\`.`);
    }

    if (taskCheckpointId && taskLapId) {
      const checkpointLapId = checkpointToLap.get(taskCheckpointId);
      if (checkpointLapId && checkpointLapId !== taskLapId) {
        issues.push(
          `State task \`${taskId}\` maps checkpoint \`${taskCheckpointId}\` to lap \`${taskLapId}\`, but the checkpoint lives under lap \`${checkpointLapId}\`.`
        );
      }
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => entry as Record<string, unknown>);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

async function readRequiredFile(filePath: string, label: string, issues: string[]): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    issues.push(formatReadError(label, error));
    return null;
  }
}

function extractLevelTwoSection(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const section: string[] = [];
  let active = false;

  for (const line of lines) {
    if (line.trim() === `## ${heading}`) {
      active = true;
      continue;
    }
    if (active && /^##\s+/.test(line)) {
      break;
    }
    if (active) {
      section.push(line);
    }
  }

  return active ? section.join("\n") : null;
}

function parseSliceBullet(line: string, label: string, issues: string[]): HarnessSliceRef | null {
  const match = line.match(/^- `([^`]+)` (.+)$/);
  if (!match) {
    issues.push(`${label} must use the form "- \`TRK-000\` Slice Title".`);
    return null;
  }

  return {
    id: match[1],
    title: match[2].trim(),
  };
}

function formatSliceLine(label: string, slice: HarnessSliceRef | null): string {
  if (!slice) {
    return `${label.padEnd(9, " ")}missing`;
  }
  return `${label.padEnd(9, " ")}${slice.id} ${slice.title}`;
}

function formatReadError(label: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Unable to read ${label}: ${message}`;
}
