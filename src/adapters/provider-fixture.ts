import type {
  IntermediateCheckpoint,
  IntermediatePhase,
  IntermediateRoadmapSchema,
  IntermediateTask,
} from "../adapter-schema.js";
import { sanitizeInlineText } from "../security.js";

export interface ProviderFixtureOptions {
  sourceKind: "github" | "jira" | "linear";
  sourceRecordKey: string;
  phaseCollectionKey: string;
  taskCollectionKey: string;
  taskIdKeys: string[];
  taskPhaseLinkKeys: string[];
  taskOwnerKeys?: string[];
  metadataName: (sourceRecord: Record<string, unknown>) => string | undefined;
  metadataExtra?: (sourceRecord: Record<string, unknown>) => Record<string, unknown>;
}

export function normalizeProviderFixtureSchema(
  source: unknown,
  options: ProviderFixtureOptions
): IntermediateRoadmapSchema {
  if (!source || typeof source !== "object") {
    throw new Error(`${options.sourceKind} adapter source must be an object.`);
  }

  const record = source as Record<string, unknown>;
  const version = typeof record.version === "number" ? record.version : 1;
  const project = normalizeProject(record.project);
  const plan = asRecord(record.plan);
  const sourceRecord = asRecord(record[options.sourceRecordKey]);
  const phases = normalizePhases(record[options.phaseCollectionKey], options.sourceKind);
  const tasks = normalizeTasks(record[options.taskCollectionKey], phases, options);

  return {
    version,
    project,
    phases,
    tasks,
    metadata: stripNullish({
      kind: options.sourceKind,
      name: options.metadataName(sourceRecord),
      plan_id: sanitizeOptionalText(readString(plan, "id")),
      plan_title: sanitizeOptionalText(readString(plan, "title")),
      topology: sanitizeOptionalText(readString(plan, "topology")) ?? project.mode,
      ...(options.metadataExtra?.(sourceRecord) ?? {}),
    }),
  };
}

function normalizeProject(value: unknown): IntermediateRoadmapSchema["project"] {
  const project = asRecord(value);
  return {
    id: sanitizeInlineText(readString(project, "id"), "track"),
    name: sanitizeInlineText(readString(project, "name"), "Track"),
    mode: sanitizeOptionalText(readString(project, "mode")),
    current_branch: sanitizeOptionalText(readString(project, "current_branch")),
  };
}

function normalizePhases(value: unknown, sourceKind: ProviderFixtureOptions["sourceKind"]): IntermediatePhase[] {
  if (!Array.isArray(value)) {
    throw new Error(`${sourceKind} adapter source is missing the phase collection.`);
  }

  return value.map((phase, phaseIndex) => {
    const record = asRecord(phase);
    return {
      id: sanitizeInlineText(readString(record, "id"), `phase-${phaseIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Phase ${phaseIndex + 1}`),
      goal: sanitizeOptionalText(readString(record, "goal")),
      kind: sanitizeOptionalText(readString(record, "kind")),
      difficulty: readDifficulty(record.difficulty),
      checkpoints: normalizeCheckpoints(record.checkpoints, phaseIndex),
    };
  });
}

function normalizeCheckpoints(value: unknown, phaseIndex: number): IntermediateCheckpoint[] {
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
      status: coerceStatus(readString(record, "status")),
      weight: readNumber(record, "weight"),
    };
  });
}

function normalizeTasks(
  value: unknown,
  phases: IntermediatePhase[],
  options: ProviderFixtureOptions
): IntermediateTask[] {
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
    const phaseId =
      sanitizeOptionalText(firstString(record, options.taskPhaseLinkKeys)) ??
      checkpointPhaseMap.get(checkpointId ?? "");

    return {
      id: sanitizeInlineText(firstString(record, options.taskIdKeys), `task-${taskIndex + 1}`),
      title: sanitizeInlineText(readString(record, "title"), `Task ${taskIndex + 1}`),
      phase_id: phaseId,
      checkpoint_id: checkpointId,
      status: coerceStatus(readString(record, "status")),
      owner: sanitizeOptionalText(firstString(record, options.taskOwnerKeys ?? ["owner"])) ?? null,
    };
  });
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

function coerceStatus(value: string | undefined): IntermediateTask["status"] {
  return value === "done" || value === "doing" || value === "blocked" ? value : "todo";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readString(record, key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function sanitizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const normalized = sanitizeInlineText(String(value), "");
  return normalized || undefined;
}

function stripNullish(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value != null && value !== ""));
}
