import { access, readFile } from "node:fs/promises";
import path from "node:path";

export interface TrackPackageBoundary {
  description: string;
  entrypoint: string;
  name: string;
  packageName: string;
  owns: string[];
  releaseEntrypoint: string;
}

export interface PackageLayoutCheckResult {
  boundaries: TrackPackageBoundary[];
  missing: Array<{
    boundary: string;
    path: string;
    role: "entrypoint" | "owned_path";
  }>;
  ok: boolean;
}

export interface PackageDryRunEntry {
  condition?: string;
  covered: boolean;
  coveredBy: string | null;
  name?: string;
  subpath?: string;
  target: string;
}

export interface PackageDryRunIssue {
  boundary?: string;
  code:
    | "invalid_manifest"
    | "missing_build_artifact_allowlist"
    | "missing_build_script"
    | "missing_bin"
    | "missing_bin_target"
    | "missing_export"
    | "missing_export_target"
    | "missing_files_allowlist"
    | "missing_package_field"
    | "missing_package_file"
    | "uncovered_bin"
    | "uncovered_doc"
    | "export_target_mismatch"
    | "uncovered_export"
    | "uncovered_package_path";
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface PackageDryRunCheckResult {
  binEntries: PackageDryRunEntry[];
  exportEntries: PackageDryRunEntry[];
  filesAllowlist: string[];
  includedFiles: string[];
  issues: PackageDryRunIssue[];
  layout: PackageLayoutCheckResult;
  ok: boolean;
  packageName: string | null;
  privatePackage: boolean;
  publishable: boolean;
  version: string | null;
}

export interface PackageReadinessGate {
  command?: string;
  detail: string;
  id: string;
  ok: boolean;
  title: string;
}

export interface PackageReadinessCheckResult {
  dryRun: PackageDryRunCheckResult;
  gates: PackageReadinessGate[];
  mode: "private-root" | "publishable";
  ok: boolean;
  packageName: string | null;
  version: string | null;
}

export interface PackageHandoffNoteResult {
  boundaries: TrackPackageBoundary[];
  docs: string[];
  mode: "private-root" | "publishable";
  ok: boolean;
  packageName: string | null;
  publicSubpaths: string[];
  readiness: PackageReadinessCheckResult;
  recommendedCommands: string[];
  status: "blocked" | "ready-private-root" | "ready-publishable";
  summary: string;
  version: string | null;
}

export const TRACK_PACKAGE_BOUNDARIES: TrackPackageBoundary[] = [
  {
    name: "core",
    packageName: "track-core",
    description: "Canonical types, summary projection, control snapshot, and track-map generation.",
    entrypoint: "src/packages/core.ts",
    owns: ["src/types.ts", "src/summary.ts", "src/control.ts", "src/generator.ts", "src/security.ts"],
    releaseEntrypoint: "dist/packages/core.js",
  },
  {
    name: "runtime",
    packageName: "track-runtime",
    description: "File-backed state loading, mutation, import adapters, and Pitwall runtime helpers.",
    entrypoint: "src/packages/runtime.ts",
    owns: ["src/state.ts", "src/roadmap.ts", "src/mutation.ts", "src/actions.ts", "src/external-plan.ts", "src/adapters", "src/pitwall.ts"],
    releaseEntrypoint: "dist/packages/runtime.js",
  },
  {
    name: "mcp",
    packageName: "track-mcp",
    description: "MCP server, read/write tool declarations, stdio transport, and MCP contract docs.",
    entrypoint: "src/packages/mcp.ts",
    owns: ["src/mcp.ts", "docs/MCP_CONTRACT.md"],
    releaseEntrypoint: "dist/packages/mcp.js",
  },
  {
    name: "cli",
    packageName: "track-cli",
    description: "Terminal commands, renderers, aliases, watch loop, and race telemetry text surfaces.",
    entrypoint: "src/packages/cli.ts",
    owns: [
      "src/cli.ts",
      "src/render.ts",
      "src/buddy.ts",
      "src/aliases.ts",
      "src/watch.ts",
      "src/ansi.ts",
      "src/openclaw-pitwall.ts",
      "src/openclaw-live.ts",
    ],
    releaseEntrypoint: "dist/packages/cli.js",
  },
  {
    name: "agents",
    packageName: "track-agents",
    description: "Claude Code, Codex, Gemini CLI operating packs plus export/install helpers.",
    entrypoint: "src/packages/agents.ts",
    owns: ["src/agent-packs.ts", "agents", "docs/agent-operating-packs.md"],
    releaseEntrypoint: "dist/packages/agents.js",
  },
  {
    name: "vscode",
    packageName: "track-vscode",
    description: "VS Code companion extension, webview shell, course tree, and status-bar telemetry.",
    entrypoint: "vscode-extension/src/extension.ts",
    owns: ["vscode-extension/package.json", "vscode-extension/src", "vscode-extension/README.md"],
    releaseEntrypoint: "vscode-extension/dist/extension.js",
  },
];

const REQUIRED_PACKAGE_DOCS = ["README.md", "docs/package-layout.md"];
const RELEASE_HANDOFF_DOCS = ["README.md", "docs/package-layout.md", "docs/HARNESS_MASTER_GUIDE.md"] as const;
const DEFAULT_HANDOFF_COMMANDS = [
  "npm run package:readiness",
  "npm run package:install-smoke",
  "npm pack --dry-run --json",
] as const;
const REQUIRED_READINESS_SCRIPTS = [
  { id: "build", name: "build", command: "npm run build", title: "Runtime build" },
  { id: "typecheck", name: "typecheck", command: "npm run typecheck", title: "Typecheck" },
  { id: "test", name: "test", command: "npm test", title: "Regression test" },
  { id: "harness", name: "check:harness", command: "npm run check:harness", title: "Harness consistency" },
  { id: "package-dry-run", name: "package:dry-run", command: "npm run package:dry-run", title: "Package dry-run" },
  {
    id: "install-smoke",
    name: "package:install-smoke",
    command: "npm run package:install-smoke",
    title: "Install smoke",
  },
] as const;

export function listTrackPackageBoundaries(): TrackPackageBoundary[] {
  return TRACK_PACKAGE_BOUNDARIES.map((boundary) => ({
    ...boundary,
    owns: [...boundary.owns],
  }));
}

export async function checkTrackPackageLayout(repoRoot: string): Promise<PackageLayoutCheckResult> {
  const missing: PackageLayoutCheckResult["missing"] = [];

  for (const boundary of TRACK_PACKAGE_BOUNDARIES) {
    if (!(await exists(path.join(repoRoot, boundary.entrypoint)))) {
      missing.push({ boundary: boundary.name, path: boundary.entrypoint, role: "entrypoint" });
    }

    for (const ownedPath of boundary.owns) {
      if (!(await exists(path.join(repoRoot, ownedPath)))) {
        missing.push({ boundary: boundary.name, path: ownedPath, role: "owned_path" });
      }
    }
  }

  return {
    boundaries: listTrackPackageBoundaries(),
    missing,
    ok: missing.length === 0,
  };
}

export async function checkTrackPackageDryRun(repoRoot: string): Promise<PackageDryRunCheckResult> {
  const layout = await checkTrackPackageLayout(repoRoot);
  const issues: PackageDryRunIssue[] = [];
  const manifest = await readPackageManifest(repoRoot, issues);
  const packageName = readString(manifest, "name");
  const version = readString(manifest, "version");
  const privatePackage = readBoolean(manifest, "private") === true;
  const filesAllowlist = readStringArray(manifest, "files");

  if (!packageName) {
    issues.push({
      code: "missing_package_field",
      message: "package.json must define a package name.",
      path: "package.json",
      severity: "error",
    });
  }

  if (!version) {
    issues.push({
      code: "missing_package_field",
      message: "package.json must define a version.",
      path: "package.json",
      severity: "error",
    });
  }

  if (filesAllowlist.length === 0) {
    issues.push({
      code: "missing_files_allowlist",
      message: "package.json must define a files allowlist before distribution dry-runs are meaningful.",
      path: "package.json",
      severity: "error",
    });
  }

  const exportEntries = readExportEntries(manifest.exports).map((entry) => withCoverage(entry, filesAllowlist));
  const binEntries = readBinEntries(manifest.bin).map((entry) => withCoverage(entry, filesAllowlist));

  validatePackageBoundaryExports(exportEntries, issues);
  validateBuildArtifactReadiness(manifest, filesAllowlist, issues);
  validateCoveredEntries(exportEntries, "export", issues);
  validateCoveredEntries(binEntries, "bin", issues);
  validateRequiredBin(binEntries, issues);
  await validatePackageEntryTargets(repoRoot, exportEntries, binEntries, issues);
  await validateRequiredDocs(repoRoot, filesAllowlist, issues);
  validateCoveredPackageBoundaries(layout.boundaries, filesAllowlist, issues);

  const includedFiles = [
    "package.json",
    ...REQUIRED_PACKAGE_DOCS.filter((docPath) => isPackagePathCovered(filesAllowlist, docPath)),
    ...exportEntries.map((entry) => entry.target),
    ...binEntries.map((entry) => entry.target),
  ];

  return {
    binEntries,
    exportEntries,
    filesAllowlist,
    includedFiles: [...new Set(includedFiles)].sort(),
    issues,
    layout,
    ok: layout.ok && !issues.some((issue) => issue.severity === "error"),
    packageName,
    privatePackage,
    publishable: !privatePackage,
    version,
  };
}

export async function checkTrackPublishReadiness(repoRoot: string): Promise<PackageReadinessCheckResult> {
  const dryRun = await checkTrackPackageDryRun(repoRoot);
  const manifestIssues: PackageDryRunIssue[] = [];
  const manifest = await readPackageManifest(repoRoot, manifestIssues);
  const packageName = dryRun.packageName;
  const version = dryRun.version;
  const privatePackage = dryRun.privatePackage;
  const scripts = readScriptMap(manifest);
  const gates: PackageReadinessGate[] = [
    ...REQUIRED_READINESS_SCRIPTS.map((script) => ({
      command: script.command,
      detail: hasScript(scripts, script.name) ? `script ${script.name}` : `missing script ${script.name}`,
      id: script.id,
      ok: hasScript(scripts, script.name),
      title: script.title,
    })),
    {
      command: "npm pack --dry-run --json",
      detail: dryRun.ok ? "manifest, exports, bin, docs, and files are covered" : "package dry-run has blocking issues",
      id: "npm-pack-dry-run",
      ok: dryRun.ok,
      title: "npm pack dry-run",
    },
    {
      detail: privatePackage ? "root package is still private; publish is intentionally blocked" : "root package is publishable",
      id: "release-mode",
      ok: true,
      title: "Release mode",
    },
  ];

  if (manifestIssues.length) {
    gates.push({
      detail: manifestIssues.map((issue) => issue.message).join("; "),
      id: "package-manifest",
      ok: false,
      title: "Package manifest",
    });
  }

  return {
    dryRun,
    gates,
    mode: privatePackage ? "private-root" : "publishable",
    ok: dryRun.ok && gates.every((gate) => gate.ok),
    packageName,
    version,
  };
}

export async function buildTrackPackageHandoff(repoRoot: string): Promise<PackageHandoffNoteResult> {
  const readiness = await checkTrackPublishReadiness(repoRoot);
  const docs: string[] = [];
  for (const docPath of RELEASE_HANDOFF_DOCS) {
    if (await exists(path.join(repoRoot, docPath))) {
      docs.push(docPath);
    }
  }
  const publicSubpaths = [
    ...new Set(readiness.dryRun.exportEntries.map((entry) => entry.subpath ?? ".").filter((value) => value.length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  const boundaries = listTrackPackageBoundaries();
  const status = summarizePackageHandoffStatus(readiness);

  return {
    boundaries,
    docs,
    mode: readiness.mode,
    ok: readiness.ok,
    packageName: readiness.packageName,
    publicSubpaths,
    readiness,
    recommendedCommands: [...DEFAULT_HANDOFF_COMMANDS],
    status: status.id,
    summary: status.summary,
    version: readiness.version,
  };
}

export function renderPackageDryRunCheck(result: PackageDryRunCheckResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const coveredExports = result.exportEntries.filter((entry) => entry.covered).length;
  const coveredBins = result.binEntries.filter((entry) => entry.covered).length;
  const lines = [
    result.ok ? "PACKAGE DRY-RUN OK" : "PACKAGE DRY-RUN FAIL",
    `PACKAGE  ${packageLabel}`,
    `PUBLISH  ${result.publishable ? "publishable" : "private-root"}`,
    `FILES    ${result.filesAllowlist.length ? result.filesAllowlist.join(", ") : "missing"}`,
    `EXPORTS  ${coveredExports}/${result.exportEntries.length} covered`,
    `BIN      ${coveredBins}/${result.binEntries.length} covered`,
    `LAYOUT   ${result.layout.ok ? "ok" : "failed"}`,
  ];

  if (result.exportEntries.length) {
    lines.push("");
    lines.push("Exports:");
    for (const entry of result.exportEntries) {
      const label = entry.condition ? `${entry.subpath ?? "?"}:${entry.condition}` : entry.subpath ?? "?";
      lines.push(`- ${label.padEnd(24)} ${entry.target} ${entry.covered ? "covered" : "uncovered"}`);
    }
  }

  if (result.issues.length) {
    lines.push("");
    lines.push("Issues:");
    for (const issue of result.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

export function renderPackageHandoffNote(result: PackageHandoffNoteResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const readyGates = result.readiness.gates.filter((gate) => gate.ok).length;
  const lines = [
    result.ok ? "PACKAGE RELEASE HANDOFF" : "PACKAGE RELEASE HANDOFF BLOCKED",
    `PACKAGE  ${packageLabel}`,
    `STATUS   ${result.status}`,
    `MODE     ${result.mode}`,
    `SUMMARY  ${result.summary}`,
    `GATE     ${readyGates}/${result.readiness.gates.length} ready`,
    "",
    "Handoff Commands:",
  ];

  for (const command of result.recommendedCommands) {
    lines.push(`- ${command}`);
  }

  lines.push("");
  lines.push("Public Subpaths:");
  for (const subpath of result.publicSubpaths) {
    lines.push(`- ${subpath}`);
  }

  lines.push("");
  lines.push("Boundary Releases:");
  for (const boundary of result.boundaries) {
    lines.push(`- ${boundary.packageName} -> ${boundary.releaseEntrypoint}`);
  }

  lines.push("");
  lines.push("Docs:");
  for (const docPath of result.docs) {
    lines.push(`- ${docPath}`);
  }

  if (result.readiness.dryRun.issues.length) {
    lines.push("");
    lines.push("Blocking package issues:");
    for (const issue of result.readiness.dryRun.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

export function renderPackageReadinessCheck(result: PackageReadinessCheckResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const readyGates = result.gates.filter((gate) => gate.ok).length;
  const lines = [
    result.ok ? "PACKAGE READINESS GATE OK" : "PACKAGE READINESS GATE FAIL",
    `PACKAGE  ${packageLabel}`,
    `MODE     ${result.mode}`,
    `DRY-RUN  ${result.dryRun.ok ? "ok" : "failed"}`,
    `GATES    ${readyGates}/${result.gates.length} ready`,
    "",
    "Gates:",
  ];

  for (const gate of result.gates) {
    const command = gate.command ? ` ${gate.command}` : "";
    lines.push(`- ${gate.id.padEnd(18)} ${gate.ok ? "ready" : "blocked"}${command}`);
    lines.push(`  ${gate.detail}`);
  }

  if (result.dryRun.issues.length) {
    lines.push("");
    lines.push("Blocking package issues:");
    for (const issue of result.dryRun.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

export function renderPackageLayoutCheck(result: PackageLayoutCheckResult): string {
  const lines = [
    result.ok ? "PACKAGE LAYOUT OK" : "PACKAGE LAYOUT FAIL",
    `BOUNDARIES ${result.boundaries.length}`,
  ];

  for (const boundary of result.boundaries) {
    lines.push(`${boundary.packageName.padEnd(14)} ${boundary.entrypoint}`);
  }

  if (result.missing.length) {
    lines.push("");
    lines.push("Missing:");
    for (const item of result.missing) {
      lines.push(`- ${item.boundary} ${item.role}: ${item.path}`);
    }
  }

  return lines.join("\n");
}

export function isPackagePathCovered(filesAllowlist: string[], targetPath: string): string | null {
  const normalizedTarget = normalizePackagePath(targetPath);
  for (const allowedPath of filesAllowlist) {
    const normalizedAllowed = normalizePackagePath(allowedPath);
    if (normalizedTarget === normalizedAllowed || normalizedTarget.startsWith(`${normalizedAllowed}/`)) {
      return allowedPath;
    }
  }
  return null;
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageManifest(repoRoot: string, issues: PackageDryRunIssue[]): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8")) as Record<string, unknown>;
  } catch (error: unknown) {
    issues.push({
      code: "invalid_manifest",
      message: error instanceof Error ? error.message : String(error),
      path: "package.json",
      severity: "error",
    });
    return {};
  }
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function readStringArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readScriptMap(source: Record<string, unknown>): Record<string, string> {
  const scripts = source.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function hasScript(scripts: Record<string, string>, name: string): boolean {
  return typeof scripts[name] === "string" && scripts[name].trim().length > 0;
}

function summarizePackageHandoffStatus(readiness: PackageReadinessCheckResult): {
  id: PackageHandoffNoteResult["status"];
  summary: string;
} {
  if (!readiness.ok) {
    return {
      id: "blocked",
      summary: "Release handoff is blocked until package readiness issues are resolved.",
    };
  }

  if (readiness.mode === "private-root") {
    return {
      id: "ready-private-root",
      summary: "Ready for artifact handoff. npm publish remains intentionally blocked while the root package is private.",
    };
  }

  return {
    id: "ready-publishable",
    summary: "Ready for publish handoff. Package readiness gates are green.",
  };
}

function readExportEntries(exportsValue: unknown): PackageDryRunEntry[] {
  if (!exportsValue || typeof exportsValue !== "object" || Array.isArray(exportsValue)) {
    return [];
  }

  return Object.entries(exportsValue)
    .flatMap(([subpath, target]) => readExportTargetEntries(subpath, target))
    .sort((left, right) => {
      const subpathOrder = (left.subpath ?? "").localeCompare(right.subpath ?? "");
      return subpathOrder === 0 ? (left.condition ?? "").localeCompare(right.condition ?? "") : subpathOrder;
    });
}

function readBinEntries(binValue: unknown): PackageDryRunEntry[] {
  if (typeof binValue === "string") {
    return [{ name: "track", target: normalizePackageTarget(binValue), covered: false, coveredBy: null }];
  }
  if (!binValue || typeof binValue !== "object" || Array.isArray(binValue)) {
    return [];
  }

  return Object.entries(binValue)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, target]) => ({ name, target: normalizePackageTarget(target), covered: false, coveredBy: null }))
    .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""));
}

function readExportTargetEntries(
  subpath: string,
  value: unknown,
  conditionPath: string[] = []
): PackageDryRunEntry[] {
  if (typeof value === "string") {
    return [
      {
        condition: conditionPath.length ? conditionPath.join(".") : undefined,
        covered: false,
        coveredBy: null,
        subpath,
        target: normalizePackageTarget(value),
      },
    ];
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([condition, child]) =>
    readExportTargetEntries(subpath, child, [...conditionPath, condition])
  );
}

function withCoverage(entry: PackageDryRunEntry, filesAllowlist: string[]): PackageDryRunEntry {
  const coveredBy = isPackagePathCovered(filesAllowlist, entry.target);
  return {
    ...entry,
    covered: Boolean(coveredBy),
    coveredBy,
  };
}

function validatePackageBoundaryExports(exportEntries: PackageDryRunEntry[], issues: PackageDryRunIssue[]): void {
  for (const boundary of TRACK_PACKAGE_BOUNDARIES) {
    const expectedSubpath = `./${boundary.name}`;
    const entries = exportEntries.filter((candidate) => candidate.subpath === expectedSubpath);
    if (entries.length === 0) {
      issues.push({
        boundary: boundary.name,
        code: "missing_export",
        message: `package.json exports must expose ${expectedSubpath}.`,
        path: "package.json",
        severity: "error",
      });
      continue;
    }
    if (!entries.some((entry) => entry.target === boundary.releaseEntrypoint)) {
      issues.push({
        boundary: boundary.name,
        code: "export_target_mismatch",
        message: `${expectedSubpath} should point at ${boundary.releaseEntrypoint}, got ${entries
          .map((entry) => entry.target)
          .join(", ")}.`,
        path: "package.json",
        severity: "error",
      });
    }
  }
}

function validateBuildArtifactReadiness(
  manifest: Record<string, unknown>,
  filesAllowlist: string[],
  issues: PackageDryRunIssue[]
): void {
  const scripts = manifest.scripts;
  const buildScript =
    scripts && typeof scripts === "object" && !Array.isArray(scripts)
      ? (scripts as Record<string, unknown>).build
      : undefined;

  if (typeof buildScript !== "string" || buildScript.trim().length === 0) {
    issues.push({
      code: "missing_build_script",
      message: "package.json must define a build script before release artifacts can be verified.",
      path: "package.json",
      severity: "error",
    });
  }

  if (!isPackagePathCovered(filesAllowlist, "dist")) {
    issues.push({
      code: "missing_build_artifact_allowlist",
      message: "package.json files must include dist so compiled build artifacts are packageable.",
      path: "package.json",
      severity: "error",
    });
  }
}

function validateCoveredEntries(
  entries: PackageDryRunEntry[],
  kind: "bin" | "export",
  issues: PackageDryRunIssue[]
): void {
  for (const entry of entries) {
    if (entry.covered) {
      continue;
    }
    issues.push({
      code: kind === "bin" ? "uncovered_bin" : "uncovered_export",
      message:
        kind === "bin"
          ? `bin ${entry.name ?? "unknown"} target ${entry.target} is not covered by package.json files.`
          : `export ${entry.subpath ?? "unknown"} target ${entry.target} is not covered by package.json files.`,
      path: entry.target,
      severity: "error",
    });
  }
}

function validateRequiredBin(binEntries: PackageDryRunEntry[], issues: PackageDryRunIssue[]): void {
  if (!binEntries.some((entry) => entry.name === "track")) {
    issues.push({
      code: "missing_bin",
      message: "package.json must expose the track CLI through bin.track.",
      path: "package.json",
      severity: "error",
    });
  }
}

async function validatePackageEntryTargets(
  repoRoot: string,
  exportEntries: PackageDryRunEntry[],
  binEntries: PackageDryRunEntry[],
  issues: PackageDryRunIssue[]
): Promise<void> {
  for (const entry of exportEntries) {
    if (!(await exists(path.join(repoRoot, entry.target)))) {
      issues.push({
        code: "missing_export_target",
        message: `export ${entry.subpath ?? "unknown"} target ${entry.target} does not exist.`,
        path: entry.target,
        severity: "error",
      });
    }
  }

  for (const entry of binEntries) {
    if (!(await exists(path.join(repoRoot, entry.target)))) {
      issues.push({
        code: "missing_bin_target",
        message: `bin ${entry.name ?? "unknown"} target ${entry.target} does not exist.`,
        path: entry.target,
        severity: "error",
      });
    }
  }
}

async function validateRequiredDocs(
  repoRoot: string,
  filesAllowlist: string[],
  issues: PackageDryRunIssue[]
): Promise<void> {
  for (const docPath of REQUIRED_PACKAGE_DOCS) {
    if (!(await exists(path.join(repoRoot, docPath)))) {
      issues.push({
        code: "missing_package_file",
        message: `${docPath} is required for package dry-run documentation.`,
        path: docPath,
        severity: "error",
      });
      continue;
    }
    if (!isPackagePathCovered(filesAllowlist, docPath)) {
      issues.push({
        code: "uncovered_doc",
        message: `${docPath} is not covered by package.json files.`,
        path: docPath,
        severity: "error",
      });
    }
  }
}

function validateCoveredPackageBoundaries(
  boundaries: TrackPackageBoundary[],
  filesAllowlist: string[],
  issues: PackageDryRunIssue[]
): void {
  for (const boundary of boundaries) {
    for (const packagePath of [boundary.entrypoint, ...boundary.owns]) {
      if (!isPackagePathCovered(filesAllowlist, packagePath)) {
        issues.push({
          boundary: boundary.name,
          code: "uncovered_package_path",
          message: `${packagePath} owned by ${boundary.packageName} is not covered by package.json files.`,
          path: packagePath,
          severity: "error",
        });
      }
    }
  }
}

function normalizePackageTarget(target: string): string {
  return normalizePackagePath(target.replace(/^\.\//, ""));
}

function normalizePackagePath(targetPath: string): string {
  return path.posix.normalize(targetPath.replace(/\\/g, "/").replace(/^\.\//, ""));
}
