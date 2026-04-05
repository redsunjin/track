import { realpath } from "node:fs/promises";
import path from "node:path";

import { stripAnsi } from "./ansi.js";

const CONTROL_CHARS_PATTERN = /[\u0000-\u001f\u007f-\u009f]/g;

export async function resolveTrackFilePath(
  repoRoot: string,
  explicitFile: string,
  label: string
): Promise<string> {
  const repoRootPath = path.resolve(repoRoot);
  const trackRoot = path.join(repoRootPath, ".track");
  const candidate = path.isAbsolute(explicitFile)
    ? explicitFile
    : explicitFile === ".track" || explicitFile.startsWith(".track/") || explicitFile.startsWith(`.track${path.sep}`)
      ? path.resolve(repoRootPath, explicitFile)
      : path.resolve(trackRoot, explicitFile);

  return ensurePathWithinRoot(trackRoot, candidate, label);
}

export async function resolveWorkspacePath(
  workspaceRoot: string,
  explicitPath: string | undefined,
  label: string
): Promise<string> {
  const rootPath = path.resolve(workspaceRoot);
  const candidate = explicitPath ? path.resolve(rootPath, explicitPath) : rootPath;
  return ensurePathWithinRoot(rootPath, candidate, label);
}

export async function ensurePathWithinRoot(
  rootPath: string,
  candidatePath: string,
  label: string
): Promise<string> {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  const [realRoot, realCandidate] = await Promise.all([
    resolveRealPathLoose(resolvedRoot),
    resolveRealPathLoose(resolvedCandidate),
  ]);
  const relative = path.relative(realRoot, realCandidate);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolvedCandidate;
  }

  throw new Error(`${label} must stay inside ${resolvedRoot}.`);
}

export function sanitizeInlineText(value: string | null | undefined, fallback = ""): string {
  if (value == null) {
    return fallback;
  }

  const normalized = stripAnsi(String(value))
    .replace(/\r\n?/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(CONTROL_CHARS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || fallback;
}

async function resolveRealPathLoose(targetPath: string): Promise<string> {
  try {
    return await realpath(targetPath);
  } catch {
    const parent = path.dirname(targetPath);
    if (parent === targetPath) {
      return targetPath;
    }

    const realParent = await resolveRealPathLoose(parent);
    return path.join(realParent, path.basename(targetPath));
  }
}
