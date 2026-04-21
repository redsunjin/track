import { access } from "node:fs/promises";
import path from "node:path";

export interface TrackPackageBoundary {
  description: string;
  entrypoint: string;
  name: string;
  packageName: string;
  owns: string[];
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

export const TRACK_PACKAGE_BOUNDARIES: TrackPackageBoundary[] = [
  {
    name: "core",
    packageName: "track-core",
    description: "Canonical types, summary projection, control snapshot, and track-map generation.",
    entrypoint: "src/packages/core.ts",
    owns: ["src/types.ts", "src/summary.ts", "src/control.ts", "src/generator.ts", "src/security.ts"],
  },
  {
    name: "runtime",
    packageName: "track-runtime",
    description: "File-backed state loading, mutation, import adapters, and Pitwall runtime helpers.",
    entrypoint: "src/packages/runtime.ts",
    owns: ["src/state.ts", "src/roadmap.ts", "src/mutation.ts", "src/actions.ts", "src/external-plan.ts", "src/adapters", "src/pitwall.ts"],
  },
  {
    name: "mcp",
    packageName: "track-mcp",
    description: "MCP server, read/write tool declarations, stdio transport, and MCP contract docs.",
    entrypoint: "src/packages/mcp.ts",
    owns: ["src/mcp.ts", "docs/MCP_CONTRACT.md"],
  },
  {
    name: "cli",
    packageName: "track-cli",
    description: "Terminal commands, renderers, aliases, watch loop, and race telemetry text surfaces.",
    entrypoint: "src/packages/cli.ts",
    owns: ["src/cli.ts", "src/render.ts", "src/buddy.ts", "src/aliases.ts", "src/watch.ts", "src/ansi.ts"],
  },
  {
    name: "agents",
    packageName: "track-agents",
    description: "Claude Code, Codex, Gemini CLI operating packs plus export/install helpers.",
    entrypoint: "src/packages/agents.ts",
    owns: ["src/agent-packs.ts", "agents", "docs/agent-operating-packs.md"],
  },
  {
    name: "vscode",
    packageName: "track-vscode",
    description: "VS Code companion extension, webview shell, course tree, and status-bar telemetry.",
    entrypoint: "vscode-extension/src/extension.ts",
    owns: ["vscode-extension/package.json", "vscode-extension/src", "vscode-extension/README.md"],
  },
];

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

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
