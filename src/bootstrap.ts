import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { intermediateToExternalPlan } from "./adapters/bridge.js";
import type { IntermediateRoadmapSchema } from "./adapter-schema.js";
import {
  buildTrackBuilderGuidance,
  hasTrackPlanningHeading,
  renderTrackBuilderGuidance,
  type TrackBuilderGuidance,
} from "./builder.js";
import { projectExternalPlan } from "./external-plan.js";
import { sanitizeInlineText } from "./security.js";
import { summarizeTrack } from "./summary.js";
import type { ProjectExternalPlanResult, TrackStatus } from "./types.js";

export type TrackBootstrapSourceKind = "readme" | "package" | "git" | "plan" | "harness" | "agent";
export type TrackBootstrapRequestedSource = TrackBootstrapSourceKind | "auto" | "skill";

export interface TrackBootstrapEvidence {
  detail: string;
  file?: string;
  kind: TrackBootstrapSourceKind;
  label: string;
  present: boolean;
}

export interface TrackBootstrapOptions {
  commandRunner?: TrackBootstrapCommandRunner;
  cwd: string;
  from?: string;
  projectName?: string;
}

export interface TrackBootstrapResult extends ProjectExternalPlanResult {
  builder: TrackBuilderGuidance;
  cwd: string;
  evidence: TrackBootstrapEvidence[];
  schema: IntermediateRoadmapSchema;
  sources: TrackBootstrapSourceKind[];
  warnings: string[];
}

export interface TrackBootstrapCommandRunner {
  run(command: string, args: string[], cwd: string): Promise<TrackBootstrapCommandResult>;
}

export interface TrackBootstrapCommandResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

interface ReadmeSignal {
  file: string;
  headings: string[];
  title: string | null;
}

interface PackageSignal {
  file: string;
  name: string | null;
  scripts: string[];
  version: string | null;
}

interface GitSignal {
  branch: string | null;
  dirtyCount: number;
  present: boolean;
}

interface PlanSignal {
  file: string;
  headings: string[];
  title: string | null;
}

interface HarnessSignal {
  files: string[];
  goal: string | null;
  method: string | null;
  payload: Record<string, unknown> | null;
  payloadError: string | null;
  payloadFile: string | null;
  present: boolean;
  source: string | null;
  validationCommands: string[];
}

interface AgentSignal {
  files: string[];
  present: boolean;
}

export async function bootstrapTrack(options: TrackBootstrapOptions): Promise<TrackBootstrapResult> {
  const cwd = path.resolve(options.cwd);
  const sources = resolveBootstrapSources(options.from);
  const warnings: string[] = [];
  const evidence: TrackBootstrapEvidence[] = [];

  const [readme, packageJson, git, plan, harness, agent] = await Promise.all([
    sources.includes("readme") ? readReadmeSignal(cwd) : Promise.resolve(null),
    sources.includes("package") ? readPackageSignal(cwd) : Promise.resolve(null),
    sources.includes("git") ? readGitSignal(cwd, options.commandRunner ?? defaultCommandRunner) : Promise.resolve(null),
    sources.includes("plan") ? readPlanSignal(cwd) : Promise.resolve(null),
    sources.includes("harness") ? readHarnessSignal(cwd) : Promise.resolve(null),
    sources.includes("agent") ? readAgentSignal(cwd) : Promise.resolve(null),
  ]);

  if (sources.includes("readme")) {
    evidence.push(readmeEvidence(readme));
    if (!readme) {
      warnings.push("README evidence not found.");
    }
  }
  if (sources.includes("package")) {
    evidence.push(packageEvidence(packageJson));
    if (!packageJson) {
      warnings.push("package.json evidence not found.");
    }
  }
  if (sources.includes("git")) {
    evidence.push(gitEvidence(git));
    if (!git?.present) {
      warnings.push("git evidence not available.");
    }
  }
  if (sources.includes("plan")) {
    evidence.push(planEvidence(plan));
  }
  if (sources.includes("harness")) {
    evidence.push(harnessEvidence(harness));
    if (!harness?.present) {
      warnings.push("harness evidence not found.");
    }
    if (harness?.payloadError) {
      warnings.push(`harness adapter payload could not be parsed: ${harness.payloadError}`);
    }
  }
  if (sources.includes("agent")) {
    evidence.push(agentEvidence(agent));
    if (!agent?.present) {
      warnings.push("agent workflow evidence not found.");
    }
  }

  const hasPlanEvidence =
    Boolean(plan) || hasTrackPlanningHeading(readme?.headings ?? []) || Boolean(harness?.present) || Boolean(agent?.present);
  if (sources.includes("plan") && !hasPlanEvidence) {
    warnings.push("planning evidence not found.");
  }
  const builder = buildTrackBuilderGuidance({
    context: "bootstrap",
    evidenceLabels: collectPlanningEvidenceLabels(readme, plan, harness, agent),
    hasPlanEvidence,
  });

  const schema =
    harness?.payload && !harness.payloadError
      ? buildHarnessPayloadSchema({
          cwd,
          harness,
          packageJson,
          projectName: options.projectName,
          readme,
          sources,
        })
      : buildBootstrapSchema({
          agent,
          cwd,
          git,
          harness,
          packageJson,
          plan,
          projectName: options.projectName,
          readme,
          sources,
        });
  const projected = projectExternalPlan(intermediateToExternalPlan(schema), { preserveProgress: false });

  return {
    ...projected,
    builder,
    cwd,
    evidence,
    schema,
    sources,
    warnings,
  };
}

