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

type NotionPageType = "phase" | "checkpoint" | "task";

export class NotionRoadmapAdapter implements RoadmapAdapter {
  readonly sourceKind = "notion";
  private data?: IntermediateRoadmapSchema;

  constructor(private readonly filePath: string) {}

  async fetch(): Promise<void> {
    const absolutePath = path.resolve(this.filePath);
    const content = await readFile(absolutePath, "utf8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(content) : parse(content);
    this.data = normalizeNotionSchema(parsed);
  }

  async toInternalSchema(): Promise<IntermediateRoadmapSchema> {
    if (!this.data) {
      throw new Error(`No data loaded from ${this.filePath}. Did you call fetch() first?`);
    }
    return this.data;
  }
}

function normalizeNotionSchema(source: unknown): IntermediateRoadmapSchema {
  if (!source || typeof source !== "object") {
    throw new Error("Notion adapter source must be an object.");
  }

  const record = source as Record<string, unknown>;
  const version = typeof record.version === "number" ? record.version : 1;
  const project = normalizeProject(record.project);
  const database = asRecord(record.database);
  const plan = asRecord(record.plan);
  const pages = normalizePages(record.pages);

  const phases = new Map<string, IntermediatePhase>();
  const phaseOrder: string[] = [];
  const tasks: IntermediateTask[] = [];

  for (const page of pages) {
    if (page.type === "phase") {
      const phaseId = sanitizeInlineText(readString(page.properties, "Phase ID"), page.id);
      if (!phases.has(phaseId)) {
        phases.set(phaseId, {
          id: phaseId,
          title: sanitizeInlineText(readString(page.properties, "Title"), "Untitled phase"),
          goal: sanitizeOptionalText(readString(page.properties, "Goal")),
          kind: sanitizeOptionalText(readString(page.properties, "Kind")),
          checkpoints: [],
        });
        phaseOrder.push(phaseId);
      }
      continue;
    }

    if (page.type === "checkpoint") {
      const phaseId = sanitizeInlineText(readString(page.properties, "Phase ID"), "");
      const phase = phases.get(phaseId);
      if (!phase) {
        throw new Error(`Notion checkpoint page \`${page.id}\` references unknown phase \`${phaseId}\`.`);
      }

      (phase.checkpoints ??= []).push({
        id: sanitizeInlineText(readString(page.properties, "Checkpoint ID"), page.id),
        title: sanitizeInlineText(readString(page.properties, "Title"), "Untitled checkpoint"),
        goal: sanitizeOptionalText(readString(page.properties, "Goal")),
        kind: sanitizeOptionalText(readString(page.properties, "Kind")),
        status: coerceStatus(readString(page.properties, "Status")),
        weight: readNumber(page.properties, "Weight"),
      });
      continue;
    }

    tasks.push({
      id: sanitizeInlineText(readString(page.properties, "Task ID"), page.id),
      title: sanitizeInlineText(readString(page.properties, "Title"), "Untitled task"),
      phase_id: sanitizeOptionalText(readString(page.properties, "Phase ID")),
      checkpoint_id: sanitizeOptionalText(readString(page.properties, "Checkpoint ID")),
      status: coerceStatus(readString(page.properties, "Status")),
      owner: sanitizeOptionalText(readString(page.properties, "Owner")) ?? null,
    });
  }

  return {
    version,
    project,
    phases: phaseOrder.map((phaseId) => phases.get(phaseId) ?? fallbackPhase(phaseId)),
    tasks,
    metadata: {
      kind: "notion",
      name: sanitizeOptionalText(readString(database, "title")),
      database_id: sanitizeOptionalText(readString(database, "id")),
      plan_id: sanitizeOptionalText(readString(plan, "id")),
      plan_title: sanitizeOptionalText(readString(plan, "title")),
      topology: sanitizeOptionalText(readString(plan, "topology")) ?? project.mode,
    },
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

function normalizePages(value: unknown): Array<{ id: string; type: NotionPageType; properties: Record<string, unknown> }> {
  if (!Array.isArray(value)) {
    throw new Error("Notion adapter source is missing `pages`.");
  }

  return value.map((page, index) => {
    const record = asRecord(page);
    const pageType = coercePageType(readString(record, "type"));
    if (!pageType) {
      throw new Error(`Notion adapter page ${index + 1} is missing a supported \`type\`.`);
    }

    return {
      id: sanitizeInlineText(readString(record, "id"), `notion-page-${index + 1}`),
      type: pageType,
      properties: asRecord(record.properties),
    };
  });
}

function coercePageType(value: string | undefined): NotionPageType | undefined {
  return value === "phase" || value === "checkpoint" || value === "task" ? value : undefined;
}

function coerceStatus(value: string | undefined): IntermediateTask["status"] {
  return value === "done" || value === "doing" || value === "blocked" ? value : "todo";
}

function fallbackPhase(phaseId: string): IntermediatePhase {
  return {
    id: phaseId,
    title: "Untitled phase",
    checkpoints: [],
  };
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

function sanitizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const normalized = sanitizeInlineText(String(value), "");
  return normalized || undefined;
}
