import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { intermediateToExternalPlan } from "./adapters/bridge.js";
import type { IntermediateRoadmapSchema } from "./adapter-schema.js";
import { projectExternalPlan } from "./external-plan.js";
import { sanitizeInlineText } from "./security.js";
import { summarizeTrack } from "./summary.js";
import type { ProjectExternalPlanResult } from "./types.js";

export type TrackBootstrapSourceKind = "readme" | "package" | "git";
export type TrackBootstrapRequestedSource = TrackBootstrapSourceKind | "auto";

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

export async function bootstrapTrack(options: TrackBootstrapOptions): Promise<TrackBootstrapResult> {
  const cwd = path.resolve(options.cwd);
  const sources = resolveBootstrapSources(options.from);
  const warnings: string[] = [];
  const evidence: TrackBootstrapEvidence[] = [];

  const [readme, packageJson, git] = await Promise.all([
    sources.includes("readme") ? readReadmeSignal(cwd) : Promise.resolve(null),
    sources.includes("package") ? readPackageSignal(cwd) : Promise.resolve(null),
    sources.includes("git") ? readGitSignal(cwd, options.commandRunner ?? defaultCommandRunner) : Promise.resolve(null),
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

  const schema = buildBootstrapSchema({
    cwd,
    git,
    packageJson,
    projectName: options.projectName,
    readme,
    sources,
  });
  const projected = projectExternalPlan(intermediateToExternalPlan(schema), { preserveProgress: false });

  return {
    ...projected,
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

  const expanded = requested.length === 0 || requested.includes("auto") ? ["readme", "package", "git"] : requested;
  const normalized: TrackBootstrapSourceKind[] = [];
  for (const source of expanded) {
    if (source !== "readme" && source !== "package" && source !== "git") {
      throw new Error("`--from` must contain auto, readme, package, or git.");
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

  lines.push("");
  lines.push("This is a draft. Review the evidence before writing .track files.");
  return lines.join("\n");
}

function buildBootstrapSchema(input: {
  cwd: string;
  git: GitSignal | null;
  packageJson: PackageSignal | null;
  projectName: string | undefined;
  readme: ReadmeSignal | null;
  sources: TrackBootstrapSourceKind[];
}): IntermediateRoadmapSchema {
  const projectName = resolveBootstrapProjectName(input.projectName, input.readme, input.packageJson, input.cwd);
  const projectId = slugify(input.packageJson?.name ?? projectName);
  const title = input.readme?.title ?? projectName;
  const hasPackage = Boolean(input.packageJson);
  const hasGit = Boolean(input.git?.present);

  const checkpoints = [
    {
      id: "cp-bootstrap-purpose",
      title: input.readme ? `Confirm ${title} direction` : "Confirm project direction",
      goal: "Review local project documentation and confirm the first Track plan.",
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
        title: "Review bootstrap evidence and confirm the first Track slice",
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

async function readReadmeSignal(cwd: string): Promise<ReadmeSignal | null> {
  const candidates = ["README.md", "readme.md", "README"];
  for (const candidate of candidates) {
    const filePath = path.join(cwd, candidate);
    try {
      const raw = await readFile(filePath, "utf8");
      const headings = Array.from(raw.matchAll(/^#{1,3}\s+(.+)$/gm))
        .map((match) => sanitizeInlineText(match[1], ""))
        .filter(Boolean)
        .slice(0, 6);
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