export function resolveBootstrapSources(raw: string | undefined): TrackBootstrapSourceKind[] {
  const requested = (raw ?? "auto")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  const expanded =
    requested.length === 0 || requested.includes("auto")
      ? ["readme", "package", "git", "plan", "harness", "agent"]
      : requested.map((source) => (source === "skill" ? "agent" : source));
  const normalized: TrackBootstrapSourceKind[] = [];
  for (const source of expanded) {
    if (
      source !== "readme" &&
      source !== "package" &&
      source !== "git" &&
      source !== "plan" &&
      source !== "harness" &&
      source !== "agent"
    ) {
      throw new Error("`--from` must contain auto, readme, package, git, plan, harness, agent, or skill.");
    }
    if (!normalized.includes(source)) {
      normalized.push(source);
    }
  }
  return normalized;
}

export function summarizeTrackBootstrap(result: TrackBootstrapResult): string {
  const phaseCount = result.roadmap.roadmap.phases.length;
  const checkpointCount = result.roadmap.roadmap.phases.reduce((count, phase) => count + (phase.checkpoints?.length ?? 0), 0);
  const taskCount = result.state.tasks?.length ?? 0;
  const summary = summarizeTrack(result.state);
  const lines = [
    "TRACK BOOTSTRAP DRAFT",
    `PROJECT  ${result.state.project.name}`,
    `SOURCES  ${result.sources.join(", ")}`,
    `DRAFT    ${phaseCount} phase(s), ${checkpointCount} checkpoint(s), ${taskCount} task(s)`,
    `NEXT     ${summary.nextAction}`,
    "",
    "Evidence:",
    ...result.evidence.map((entry) => `- ${entry.label}: ${entry.detail}${entry.file ? ` (${entry.file})` : ""}`),
  ];

  if (result.warnings.length) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const builderGuidance = renderTrackBuilderGuidance(result.builder);
  if (builderGuidance.length) {
    lines.push("");
    lines.push(...builderGuidance);
  }

  lines.push("");
  lines.push("This is a draft. Review the evidence before writing .track files.");
  return lines.join("\n");
}

