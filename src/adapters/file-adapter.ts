import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type {
  IntermediateCheckpoint,
  IntermediatePhase,
  IntermediateRoadmapSchema,
  IntermediateTask,
} from "../adapter-schema.js";
import { sanitizeInlineText } from "../security.js";
import type { RoadmapAdapter } from "./base.js";

export class FileRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "file";
  private data?: IntermediateRoadmapSchema;

  constructor(private readonly filePath: string) {}

  async fetch(): Promise<void> {
    const absolutePath = path.resolve(this.filePath);
    const content = await readFile(absolutePath, "utf8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(content) : parse(content);
    this.data = normalizeFileSchema(parsed);
  }

  async toInternalSchema(): Promise<IntermediateRoadmapSchema> {
    if (!this.data) {
      throw new Error(`No data loaded from ${this.filePath}. Did you call fetch() first?`);
    }
    return this.data;
  }
}

function normalizeFileSchema(source: unknown): IntermediateRoadmapSchema {
  if (!source || typeof source !== "object") {
    throw new Error("External adapter file must be an object.");
  }

  const record = source as Record<string, unknown>;
  const version = typeof record.version === "number" ? record.version : 1;
  const project = normalizeProject(record.project);

  if (Array.isArray(record.phases)) {
    return {
      version,
      project,
      phases: normalizeIntermediatePhases(record.phases),
      tasks: normalizeIntermediateTasks(record.tasks),
      metadata: normalizeMetadata(record.metadata),
    };
  }

  const plan = asRecord(record.plan);
  const phases = normalizeLegacyPhases(plan.phases);
  const tasks = normalizeLegacyTasks(record.tasks, phases);
  const metadata = {
    ...normalizeMetadata(record.source),
    plan_id: sanitizeOptionalText(plan.id),
    plan_title: sanitizeOptionalText(plan.title),
    topology: sanitizeOptionalText(plan.topology) ?? project.mode,
  };

  return {
    version,
    project,
    phases,
    tasks,
    metadata,
  };
}

function normalizeProject(value: unknown): IntermediateRoadmapSchema["project"] {
  const project = asRecord(value);
  return {
    id: sanitizeInlineText(readString(project, "id"), "track"),
    name: sanitizeInlineText(readString(project, "name"), "Track"),
    mode: sanitizeOptionalText(readString(project, "mode")),
    target_time_hours: readNumber(project, "target_time_hours"),
    current_branch: sanitizeOptionalText(readString(project, "current_branch")),
  };
}

function normalizeLegacyPhases(value: unknown): IntermediatePhase[] {
  if (!Array.isArray(value)) {
    throw new Error("External adapter file is missing `plan.phases`.");
  }

  return value.map((phase, phaseIndex) => {
    const record = asRecord(phase);
    return {
      id: sanitizeInlineText(readString(record, "id"), `phase-${phaseIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Phase ${phaseIndex + 1}`),
      goal: sanitizeOptionalText(readString(record, "goal")),
      kind: sanitizeOptionalText(readString(record, "kind")),
      difficulty: readDifficulty(record.difficulty),
      checkpoints: normalizeLegacyCheckpoints(record.checkpoints, phaseIndex),
    };
  });
}

function normalizeLegacyCheckpoints(value: unknown, phaseIndex: number): IntermediateCheckpoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((checkpoint, checkpointIndex) => {
    const record = asRecord(checkpoint);
    return {
      id: sanitizeInlineText(readString(record, "id"), `cp-${phaseIndex + 1}-${checkpointIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Checkpoint ${checkpointIndex + 1}`),
      goal: sanitizeOptionalText(readString(record, "goal")),
      kind: sanitizeOptionalText(readString(record, "kind")),
      difficulty: readDifficulty(record.difficulty),
      status: coerceStatus(record.status),
      weight: readNumber(record, "weight"),
    };
  });
}

function normalizeLegacyTasks(value: unknown, phases: IntermediatePhase[]): IntermediateTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const checkpointPhaseMap = new Map<string, string>();
  for (const phase of phases) {
    for (const checkpoint of phase.checkpoints ?? []) {
      checkpointPhaseMap.set(checkpoint.id, phase.id);
    }
  }

  return value.map((task, taskIndex) => {
    const record = asRecord(task);
    const checkpointId = sanitizeOptionalText(readString(record, "checkpoint_id"));
    return {
      id: sanitizeInlineText(readString(record, "id"), `task-${taskIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Task ${taskIndex + 1}`),
      phase_id:
        sanitizeOptionalText(readString(record, "lap_id")) ??
        sanitizeOptionalText(readString(record, "phase_id")) ??
        checkpointPhaseMap.get(checkpointId ?? ""),
      checkpoint_id: checkpointId,
      status: coerceStatus(record.status),
      owner: sanitizeOptionalText(readString(record, "owner")) ?? null,
    };
  });
}

function normalizeIntermediatePhases(value: unknown[]): IntermediatePhase[] {
  return value.map((phase, phaseIndex) => {
    const record = asRecord(phase);
    return {
      id: sanitizeInlineText(readString(record, "id"), `phase-${phaseIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Phase ${phaseIndex + 1}`),
      goal: sanitizeOptionalText(readString(record, "goal")),
      kind: sanitizeOptionalText(readString(record, "kind")),
      difficulty: readDifficulty(record.difficulty),
      checkpoints: normalizeIntermediateCheckpoints(record.checkpoints, phaseIndex),
    };
  });
}

function normalizeIntermediateCheckpoints(value: unknown, phaseIndex: number): IntermediateCheckpoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((checkpoint, checkpointIndex) => {
    const record = asRecord(checkpoint);
    return {
      id: sanitizeInlineText(readString(record, "id"), `cp-${phaseIndex + 1}-${checkpointIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Checkpoint ${checkpointIndex + 1}`),
      goal: sanitizeOptionalText(readString(record, "goal")),
      kind: sanitizeOptionalText(readString(record, "kind")),
      difficulty: readDifficulty(record.difficulty),
      status: coerceStatus(record.status),
      weight: readNumber(record, "weight"),
    };
  });
}

function normalizeIntermediateTasks(value: unknown): IntermediateTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((task, taskIndex) => {
    const record = asRecord(task);
    return {
      id: sanitizeInlineText(readString(record, "id"), `task-${taskIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Task ${taskIndex + 1}`),
      phase_id: sanitizeOptionalText(readString(record, "phase_id")),
      checkpoint_id: sanitizeOptionalText(readString(record, "checkpoint_id")),
      status: coerceStatus(record.status),
      owner: sanitizeOptionalText(readString(record, "owner")) ?? null,
    };
  });
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  const metadata = asRecord(value);
  return Object.fromEntries(Object.entries(metadata).filter(([, entry]) => entry != null));
}

function readDifficulty(value: unknown): IntermediateCheckpoint["difficulty"] {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }

  return {
    effort: readNumber(record, "effort"),
    uncertainty: readNumber(record, "uncertainty"),
    dependencies: readNumber(record, "dependencies"),
    coordination: readNumber(record, "coordination"),
    risk: readNumber(record, "risk"),
    approvals: readNumber(record, "approvals"),
    branch_factor: readNumber(record, "branch_factor"),
  };
}

function coerceStatus(value: unknown): IntermediateTask["status"] {
  return value === "done" || value === "doing" || value === "blocked" ? value : "todo";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const normalized = sanitizeInlineText(String(value), "");
  return normalized || undefined;
}
