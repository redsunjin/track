import { spawn } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
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

export type PackagePublishMode = "private-root" | "publishable";
export type PackagePublishModeTarget = "current" | PackagePublishMode;

export interface PackagePublishConfigSummary {
  access: string | null;
  present: boolean;
  provenance: boolean | null;
  registry: string | null;
  tag: string | null;
}

export interface PackagePublishModeGuardIssue {
  code:
    | "invalid_publish_config"
    | "missing_private_field"
    | "missing_publish_config"
    | "package_readiness_failed"
    | "private_mode_mismatch"
    | "unsafe_publish_access";
  message: string;
  path?: string;
  severity: "error" | "warning";
}

export interface PackagePublishModeGuardCheck {
  detail: string;
  id: string;
  ok: boolean;
  title: string;
}

export interface PackagePublishModeGuardResult {
  checks: PackagePublishModeGuardCheck[];
  currentMode: PackagePublishMode;
  issues: PackagePublishModeGuardIssue[];
  ok: boolean;
  packageName: string | null;
  privatePackage: boolean;
  publishConfig: PackagePublishConfigSummary;
  readiness: PackageReadinessCheckResult;
  status: "private-held" | "publish-switch-ready" | "publishable-ready" | "switch-blocked";
  summary: string;
  targetMode: PackagePublishModeTarget;
  version: string | null;
}

export interface PackageReleaseCandidateTagDryRunOptions {
  allowPrivateRootArtifact?: boolean;
  candidateTag?: string;
  existingTags?: string[];
  rc?: number;
}

export interface PackageReleaseCandidateTagIssue {
  code:
    | "git_metadata_unavailable"
    | "invalid_candidate_tag"
    | "missing_package_version"
    | "package_readiness_failed"
    | "publish_guard_failed"
    | "tag_already_exists";
  message: string;
  severity: "error" | "warning";
}

export interface PackageReleaseCandidateTagCheck {
  detail: string;
  id: string;
  ok: boolean;
  title: string;
}

export interface PackageReleaseCandidateTagDryRunResult {
  allowPrivateRootArtifact: boolean;
  candidateTag: string | null;
  checks: PackageReleaseCandidateTagCheck[];
  commands: string[];
  existingTags: string[];
  issues: PackageReleaseCandidateTagIssue[];
  ok: boolean;
  packageName: string | null;
  publishGuard: PackagePublishModeGuardResult;
  rc: number | null;
  readiness: PackageReadinessCheckResult;
  status: "tag-dry-run-blocked" | "tag-dry-run-ready";
  summary: string;
  version: string | null;
}

export interface PackageReleaseNotesDraftResult {
  cliCommands: string[];
  importSubpaths: string[];
  installCommand: string | null;
  npxCommand: string | null;
  ok: boolean;
  packageName: string | null;
  publishGuard: PackagePublishModeGuardResult;
  readiness: PackageReadinessCheckResult;
  recentSlices: Array<{
    id: string;
    title: string;
  }>;
  releaseCandidate: PackageReleaseCandidateTagDryRunResult;
  status: "release-notes-blocked" | "release-notes-ready";
  summary: string;
  verificationCommands: string[];
  version: string | null;
}

export interface PackageCommandRunnerResult {
  error?: string;
  exitCode: number | null;
  stderr: string;
  stdout: string;
}

export type PackageCommandRunner = (
  repoRoot: string,
  command: string,
  args: string[]
) => Promise<PackageCommandRunnerResult>;

export interface PackageNpmPublishDryRunOptions extends PackageReleaseCandidateTagDryRunOptions {
  runInstallSmoke?: boolean;
  runner?: PackageCommandRunner;
}

export interface PackageNpmPublishDryRunCommandResult {
  command: string;
  exitCode: number | null;
  id: "npm-auth" | "npm-pack-dry-run" | "npm-publish-dry-run" | "install-smoke";
  ok: boolean;
  stderr: string;
  stdout: string;
  summary: string;
}

export interface PackageNpmPublishDryRunIssue {
  code:
    | "install_smoke_failed"
    | "manifest_autocorrected"
    | "npm_auth_failed"
    | "npm_pack_dry_run_failed"
    | "npm_publish_dry_run_failed"
    | "package_readiness_failed"
    | "publish_guard_failed"
    | "rc_tag_dry_run_failed"
    | "release_notes_failed";
  command?: string;
  message: string;
  severity: "error" | "warning";
}