function buildBootstrapSchema(input: {
  agent: AgentSignal | null;
  cwd: string;
  git: GitSignal | null;
  harness: HarnessSignal | null;
  packageJson: PackageSignal | null;
  plan: PlanSignal | null;
  projectName: string | undefined;
  readme: ReadmeSignal | null;
  sources: TrackBootstrapSourceKind[];
}): IntermediateRoadmapSchema {
  const projectName = resolveBootstrapProjectName(input.projectName, input.readme, input.packageJson, input.cwd);
  const projectId = slugify(input.packageJson?.name ?? projectName);
  const title = input.readme?.title ?? projectName;
  const hasPackage = Boolean(input.packageJson);
  const hasGit = Boolean(input.git?.present);
  const hasHarness = Boolean(input.harness?.present);
  const hasAgent = Boolean(input.agent?.present);
  const hasPlanEvidence = Boolean(input.plan) || hasTrackPlanningHeading(input.readme?.headings ?? []) || hasHarness || hasAgent;
  const firstCheckpointTitle = hasPlanEvidence ? `Review ${title} plan evidence` : "Create the first Track plan";
  const firstCheckpointGoal = hasPlanEvidence
    ? "Review local planning evidence and confirm the first Track plan."
    : "Choose GSD, SDD, TDD, or a harness workflow before writing Track state.";
  const firstTaskTitle = hasPlanEvidence
    ? "Review bootstrap evidence and confirm the first Track slice"
    : "Choose a Track Builder method and define the first slice";

  const checkpoints = [
    {
      id: "cp-bootstrap-purpose",
      title: firstCheckpointTitle,
      goal: firstCheckpointGoal,
      kind: "build",
      status: "doing" as const,
      weight: 1,
    },
    {
      id: "cp-bootstrap-runtime",
      title: hasPackage ? "Review package scripts and checks" : "Identify project checks",
      goal: hasPackage
        ? `Review available scripts: ${input.packageJson?.scripts.slice(0, 5).join(", ") || "none"}`
        : "Find the commands that prove the project works.",
      kind: "build",
      status: "todo" as const,
      weight: 1,
    },
    {
      id: "cp-bootstrap-git",
      title: hasGit ? "Review current git context" : "Confirm repository context",
      goal: hasGit
        ? `Use git context as evidence only${input.git?.branch ? `; current branch is ${input.git.branch}` : ""}.`
        : "Initialize or inspect version-control context if relevant.",
      kind: "integration",
      status: "todo" as const,
      weight: 1,
    },
  ];

  if (hasHarness) {
    checkpoints.push({
      id: "cp-bootstrap-harness",
      title: input.harness?.payload ? "Review harness adapter payload" : "Review harness validation surface",
      goal: input.harness?.validationCommands.length
        ? `Use harness validation as gates: ${input.harness.validationCommands.slice(0, 4).join(", ")}.`
        : "Use the detected harness files as validation evidence.",
      kind: "integration",
      status: "todo" as const,
      weight: 1,
    });
  }

  if (hasAgent) {
    checkpoints.push({
      id: "cp-bootstrap-agent",
      title: "Review agent workflow files",
      goal: `Use agent workflow files as operating context: ${input.agent?.files.slice(0, 4).join(", ")}.`,
      kind: "integration",
      status: "todo" as const,
      weight: 1,
    });
  }

  return {
    version: 1,
    project: {
      id: projectId,
      name: projectName,
      mode: "bootstrap",
    },
    phases: [
      {
        id: "phase-bootstrap-discovery",
        title: "Bootstrap discovery",
        goal: "Convert local evidence into a reviewable Track starting plan.",
        kind: "integration",
        checkpoints,
      },
    ],
    tasks: [
      {
        id: "task-bootstrap-review",
        title: firstTaskTitle,
        checkpoint_id: "cp-bootstrap-purpose",
        phase_id: "phase-bootstrap-discovery",
        status: "doing",
        owner: null,
      },
    ],
    metadata: {
      kind: "track-bootstrap",
      name: "Track bootstrap",
      plan_id: `${projectId}-bootstrap-plan`,
      plan_title: `${projectName} bootstrap draft`,
      sources: input.sources,
      topology: "bootstrap",
    },
  };
}

