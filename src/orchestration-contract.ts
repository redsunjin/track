import path from "node:path";

import type { IntermediateRoadmapSchema, IntermediateTask } from "./adapter-schema.js";
import { sanitizeInlineText } from "./security.js";
import type { TrackStatus } from "./types.js";

export const TRACK_ORCHESTRATION_CONTRACT_FILE = ".agent/track-bootstrap.json";

export interface TrackOrchestrationContractOptions {
  cwd?: string;
  fallbackPackageName?: string | null;
  fallbackProjectName?: string | null;
  projectName?: string;
  sourceName?: string | null;
  sources?: string[];
  validationCommands?: string[];
}

export type TrackOrchestrationContractPayload = Record<string, unknown>;

export function trackOrchestrationContractToIntermediateSchema(
  payload: unknown,
  options: TrackOrchestrationContractOptions = {}
): IntermediateRoadmapSchema {
  const contract = requireRecord(payload);
  const project = asRecord(contract.project) ?? {};
  const method = optionalText(contract.method) ?? "harness";
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const projectName = sanitizeInlineText(
    options.projectName ??
      optionalText(project.name) ??
      options.fallbackProjectName ??
      options.fallbackPackageName,
    titleCaseWords(path.basename(cwd))
  );
  const projectId = slugify(optionalText(project.id) ?? options.fallbackPackageName ?? projectName);
  const goal = optionalText(contract.goal) ?? "Execute the project orchestration plan.";
  const rawPhases = records(contract.phases);
  const validationCommands = collectOrchestrationValidationCommands(contract, options.validationCommands ?? []);
  const phases = rawPhases.length
    ? rawPhases.map((phase, index) => mapContractPhase(phase, index))
    : [defaultContractPhase(goal, validationCommands)];
  const firstCheckpointId = phases[0]?.checkpoints?.[0]?.id ?? "define-next-slice";
  const firstPhaseId = findPhaseIdForCheckpoint(phases, firstCheckpointId) ?? phases[0]?.id ?? "harness-execution";
  const tasks = records(contract.tasks).map((task, index) => mapContractTask(task, index, phases, firstCheckpointId));

  return {
    version: positiveInteger(contract.version) ?? 1,
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
            title: validationCommands.length ? `Run ${validationCommands[0]}` : "Run existing validation harness",
            checkpoint_id: firstCheckpointId,
            phase_id: firstPhaseId,
            owner: null,
            status: "doing",
          },
        ],
    metadata: {
      kind: "track-orchestration-contract",
      method,
      name: options.sourceName ?? optionalText(contract.source) ?? "project harness",
      plan_id: `${projectId}-harness-plan`,
      plan_title: `${projectName} harness bootstrap draft`,
      sources: options.sources ?? ["harness"],
      topology: "harness",
      validation_commands: validationCommands,
    },
  };
}

export function collectOrchestrationValidationCommands(payload: unknown, fallbackCommands: string[] = []): string[] {
  const contract = asRecord(payload);
  const validation = contract ? asRecord(contract.validation) : null;
  const commands = new Set<string>();
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
  for (const entry of fallbackCommands) {
    const command = sanitizeInlineText(entry, "");
    if (command) {
      commands.add(command);
    }
  }
  return [...commands];
}

function defaultContractPhase(goal: string, validationCommands: string[]): IntermediateRoadmapSchema["phases"][number] {
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

function mapContractPhase(raw: Record<string, unknown>, index: number): IntermediateRoadmapSchema["phases"][number] {
  const id = sanitizeInlineText(optionalText(raw.id), `harness-phase-${index + 1}`);
  const rawCheckpoints = records(raw.checkpoints);
  return {
    id,
    title: sanitizeInlineText(optionalText(raw.title), `Harness phase ${index + 1}`),
    goal: optionalText(raw.goal) ?? undefined,
    kind: optionalText(raw.kind) ?? "integration",
    checkpoints: rawCheckpoints.length
      ? rawCheckpoints.map((checkpoint, checkpointIndex) => mapContractCheckpoint(checkpoint, checkpointIndex))
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

function mapContractCheckpoint(
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

function mapContractTask(
  raw: Record<string, unknown>,
  index: number,
  phases: IntermediateRoadmapSchema["phases"],
  fallbackCheckpointId: string
): IntermediateTask {
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

function requireRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Track orchestration contract payload must be a JSON object.");
  }
  return record;
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

function slugify(value: string): string {
  const normalized = sanitizeInlineText(stripNpmScope(value), "track")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || "track";
}

function stripNpmScope(value: string): string {
  return value.split("/").pop() ?? value;
}

function titleCaseWords(value: string): string {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Track Project";
  }
  return normalized.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
