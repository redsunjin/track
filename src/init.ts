import { access } from "node:fs/promises";
import path from "node:path";

import { buildTrackBuilderGuidance, renderTrackBuilderGuidance } from "./builder.js";
import { saveTrackRoadmap } from "./roadmap.js";
import { sanitizeInlineText, resolveTrackFilePath } from "./security.js";
import { saveTrackState } from "./state.js";
import {
  resolveTrackInitTemplate,
  type TrackInitProjection,
  type TrackInitTemplateName,
} from "./init-templates.js";

export type TrackInitFileKind = "roadmap" | "state";
export type TrackInitFileAction = "create" | "overwrite" | "skip";

export interface ProjectTrackInitOptions {
  cwd?: string;
  projectId?: string;
  projectName?: string;
  template?: string;
}

export interface TrackInitOptions extends ProjectTrackInitOptions {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
  roadmapFile?: string;
  stateFile?: string;
}

export interface TrackInitFilePlan {
  action: TrackInitFileAction;
  exists: boolean;
  kind: TrackInitFileKind;
  path: string;
}

export interface TrackInitPlan extends TrackInitProjection {
  conflicts: TrackInitFilePlan[];
  cwd: string;
  dryRun: boolean;
  files: {
    roadmap: TrackInitFilePlan;
    state: TrackInitFilePlan;
  };
  force: boolean;
  ok: boolean;
  template: TrackInitTemplateName;
  writes: TrackInitFilePlan[];
}

export interface TrackInitResult extends TrackInitPlan {
  written: TrackInitFilePlan[];
}

export function projectTrackInit(options: ProjectTrackInitOptions = {}): TrackInitProjection {
  const template = resolveTrackInitTemplate(options.template);
  const projectName = resolveProjectName(options.projectName, options.cwd);
  const projectId = resolveProjectId(options.projectId, projectName);

  return template.project({ projectId, projectName });
}

export async function planTrackInit(options: TrackInitOptions): Promise<TrackInitPlan> {
  const cwd = path.resolve(options.cwd);
  const template = resolveTrackInitTemplate(options.template);
  const projection = projectTrackInit({ ...options, cwd, template: template.name });
  const [roadmapPath, statePath] = await Promise.all([
    resolveInitOutputPath(cwd, options.roadmapFile, "roadmap"),
    resolveInitOutputPath(cwd, options.stateFile, "state"),
  ]);
  const [roadmapExists, stateExists] = await Promise.all([pathExists(roadmapPath), pathExists(statePath)]);
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;
  const roadmap = buildFilePlan("roadmap", roadmapPath, roadmapExists, force);
  const state = buildFilePlan("state", statePath, stateExists, force);
  const files = { roadmap, state };
  const writes = [roadmap, state].filter((file) => file.action === "create" || file.action === "overwrite");
  const conflicts = [roadmap, state].filter((file) => file.action === "skip");

  return {
    ...projection,
    conflicts,
    cwd,
    dryRun,
    files,
    force,
    ok: conflicts.length === 0,
    template: template.name,
    writes,
  };
}

export async function initTrack(options: TrackInitOptions): Promise<TrackInitResult> {
  const plan = await planTrackInit(options);

  if (plan.dryRun) {
    return { ...plan, written: [] };
  }

  assertTrackInitPlanWritable(plan);

  await saveTrackRoadmap(plan.files.roadmap.path, plan.roadmap);
  await saveTrackState(plan.files.state.path, plan.state);

  return { ...plan, written: plan.writes };
}

export function assertTrackInitPlanWritable(plan: TrackInitPlan): void {
  if (plan.ok) {
    return;
  }

  const files = plan.conflicts.map((file) => path.relative(plan.cwd, file.path)).join(", ");
  throw new Error(`Track init would overwrite existing file(s): ${files}. Re-run with force to overwrite.`);
}

export function renderTrackInitPlan(plan: TrackInitPlan | TrackInitResult): string {
  const wasWritten = "written" in plan && plan.written.length > 0;
  const status = !plan.ok
    ? "TRACK INIT BLOCKED"
    : wasWritten
      ? "TRACK INIT CREATED"
      : plan.dryRun
        ? "TRACK INIT DRY RUN"
        : "TRACK INIT PLAN";
  const lines = [
    status,
    `Project: ${plan.state.project.name}`,
    `Template: ${plan.template}`,
    `Roadmap: ${renderFileAction(plan.files.roadmap, plan.cwd)}`,
    `State: ${renderFileAction(plan.files.state, plan.cwd)}`,
  ];

  if (!plan.ok) {
    lines.push("Use force to overwrite existing Track files.");
  } else if (wasWritten) {
    lines.push("Next: track status");
    lines.push("Next: track map");
  } else if (plan.dryRun) {
    lines.push("");
    lines.push(...renderTrackBuilderGuidance(buildTrackBuilderGuidance({ context: "init", hasPlanEvidence: false })));
  }

  return lines.join("\n");
}

function buildFilePlan(
  kind: TrackInitFileKind,
  filePath: string,
  exists: boolean,
  force: boolean
): TrackInitFilePlan {
  return {
    action: exists ? (force ? "overwrite" : "skip") : "create",
    exists,
    kind,
    path: filePath,
  };
}

async function resolveInitOutputPath(
  cwd: string,
  explicitFile: string | undefined,
  kind: TrackInitFileKind
): Promise<string> {
  if (explicitFile) {
    return resolveTrackFilePath(cwd, explicitFile, `Track init ${kind} output`);
  }

  return path.resolve(cwd, ".track", kind === "roadmap" ? "roadmap.yaml" : "state.yaml");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function renderFileAction(file: TrackInitFilePlan, cwd: string): string {
  const relativePath = path.relative(cwd, file.path);
  return `${file.action} ${relativePath}${file.exists ? " (exists)" : ""}`;
}

function resolveProjectName(projectName: string | undefined, cwd: string | undefined): string {
  const fallback = cwd ? titleCaseWords(path.basename(path.resolve(cwd))) : "Track Project";
  return sanitizeInlineText(projectName, fallback);
}

function resolveProjectId(projectId: string | undefined, projectName: string): string {
  const normalized = sanitizeInlineText(projectId, "").toLowerCase() || projectName.toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "track-project";
}

function titleCaseWords(value: string): string {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Track Project";
  }

  return normalized.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