function buildHarnessPayloadSchema(input: {
  cwd: string;
  harness: HarnessSignal;
  packageJson: PackageSignal | null;
  projectName: string | undefined;
  readme: ReadmeSignal | null;
  sources: TrackBootstrapSourceKind[];
}): IntermediateRoadmapSchema {
  const payload = input.harness.payload ?? {};
  const project = asRecord(payload.project) ?? {};
  const method = optionalText(payload.method) ?? input.harness.method ?? "harness";
  const projectName = sanitizeInlineText(
    input.projectName ?? optionalText(project.name) ?? input.readme?.title ?? input.packageJson?.name,
    titleCaseWords(path.basename(input.cwd))
  );
  const projectId = slugify(optionalText(project.id) ?? input.packageJson?.name ?? projectName);
  const goal = optionalText(payload.goal) ?? input.harness.goal ?? "Execute the project harness plan.";
  const rawPhases = records(payload.phases);
  const phases = rawPhases.length
    ? rawPhases.map((phase, index) => mapHarnessPayloadPhase(phase, index))
    : [defaultHarnessPhase(goal, input.harness.validationCommands)];
  const firstCheckpointId = phases[0]?.checkpoints?.[0]?.id ?? "define-next-slice";
  const firstPhaseId = findPhaseIdForCheckpoint(phases, firstCheckpointId) ?? phases[0]?.id ?? "harness-execution";
  const tasks = records(payload.tasks).map((task, index) => mapHarnessPayloadTask(task, index, phases, firstCheckpointId));

  return {
    version: positiveInteger(payload.version) ?? 1,
    project: {
      id: projectId,
      name: projectName,
      mode: optionalText(project.mode) ?? method,
    },
    phases,
    tasks: tasks.length
      ? tasks
      : [
          {
            id: "run-agent-harness",
            title: input.harness.validationCommands.length
              ? `Run ${input.harness.validationCommands[0]}`
              : "Run existing validation harness",
            checkpoint_id: firstCheckpointId,
            phase_id: firstPhaseId,
            owner: null,
            status: "doing",
          },
        ],
    metadata: {
      kind: "track-bootstrap-harness",
      method,
      name: input.harness.source ?? "project harness",
      plan_id: `${projectId}-harness-plan`,
      plan_title: `${projectName} harness bootstrap draft`,
      sources: input.sources,
      topology: "harness",
      validation_commands: input.harness.validationCommands,
    },
  };
}

function defaultHarnessPhase(goal: string, validationCommands: string[]): IntermediateRoadmapSchema["phases"][number] {
  const validationGoal = validationCommands.length
    ? `Run validation gates: ${validationCommands.slice(0, 4).join(", ")}.`
    : "Run the strongest available harness validation.";
  return {
    id: "harness-execution",
    title: "Harness execution",
    goal,
    kind: "integration",
    checkpoints: [
      {
        id: "define-next-slice",
        title: "Define next implementation slice",
        goal: "Choose the next bounded slice from the harness goal and done criteria.",
        kind: "build",
        status: "doing",
        weight: 1,
      },
      {
        id: "implement-slice",
        title: "Implement slice",
        goal: "Make the selected slice real in the codebase.",
        kind: "build",
        status: "todo",
        weight: 1,
      },
      {
        id: "validate-harness",
        title: "Validate with harness",
        goal: validationGoal,
        kind: "release",
        status: "todo",
        weight: 1,
      },
    ],
  };
}

function mapHarnessPayloadPhase(raw: Record<string, unknown>, index: number): IntermediateRoadmapSchema["phases"][number] {
  const id = sanitizeInlineText(optionalText(raw.id), `harness-phase-${index + 1}`);
  const rawCheckpoints = records(raw.checkpoints);
  return {
    id,
    title: sanitizeInlineText(optionalText(raw.title), `Harness phase ${index + 1}`),
    goal: optionalText(raw.goal) ?? undefined,
    kind: optionalText(raw.kind) ?? "integration",
    checkpoints: rawCheckpoints.length
      ? rawCheckpoints.map((checkpoint, checkpointIndex) => mapHarnessPayloadCheckpoint(checkpoint, checkpointIndex))
      : [
          {
            id: `${id}-checkpoint`,
            title: "Execute harness checkpoint",
            goal: "Run the harness-defined work and validation loop.",
            kind: "integration",
            status: index === 0 ? "doing" : "todo",
            weight: 1,
          },
        ],
  };
}