export interface PackageNpmPublishDryRunResult {
  commandResults: PackageNpmPublishDryRunCommandResult[];
  finalPublishCommand: string | null;
  issues: PackageNpmPublishDryRunIssue[];
  ok: boolean;
  packageName: string | null;
  publishGuard: PackagePublishModeGuardResult;
  readiness: PackageReadinessCheckResult;
  releaseCandidate: PackageReleaseCandidateTagDryRunResult;
  releaseNotes: PackageReleaseNotesDraftResult;
  status: "publish-dry-run-blocked" | "publish-dry-run-ready";
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
    owns: [
      "src/state.ts",
      "src/roadmap.ts",
      "src/mutation.ts",
      "src/actions.ts",
      "src/external-plan.ts",
      "src/builder.ts",
      "src/bootstrap.ts",
      "src/init.ts",
      "src/init-templates.ts",
      "src/adapters",
      "src/pitwall.ts",
    ],
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
      "src/sound.ts",
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
const RELEASE_NOTES_VERIFICATION_COMMANDS = [
  "npm test",
  "npm run typecheck",
  "npm run check:harness",
  "npm run package:dry-run",
  "npm run package:readiness",
  "npm run package:publish-guard",
  "npm run package:rc-tag",
  "npm run package:install-smoke",
  "npm pack --dry-run --json",
] as const;
const RELEASE_NOTES_CLI_COMMANDS = [
  "track status",
  "track map --color",
  "track pitwall --openclaw",
  "track package readiness",
  "track package rc-tag",
] as const;
const MAX_COMMAND_OUTPUT_PREVIEW = 4000;
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

export async function checkTrackPublishModeGuard(
  repoRoot: string,
  options: { targetMode?: PackagePublishModeTarget } = {}
): Promise<PackagePublishModeGuardResult> {
  const targetMode = options.targetMode ?? "current";
  const readiness = await checkTrackPublishReadiness(repoRoot);
  const issues: PackagePublishModeGuardIssue[] = [];
  const manifestIssues: PackageDryRunIssue[] = [];
  const manifest = await readPackageManifest(repoRoot, manifestIssues);
  const privateValue = readBoolean(manifest, "private");
  const privatePackage = privateValue === true;
  const currentMode: PackagePublishMode = privatePackage ? "private-root" : "publishable";
  const publishConfig = readPublishConfigSummary(manifest, issues);
  const evaluatingPublishable = targetMode === "publishable" || (targetMode === "current" && currentMode === "publishable");
  const evaluatingPrivateRoot = targetMode === "private-root" || (targetMode === "current" && currentMode === "private-root");

  if (privateValue === null) {
    issues.push({
      code: "missing_private_field",
      message: "package.json must explicitly define private before release mode can be trusted.",
      path: "package.json",
      severity: "error",
    });
  }

  if (!readiness.ok) {
    issues.push({
      code: "package_readiness_failed",
      message: "Package readiness must pass before changing publish mode.",
      path: "package.json",
      severity: "error",
    });
  }

  if (evaluatingPrivateRoot && !privatePackage) {
    issues.push({
      code: "private_mode_mismatch",
      message: "Target private-root requires package.json private to be true.",
      path: "package.json",
      severity: "error",
    });
  }

  if (evaluatingPublishable && !publishConfig.present) {
    issues.push({
      code: "missing_publish_config",
      message: "Add an explicit package.json publishConfig before switching private to false.",
      path: "package.json",
      severity: "error",
    });
  }

  if (evaluatingPublishable && publishConfig.present && publishConfig.access !== "public") {
    issues.push({
      code: "unsafe_publish_access",
      message: `publishConfig.access must be public for a public Track release, got ${publishConfig.access ?? "missing"}.`,
      path: "package.json",
      severity: "error",
    });
  }

  for (const issue of manifestIssues) {
    issues.push({
      code: "invalid_publish_config",
      message: issue.message,
      path: issue.path,
      severity: issue.severity,
    });
  }

  const checks: PackagePublishModeGuardCheck[] = [
    {
      detail: privatePackage ? "package.json private is true" : "package.json private is false",
      id: "private-field",
      ok: privateValue !== null && (!evaluatingPrivateRoot || privatePackage),
      title: "Private field",
    },
    {
      detail: publishConfig.present ? describePublishConfig(publishConfig) : "missing; required only for publishable mode",
      id: "publish-config",
      ok: !evaluatingPublishable || publishConfig.present,
      title: "Publish config",
    },
    {
      detail: readiness.dryRun.ok ? "exports, files, bin, docs, and boundaries are covered" : "package dry-run has blocking issues",
      id: "package-shape",
      ok: readiness.dryRun.ok,
      title: "Package shape",
    },
    {
      detail: readiness.ok ? "all release readiness gates are green" : "release readiness has blocking gates",
      id: "readiness",
      ok: readiness.ok,
      title: "Readiness gate",
    },
  ];

  const status = summarizePublishModeGuardStatus({
    currentMode,
    issues,
    readiness,
    targetMode,
  });

  return {
    checks,
    currentMode,
    issues,
    ok: !issues.some((issue) => issue.severity === "error"),
    packageName: readiness.packageName,
    privatePackage,
    publishConfig,
    readiness,
    status: status.id,
    summary: status.summary,
    targetMode,
    version: readiness.version,
  };
}

export async function buildTrackReleaseCandidateTagDryRun(
  repoRoot: string,
  options: PackageReleaseCandidateTagDryRunOptions = {}
): Promise<PackageReleaseCandidateTagDryRunResult> {
  const readiness = await checkTrackPublishReadiness(repoRoot);
  const publishGuard = await checkTrackPublishModeGuard(repoRoot);
  const allowPrivateRootArtifact = options.allowPrivateRootArtifact === true;
  const publishGuardReady =
    publishGuard.status === "publishable-ready" || (allowPrivateRootArtifact && publishGuard.status === "private-held");
  const rc = options.rc ?? 0;
  const candidateTag = options.candidateTag ?? (readiness.version ? `v${readiness.version}-rc.${rc}` : null);
  const tagSource = options.existingTags ? { found: true, tags: options.existingTags } : await readLocalGitTags(repoRoot);
  const existingTags = [...new Set(tagSource.tags)].sort((left, right) => left.localeCompare(right));
  const issues: PackageReleaseCandidateTagIssue[] = [];

  if (!readiness.version) {
    issues.push({
      code: "missing_package_version",
      message: "package.json must define a version before an RC tag can be prepared.",
      severity: "error",
    });
  }

  if (!readiness.ok) {
    issues.push({
      code: "package_readiness_failed",
      message: "Package readiness must pass before preparing an RC tag.",
      severity: "error",
    });
  }

  if (!publishGuardReady) {
    issues.push({
      code: "publish_guard_failed",
      message: allowPrivateRootArtifact
        ? "Publish mode guard must be publishable-ready, or private-held only for explicit private-root artifact tags."
        : "RC tag dry-run requires publishable-ready; use --allow-private-root only for private-root artifact tags.",
      severity: "error",
    });
  }

  if (!tagSource.found) {
    issues.push({
      code: "git_metadata_unavailable",
      message: "No local .git metadata was found, so tag conflicts cannot be checked.",
      severity: "error",
    });
  }

  if (!Number.isInteger(rc) || rc < 0) {
    issues.push({
      code: "invalid_candidate_tag",
      message: "RC number must be a non-negative integer.",
      severity: "error",
    });
  }

  if (!candidateTag || !isReleaseCandidateTag(candidateTag)) {
    issues.push({
      code: "invalid_candidate_tag",
      message: `RC tag must match v<major>.<minor>.<patch>-rc.<n>, got ${candidateTag ?? "missing"}.`,
      severity: "error",
    });
  }

  if (candidateTag && existingTags.includes(candidateTag)) {
    issues.push({
      code: "tag_already_exists",
      message: `Local tag ${candidateTag} already exists.`,
      severity: "error",
    });
  }

  const commands = candidateTag
    ? [`git tag -a ${candidateTag} -m "${readiness.packageName ?? "track"} ${candidateTag}"`, `git push origin ${candidateTag}`]
    : [];
  const checks: PackageReleaseCandidateTagCheck[] = [
    {
      detail: readiness.ok ? "package readiness gates are green" : "package readiness has blocking gates",
      id: "readiness",
      ok: readiness.ok,
      title: "Readiness gate",
    },
    {
      detail: describeReleaseCandidatePublishGuard(publishGuard.status, publishGuardReady, allowPrivateRootArtifact),
      id: "publish-guard",
      ok: publishGuardReady,
      title: "Publish guard",
    },
    {
      detail: candidateTag ? candidateTag : "missing candidate tag",
      id: "tag-format",
      ok: Boolean(candidateTag && isReleaseCandidateTag(candidateTag) && Number.isInteger(rc) && rc >= 0),
      title: "Tag format",
    },
    {
      detail: tagSource.found
        ? candidateTag && existingTags.includes(candidateTag)
          ? `${candidateTag} already exists`
          : "candidate tag is not present locally"
        : "local git metadata missing",
      id: "tag-conflict",
      ok: tagSource.found && Boolean(candidateTag && !existingTags.includes(candidateTag)),
      title: "Tag conflict",
    },
  ];
  const ok = !issues.some((issue) => issue.severity === "error");

  return {
    allowPrivateRootArtifact,
    candidateTag,
    checks,
    commands,
    existingTags,
    issues,
    ok,
    packageName: readiness.packageName,
    publishGuard,
    rc: Number.isInteger(rc) && rc >= 0 ? rc : null,
    readiness,
    status: ok ? "tag-dry-run-ready" : "tag-dry-run-blocked",
    summary: ok
      ? publishGuard.status === "private-held"
        ? "Private-root artifact RC tag command is ready to run manually; no tag was created."
        : "Release candidate tag command is ready to run manually; no tag was created."
      : "Release candidate tag dry-run is blocked until package and tag issues are resolved.",
    version: readiness.version,
  };
}

export async function buildTrackReleaseNotesDraft(
  repoRoot: string,
  options: PackageReleaseCandidateTagDryRunOptions = {}
): Promise<PackageReleaseNotesDraftResult> {
  const readiness = await checkTrackPublishReadiness(repoRoot);
  const publishGuard = await checkTrackPublishModeGuard(repoRoot);
  const releaseCandidate = await buildTrackReleaseCandidateTagDryRun(repoRoot, options);
  const packageName = readiness.packageName;
  const version = readiness.version;
  const importSubpaths = [
    ...new Set(readiness.dryRun.exportEntries.map((entry) => entry.subpath ?? ".").filter((value) => value.length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  const ok = readiness.ok && publishGuard.status === "publishable-ready" && releaseCandidate.ok;

  return {
    cliCommands: [...RELEASE_NOTES_CLI_COMMANDS],
    importSubpaths,
    installCommand: packageName ? `npm install ${packageName}` : null,
    npxCommand: packageName ? `npx ${packageName} status` : null,
    ok,
    packageName,
    publishGuard,
    readiness,
    recentSlices: await readRecentReleaseSlices(repoRoot),
    releaseCandidate,
    status: ok ? "release-notes-ready" : "release-notes-blocked",
    summary: ok
      ? "Release notes draft is ready from package readiness, publish guard, RC tag dry-run, and recent release slices."
      : "Release notes draft is blocked until package readiness, publish guard, and RC tag dry-run are green.",
    verificationCommands: [...RELEASE_NOTES_VERIFICATION_COMMANDS],
    version,
  };
}

export async function buildTrackNpmPublishDryRun(
  repoRoot: string,
  options: PackageNpmPublishDryRunOptions = {}
): Promise<PackageNpmPublishDryRunResult> {
  const readiness = await checkTrackPublishReadiness(repoRoot);
  const publishGuard = await checkTrackPublishModeGuard(repoRoot);
  const releaseCandidate = await buildTrackReleaseCandidateTagDryRun(repoRoot, options);
  const releaseNotes = await buildTrackReleaseNotesDraft(repoRoot, options);
  const runner = options.runner ?? runPackageCommand;
  const commandSpecs: Array<{
    args: string[];
    command: string;
    id: PackageNpmPublishDryRunCommandResult["id"];
  }> = [
    { id: "npm-auth", command: "npm", args: ["whoami"] },
    { id: "npm-pack-dry-run", command: "npm", args: ["pack", "--dry-run", "--json"] },
    { id: "npm-publish-dry-run", command: "npm", args: ["publish", "--dry-run", "--access", "public"] },
  ];

  if (options.runInstallSmoke !== false) {
    commandSpecs.push({ id: "install-smoke", command: "npm", args: ["run", "package:install-smoke"] });
  }

  const commandResults: PackageNpmPublishDryRunCommandResult[] = [];
  for (const spec of commandSpecs) {
    const result = await runner(repoRoot, spec.command, spec.args);
    commandResults.push({
      command: formatCommand(spec.command, spec.args),
      exitCode: result.exitCode,
      id: spec.id,
      ok: result.exitCode === 0,
      stderr: trimCommandOutput(result.stderr),
      stdout: trimCommandOutput(result.stdout),
      summary: summarizeNpmDryRunCommand(spec.id, result),
    });
  }

  const issues: PackageNpmPublishDryRunIssue[] = [];
  if (!readiness.ok) {
    issues.push({
      code: "package_readiness_failed",
      message: "Package readiness must pass before public npm publish dry-run can be treated as ready.",
      severity: "error",
    });
  }
  if (publishGuard.status !== "publishable-ready") {
    issues.push({
      code: "publish_guard_failed",
      message: `Publish guard must be publishable-ready, got ${publishGuard.status}.`,
      severity: "error",
    });
  }
  if (!releaseCandidate.ok) {
    issues.push({
      code: "rc_tag_dry_run_failed",
      message: "RC tag dry-run must be ready before public npm publish execution is considered safe.",
      severity: "error",
    });
  }
  if (!releaseNotes.ok) {
    issues.push({
      code: "release_notes_failed",
      message: "Release notes draft must be ready before public npm publish execution is considered safe.",
      severity: "error",
    });
  }

  for (const commandResult of commandResults) {
    if (!commandResult.ok) {
      issues.push({
        code: commandIssueCode(commandResult.id),
        command: commandResult.command,
        message: commandResult.summary,
        severity: "error",
      });
    }

    if (
      commandResult.id === "npm-publish-dry-run" &&
      /auto-corrected|bin\[track\]/i.test(`${commandResult.stderr}\n${commandResult.stdout}`)
    ) {
      issues.push({
        code: "manifest_autocorrected",
        command: commandResult.command,
        message: "npm publish dry-run reported manifest auto-correction; package.json should be normalized before release.",
        severity: "error",
      });
    }
  }

  const ok = !issues.some((issue) => issue.severity === "error");
  const finalPublishCommand = readiness.packageName ? "npm publish --access public" : null;

  return {
    commandResults,
    finalPublishCommand,
    issues,
    ok,
    packageName: readiness.packageName,
    publishGuard,
    readiness,
    releaseCandidate,
    releaseNotes,
    status: ok ? "publish-dry-run-ready" : "publish-dry-run-blocked",
    summary: ok
      ? "Public npm publish dry-run lane is ready; final publish still requires release-owner confirmation."
      : "Public npm publish dry-run lane is blocked until the reported preflight issues are resolved.",
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

function describeReleaseCandidatePublishGuard(
  status: PackagePublishModeGuardResult["status"],
  ready: boolean,
  allowPrivateRootArtifact: boolean
): string {
  if (ready && status === "private-held") {
    return "private-root artifact override accepted; publish mode guard is private-held";
  }
  if (ready) {
    return `publish mode guard is ${status}`;
  }
  if (allowPrivateRootArtifact) {
    return `publish mode guard is ${status}; expected publishable-ready or explicit private-held artifact mode`;
  }
  return `publish mode guard is ${status}; expected publishable-ready`;
}

async function readRecentReleaseSlices(repoRoot: string): Promise<Array<{ id: string; title: string }>> {
  try {
    const todo = await readFile(path.join(repoRoot, "TODO.md"), "utf8");
    return [...todo.matchAll(/^### (TRK-\d+)\s+(.+)$/gm)]
      .map((match) => ({ id: match[1], title: match[2].trim() }))
      .filter((slice) => /^TRK-0(5[3-9]|6\d)$/.test(slice.id))
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function renderPackageReleaseCandidateTagDryRun(result: PackageReleaseCandidateTagDryRunResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const readyChecks = result.checks.filter((check) => check.ok).length;
  const lines = [
    result.ok ? "PACKAGE RC TAG DRY-RUN" : "PACKAGE RC TAG DRY-RUN BLOCKED",
    `PACKAGE  ${packageLabel}`,
    `STATUS   ${result.status}`,
    `TAG      ${result.candidateTag ?? "missing"}`,
    `SUMMARY  ${result.summary}`,
    `CHECKS   ${readyChecks}/${result.checks.length} ready`,
    "",
    "Checks:",
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.id.padEnd(16)} ${check.ok ? "ready" : "blocked"}`);
    lines.push(`  ${check.detail}`);
  }

  if (result.commands.length) {
    lines.push("");
    lines.push("Dry-run commands:");
    for (const command of result.commands) {
      lines.push(`- ${command}`);
    }
  }

  if (result.issues.length) {
    lines.push("");
    lines.push("RC tag issues:");
    for (const issue of result.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

export function renderPackageReleaseNotesDraft(result: PackageReleaseNotesDraftResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const lines = [
    `# ${packageLabel} Release Notes Draft`,
    "",
    `Status: ${result.status}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Install",
    "",
    "```bash",
    result.installCommand ?? "npm install <package>",
    result.npxCommand ?? "npx <package> status",
    "track status",
    "```",
    "",
    "## CLI Quick Start",
    "",
  ];

  for (const command of result.cliCommands) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Public Imports");
  lines.push("");
  for (const subpath of result.importSubpaths) {
    const packagePath = subpath === "." ? result.packageName ?? "unknown" : `${result.packageName ?? "unknown"}${subpath.slice(1)}`;
    lines.push(`- \`${packagePath}\``);
  }

  lines.push("");
  lines.push("## Recent Release Slices");
  lines.push("");
  for (const slice of result.recentSlices) {
    lines.push(`- ${slice.id} ${slice.title}`);
  }

  lines.push("");
  lines.push("## Verification");
  lines.push("");
  for (const command of result.verificationCommands) {
    lines.push(`- \`${command}\``);
  }

  lines.push("");
  lines.push("## Release Candidate");
  lines.push("");
  lines.push(`- status: \`${result.releaseCandidate.status}\``);
  lines.push(`- tag: \`${result.releaseCandidate.candidateTag ?? "missing"}\``);
  lines.push(`- publish guard: \`${result.publishGuard.status}\``);
  for (const command of result.releaseCandidate.commands) {
    lines.push(`- dry-run command: \`${command}\``);
  }

  lines.push("");
  lines.push("## Publish Note");
  lines.push("");
  lines.push("This draft does not publish to npm, create a git tag, or push a tag.");
  lines.push("Final publish still requires release-owner npm authentication and explicit confirmation.");

  return lines.join("\n");
}

export function renderPackageNpmPublishDryRun(result: PackageNpmPublishDryRunResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const readyCommands = result.commandResults.filter((command) => command.ok).length;
  const lines = [
    result.ok ? "PACKAGE NPM PUBLISH DRY-RUN READY" : "PACKAGE NPM PUBLISH DRY-RUN BLOCKED",
    `PACKAGE  ${packageLabel}`,
    `STATUS   ${result.status}`,
    `SUMMARY  ${result.summary}`,
    `COMMANDS ${readyCommands}/${result.commandResults.length} ready`,
    `FINAL    ${result.finalPublishCommand ?? "missing"}`,
    "",
    "Preflight Commands:",
  ];

  for (const command of result.commandResults) {
    lines.push(`- ${command.id.padEnd(20)} ${command.ok ? "ready" : "blocked"} ${command.command}`);
    lines.push(`  ${command.summary}`);
  }

  lines.push("");
  lines.push("Release Gates:");
  lines.push(`- readiness           ${result.readiness.ok ? "ready" : "blocked"}`);
  lines.push(`- publish guard       ${result.publishGuard.status}`);
  lines.push(`- rc tag dry-run      ${result.releaseCandidate.status}`);
  lines.push(`- release notes       ${result.releaseNotes.status}`);

  if (result.finalPublishCommand) {
    lines.push("");
    lines.push("Final publish command:");
    lines.push(`- ${result.finalPublishCommand}`);
  }

  if (result.issues.length) {
    lines.push("");
    lines.push("Publish dry-run issues:");
    for (const issue of result.issues) {
      const command = issue.command ? ` ${issue.command}` : "";
      lines.push(`- [${issue.severity}] ${issue.code}:${command} ${issue.message}`);
    }
  }

  lines.push("");
  lines.push("No package was published by this command.");

  return lines.join("\n");
}

export function renderPackagePublishModeGuard(result: PackagePublishModeGuardResult): string {
  const packageLabel =
    result.packageName && result.version ? `${result.packageName}@${result.version}` : result.packageName ?? "unknown";
  const readyChecks = result.checks.filter((check) => check.ok).length;
  const lines = [
    result.ok ? "PACKAGE PUBLISH MODE GUARD" : "PACKAGE PUBLISH MODE GUARD BLOCKED",
    `PACKAGE  ${packageLabel}`,
    `STATUS   ${result.status}`,
    `CURRENT  ${result.currentMode}`,
    `TARGET   ${result.targetMode}`,
    `SUMMARY  ${result.summary}`,
    `CHECKS   ${readyChecks}/${result.checks.length} ready`,
    "",
    "Checks:",
  ];

  for (const check of result.checks) {
    lines.push(`- ${check.id.padEnd(16)} ${check.ok ? "ready" : "blocked"}`);
    lines.push(`  ${check.detail}`);
  }

  if (result.issues.length) {
    lines.push("");
    lines.push("Publish mode issues:");
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

async function runPackageCommand(
  repoRoot: string,
  command: string,
  args: string[]
): Promise<PackageCommandRunnerResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    let stdout = "";
    let stderr = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout = appendCommandOutput(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr = appendCommandOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        error: error.message,
        exitCode: null,
        stderr,
        stdout,
      });
    });
    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        exitCode,
        stderr,
        stdout,
      });
    });
  });
}

function appendCommandOutput(current: string, chunk: string): string {
  if (current.length >= MAX_COMMAND_OUTPUT_PREVIEW) {
    return current;
  }
  return `${current}${chunk}`.slice(0, MAX_COMMAND_OUTPUT_PREVIEW);
}

function trimCommandOutput(output: string): string {
  return output.length > MAX_COMMAND_OUTPUT_PREVIEW ? `${output.slice(0, MAX_COMMAND_OUTPUT_PREVIEW)}...` : output;
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

function summarizeNpmDryRunCommand(
  id: PackageNpmPublishDryRunCommandResult["id"],
  result: PackageCommandRunnerResult
): string {
  if (result.exitCode === 0) {
    if (id === "npm-auth") {
      return `authenticated as ${firstOutputLine(result.stdout) ?? "unknown npm user"}`;
    }
    if (id === "npm-pack-dry-run") {
      return "npm pack dry-run completed";
    }
    if (id === "npm-publish-dry-run") {
      return "npm publish dry-run completed without publishing";
    }
    return "package install smoke completed";
  }

  return (
    firstOutputLine(result.stderr) ??
    firstOutputLine(result.stdout) ??
    result.error ??
    `command exited with ${result.exitCode === null ? "no exit code" : `code ${result.exitCode}`}`
  );
}

function firstOutputLine(output: string): string | null {
  const line = output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return line ?? null;
}

function commandIssueCode(id: PackageNpmPublishDryRunCommandResult["id"]): PackageNpmPublishDryRunIssue["code"] {
  if (id === "npm-auth") {
    return "npm_auth_failed";
  }
  if (id === "npm-pack-dry-run") {
    return "npm_pack_dry_run_failed";
  }
  if (id === "npm-publish-dry-run") {
    return "npm_publish_dry_run_failed";
  }
  return "install_smoke_failed";
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

function summarizePublishModeGuardStatus(input: {
  currentMode: PackagePublishMode;
  issues: PackagePublishModeGuardIssue[];
  readiness: PackageReadinessCheckResult;
  targetMode: PackagePublishModeTarget;
}): {
  id: PackagePublishModeGuardResult["status"];
  summary: string;
} {
  if (input.issues.some((issue) => issue.severity === "error")) {
    return {
      id: "switch-blocked",
      summary: "Publish mode switch is blocked until manifest and readiness issues are resolved.",
    };
  }

  if (input.currentMode === "publishable") {
    return {
      id: "publishable-ready",
      summary: "Package is publishable and release readiness gates are green.",
    };
  }

  if (input.targetMode === "publishable" && input.readiness.ok) {
    return {
      id: "publish-switch-ready",
      summary: "Ready to switch package.json private to false after release-owner review.",
    };
  }

  return {
    id: "private-held",
    summary: "Package remains private; npm publish is still blocked by package.json.",
  };
}

function readPublishConfigSummary(
  source: Record<string, unknown>,
  issues: PackagePublishModeGuardIssue[]
): PackagePublishConfigSummary {
  const value = source.publishConfig;
  if (value === undefined) {
    return {
      access: null,
      present: false,
      provenance: null,
      registry: null,
      tag: null,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({
      code: "invalid_publish_config",
      message: "package.json publishConfig must be an object when present.",
      path: "package.json",
      severity: "error",
    });
    return {
      access: null,
      present: true,
      provenance: null,
      registry: null,
      tag: null,
    };
  }

  const publishConfig = value as Record<string, unknown>;
  return {
    access: typeof publishConfig.access === "string" && publishConfig.access.length > 0 ? publishConfig.access : null,
    present: true,
    provenance: typeof publishConfig.provenance === "boolean" ? publishConfig.provenance : null,
    registry: typeof publishConfig.registry === "string" && publishConfig.registry.length > 0 ? publishConfig.registry : null,
    tag: typeof publishConfig.tag === "string" && publishConfig.tag.length > 0 ? publishConfig.tag : null,
  };
}

function describePublishConfig(publishConfig: PackagePublishConfigSummary): string {
  const fields = [
    publishConfig.access ? `access=${publishConfig.access}` : null,
    publishConfig.registry ? `registry=${publishConfig.registry}` : null,
    publishConfig.tag ? `tag=${publishConfig.tag}` : null,
    publishConfig.provenance === null ? null : `provenance=${String(publishConfig.provenance)}`,
  ].filter((value): value is string => Boolean(value));

  return fields.length ? fields.join(", ") : "present with no tracked fields";
}

function isReleaseCandidateTag(candidateTag: string): boolean {
  return /^v\d+\.\d+\.\d+-rc\.\d+$/.test(candidateTag);
}

async function readLocalGitTags(repoRoot: string): Promise<{ found: boolean; tags: string[] }> {
  const gitDir = await resolveGitDir(repoRoot);
  if (!gitDir) {
    return { found: false, tags: [] };
  }

  const [looseTags, packedTags] = await Promise.all([readLooseGitTags(path.join(gitDir, "refs", "tags")), readPackedGitTags(gitDir)]);
  return {
    found: true,
    tags: [...new Set([...looseTags, ...packedTags])].sort((left, right) => left.localeCompare(right)),
  };
}

async function resolveGitDir(repoRoot: string): Promise<string | null> {
  const dotGitPath = path.join(repoRoot, ".git");
  try {
    const dotGitStat = await stat(dotGitPath);
    if (dotGitStat.isDirectory()) {
      return dotGitPath;
    }
    if (!dotGitStat.isFile()) {
      return null;
    }
    const contents = await readFile(dotGitPath, "utf8");
    const match = contents.match(/^gitdir:\s*(.+)\s*$/m);
    if (!match) {
      return null;
    }
    return path.resolve(repoRoot, match[1]);
  } catch {
    return null;
  }
}

async function readLooseGitTags(tagsDir: string): Promise<string[]> {
  try {
    const entries = await readdir(tagsDir, { withFileTypes: true });
    const tags = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(tagsDir, entry.name);
        if (entry.isDirectory()) {
          return (await readLooseGitTags(entryPath)).map((tag) => `${entry.name}/${tag}`);
        }
        if (entry.isFile()) {
          return [entry.name];
        }
        return [];
      })
    );
    return tags.flat();
  } catch {
    return [];
  }
}

async function readPackedGitTags(gitDir: string): Promise<string[]> {
  try {
    const contents = await readFile(path.join(gitDir, "packed-refs"), "utf8");
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("^"))
      .map((line) => line.split(" ")[1])
      .filter((ref): ref is string => typeof ref === "string" && ref.startsWith("refs/tags/"))
      .map((ref) => ref.replace(/^refs\/tags\//, ""));
  } catch {
    return [];
  }
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