function mapHarnessPayloadCheckpoint(
  raw: Record<string, unknown>,
  index: number
): NonNullable<IntermediateRoadmapSchema["phases"][number]["checkpoints"]>[number] {
  return {
    id: sanitizeInlineText(optionalText(raw.id), `harness-checkpoint-${index + 1}`),
    title: sanitizeInlineText(optionalText(raw.title), `Harness checkpoint ${index + 1}`),
    goal: optionalText(raw.goal) ?? undefined,
    kind: optionalText(raw.kind) ?? "integration",
    status: coerceStatus(raw.status),
    weight: positiveInteger(raw.weight) ?? 1,
  };
}

function mapHarnessPayloadTask(
  raw: Record<string, unknown>,
  index: number,
  phases: IntermediateRoadmapSchema["phases"],
  fallbackCheckpointId: string
): NonNullable<IntermediateRoadmapSchema["tasks"]>[number] {
  const checkpointId = sanitizeInlineText(optionalText(raw.checkpoint_id), fallbackCheckpointId);
  return {
    id: sanitizeInlineText(optionalText(raw.id), `harness-task-${index + 1}`),
    title: sanitizeInlineText(optionalText(raw.title), `Harness task ${index + 1}`),
    checkpoint_id: checkpointId,
    phase_id: optionalText(raw.phase_id) ?? findPhaseIdForCheckpoint(phases, checkpointId),
    owner: optionalText(raw.owner),
    status: coerceStatus(raw.status) ?? (index === 0 ? "doing" : "todo"),
  };
}

function findPhaseIdForCheckpoint(phases: IntermediateRoadmapSchema["phases"], checkpointId: string): string | undefined {
  return phases.find((phase) => (phase.checkpoints ?? []).some((checkpoint) => checkpoint.id === checkpointId))?.id;
}

async function readReadmeSignal(cwd: string): Promise<ReadmeSignal | null> {
  const candidates = ["README.md", "readme.md", "README"];
  for (const candidate of candidates) {
    const filePath = path.join(cwd, candidate);
    try {
      const raw = await readFile(filePath, "utf8");
      const headings = parseMarkdownHeadings(raw);
      return {
        file: candidate,
        headings,
        title: headings[0] ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function readPackageSignal(cwd: string): Promise<PackageSignal | null> {
  try {
    const raw = await readFile(path.join(cwd, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown; scripts?: unknown; version?: unknown };
    const scripts =
      parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts)
        ? Object.keys(parsed.scripts).sort()
        : [];
    return {
      file: "package.json",
      name: typeof parsed.name === "string" ? parsed.name : null,
      scripts,
      version: typeof parsed.version === "string" ? parsed.version : null,
    };
  } catch {
    return null;
  }
}

async function readPlanSignal(cwd: string): Promise<PlanSignal | null> {
  const candidates = [
    "ROADMAP.md",
    "roadmap.md",
    "TODO.md",
    "PLAN.md",
    "plans.md",
    "docs/roadmap.md",
    "docs/plan.md",
    "docs/todo.md",
    "docs/spec.md",
    "docs/specification.md",
    "docs/definition-of-done.md",
  ];

  for (const candidate of candidates) {
    const filePath = path.join(cwd, candidate);
    try {
      const raw = await readFile(filePath, "utf8");
      const headings = parseMarkdownHeadings(raw);
      return {
        file: candidate,
        headings,
        title: headings[0] ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function readHarnessSignal(cwd: string): Promise<HarnessSignal | null> {
  const candidates = [
    ".agent/track-bootstrap.json",
    "scripts/agent-harness.sh",
    "scripts/check.sh",
    "scripts/smoke.sh",
    "docs/definition-of-done.md",
    "docs/methodology.md",
  ];
  const files = await collectExistingFiles(cwd, candidates);
  let payload: Record<string, unknown> | null = null;
  let payloadError: string | null = null;
  const payloadFile = files.includes(".agent/track-bootstrap.json") ? ".agent/track-bootstrap.json" : null;

  if (payloadFile) {
    try {
      const parsed = JSON.parse(await readFile(path.join(cwd, payloadFile), "utf8")) as unknown;
      payload = asRecord(parsed);
      if (!payload) {
        payloadError = "payload root must be a JSON object";
      }
    } catch (error) {
      payloadError = error instanceof Error ? error.message : "invalid JSON";
    }
  }

  if (!files.length && !payload) {
    return null;
  }

  return {
    files,
    goal: payload ? optionalText(payload.goal) : null,
    method: payload ? optionalText(payload.method) : null,
    payload,
    payloadError,
    payloadFile,
    present: true,
    source: payload ? optionalText(payload.source) : null,
    validationCommands: collectValidationCommands(payload, files),
  };
}

async function readAgentSignal(cwd: string): Promise<AgentSignal | null> {
  const files = await collectExistingFiles(cwd, [
    "AGENTS.md",
    ".agent/orchestration-contract.md",
    ".agent/orchestration-status.md",
    ".agent/status.md",
    ".agent/worklog.md",
    ".agent/prompts/continue-to-goal.md",
    ".agent/prompts/run-validation-loop.md",
    ".agent/prompts/fix-failing-harness.md",
  ]);

  return files.length ? { files, present: true } : null;
}

async function readGitSignal(cwd: string, runner: TrackBootstrapCommandRunner): Promise<GitSignal | null> {
  const branch = await runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (branch.exitCode !== 0) {
    return { branch: null, dirtyCount: 0, present: false };
  }

  const status = await runner.run("git", ["status", "--short"], cwd);
  const dirtyCount = status.exitCode === 0 ? status.stdout.split(/\r?\n/).filter(Boolean).length : 0;
  return {
    branch: sanitizeInlineText(branch.stdout.trim(), "") || null,
    dirtyCount,
    present: true,
  };
}

function readmeEvidence(signal: ReadmeSignal | null): TrackBootstrapEvidence {
  if (!signal) {
    return {
      kind: "readme",
      label: "README",
      present: false,
      detail: "not found",
    };
  }
  const detail = signal.title
    ? `found title "${signal.title}" with ${signal.headings.length} heading(s)`
    : `found ${signal.file} without a markdown heading`;
  return {
    kind: "readme",
    label: "README",
    present: true,
    file: signal.file,
    detail,
  };
}

function planEvidence(signal: PlanSignal | null): TrackBootstrapEvidence {
  if (!signal) {
    return {
      kind: "plan",
      label: "Plan",
      present: false,
      detail: "no ROADMAP, TODO, PLAN, spec, or definition-of-done file found",
    };
  }
  const detail = signal.title
    ? `found title "${signal.title}" with ${signal.headings.length} heading(s)`
    : `found ${signal.file} without a markdown heading`;
  return {
    kind: "plan",
    label: "Plan",
    present: true,
    file: signal.file,
    detail,
  };
}

function harnessEvidence(signal: HarnessSignal | null): TrackBootstrapEvidence {
  if (!signal?.present) {
    return {
      kind: "harness",
      label: "Harness",
      present: false,
      detail: "no .agent/track-bootstrap.json or harness validation files found",
    };
  }
  const payload = signal.payloadFile
    ? `adapter payload ${signal.payloadFile}${signal.method ? `; method ${signal.method}` : ""}`
    : null;
  const validations = signal.validationCommands.length
    ? `${signal.validationCommands.length} validation hint(s): ${signal.validationCommands.slice(0, 3).join(", ")}`
    : null;
  const fallback = `found ${signal.files.length} harness file(s)`;
  return {
    kind: "harness",
    label: "Harness",
    present: true,
    file: signal.payloadFile ?? signal.files[0],
    detail: [payload, validations].filter(Boolean).join("; ") || fallback,
  };
}

function agentEvidence(signal: AgentSignal | null): TrackBootstrapEvidence {
  if (!signal?.present) {
    return {
      kind: "agent",
      label: "Agent",
      present: false,
      detail: "no AGENTS.md or .agent workflow files found",
    };
  }
  return {
    kind: "agent",
    label: "Agent",
    present: true,
    file: signal.files[0],
    detail: `found ${signal.files.length} agent workflow file(s): ${signal.files.slice(0, 4).join(", ")}`,
  };
}

function packageEvidence(signal: PackageSignal | null): TrackBootstrapEvidence {
  if (!signal) {
    return {
      kind: "package",
      label: "Package",
      present: false,
      detail: "package.json not found",
    };
  }
  const identity = [signal.name, signal.version].filter(Boolean).join("@") || "unnamed package";
  return {
    kind: "package",
    label: "Package",
    present: true,
    file: signal.file,
    detail: `${identity}; ${signal.scripts.length} script(s)`,
  };
}

function gitEvidence(signal: GitSignal | null): TrackBootstrapEvidence {
  if (!signal?.present) {
    return {
      kind: "git",
      label: "Git",
      present: false,
      detail: "git context not available",
    };
  }
  return {
    kind: "git",
    label: "Git",
    present: true,
    detail: `branch ${signal.branch ?? "unknown"}; ${signal.dirtyCount} dirty file(s)`,
  };
}

function collectPlanningEvidenceLabels(
  readme: ReadmeSignal | null,
  plan: PlanSignal | null,
  harness: HarnessSignal | null,
  agent: AgentSignal | null
): string[] {
  const labels: string[] = [];
  if (plan) {
    labels.push(plan.file);
  }
  if (harness?.present) {
    labels.push(harness.payloadFile ?? "harness files");
  }
  if (agent?.present) {
    labels.push(agent.files[0] ?? "agent files");
  }
  if (readme && hasTrackPlanningHeading(readme.headings)) {
    labels.push(`${readme.file} headings`);
  }
  return labels;
}

async function collectExistingFiles(cwd: string, candidates: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(cwd, candidate))) {
      files.push(candidate);
    }
  }
  return files;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function collectValidationCommands(payload: Record<string, unknown> | null, files: string[]): string[] {
  const commands = new Set<string>();
  const validation = payload ? asRecord(payload.validation) : null;
  const preferred = validation ? optionalText(validation.preferred) : null;
  if (preferred) {
    commands.add(preferred);
  }
  for (const entry of strings(validation?.checks)) {
    commands.add(entry);
  }
  for (const entry of strings(validation?.smokes)) {
    commands.add(entry);
  }
  for (const file of ["scripts/agent-harness.sh", "scripts/check.sh", "scripts/smoke.sh"]) {
    if (files.includes(file)) {
      commands.add(file);
    }
  }
  return [...commands];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Record<string, unknown> => Boolean(entry)) : [];
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(optionalText).filter((entry): entry is string => Boolean(entry));
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" ? sanitizeInlineText(value, "") || null : null;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function coerceStatus(value: unknown): TrackStatus | undefined {
  return value === "todo" || value === "doing" || value === "blocked" || value === "done" ? value : undefined;
}

function parseMarkdownHeadings(raw: string): string[] {
  return Array.from(raw.matchAll(/^#{1,3}\s+(.+)$/gm))
    .map((match) => sanitizeInlineText(match[1], ""))
    .filter(Boolean)
    .slice(0, 6);
}

function resolveBootstrapProjectName(
  explicitName: string | undefined,
  readme: ReadmeSignal | null,
  packageJson: PackageSignal | null,
  cwd: string
): string {
  const packageName = packageJson?.name ? titleCaseWords(stripNpmScope(packageJson.name)) : undefined;
  const fallback = titleCaseWords(path.basename(cwd));
  return sanitizeInlineText(explicitName ?? readme?.title ?? packageName, fallback);
}

function stripNpmScope(value: string): string {
  return value.split("/").pop() ?? value;
}

function slugify(value: string): string {
  const normalized = sanitizeInlineText(stripNpmScope(value), "track")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || "track";
}

function titleCaseWords(value: string): string {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Track Project";
  }
  return normalized.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const defaultCommandRunner: TrackBootstrapCommandRunner = {
  run(command, args, cwd) {
    return new Promise((resolve) => {
      execFile(command, args, { cwd }, (error, stdout, stderr) => {
        const exitCode =
          typeof (error as NodeJS.ErrnoException | null)?.code === "number"
            ? Number((error as NodeJS.ErrnoException).code)
            : error
              ? 1
              : 0;
        resolve({
          exitCode,
          stderr: String(stderr ?? ""),
          stdout: String(stdout ?? ""),
        });
      });
    });
  },
};
