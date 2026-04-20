import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  exportAgentPack,
  listAgentPackFiles,
  listAgentPackKinds,
  loadAgentPackManifest,
  normalizeAgentPackKind,
} from "../src/agent-packs.js";

const REPO_ROOT = path.resolve(".");

test("agent pack registry exposes the supported tool kinds", () => {
  assert.deepEqual(listAgentPackKinds(), ["claude-code", "codex", "gemini-cli"]);
  assert.equal(normalizeAgentPackKind("claude"), "claude-code");
  assert.equal(normalizeAgentPackKind("gemini"), "gemini-cli");
  assert.equal(normalizeAgentPackKind("codex"), "codex");
  assert.equal(normalizeAgentPackKind("unknown"), undefined);
});

for (const kind of listAgentPackKinds()) {
  test(`exportAgentPack writes a reusable ${kind} bundle`, async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), `track-pack-${kind}-`));
    const result = await exportAgentPack({
      repoRoot: REPO_ROOT,
      kind,
      outDir,
    });

    const manifest = (await loadAgentPackManifest(path.join(outDir, "manifest.json"))) as {
      tool: string;
      files: string[];
    };
    const exportedFiles = await listAgentPackFiles(outDir);
    const readme = await readFile(path.join(outDir, "README.md"), "utf8");
    const helperStat = await stat(path.join(outDir, "shared", "bin", "track-context.sh"));

    assert.equal(result.kind, kind);
    assert.equal(manifest.tool, kind);
    assert.ok(readme.includes("Track Agent Pack Export"));
    assert.ok(exportedFiles.includes("manifest.json"));
    assert.ok(exportedFiles.includes("README.md"));
    assert.ok(exportedFiles.includes(path.join("shared", "bin", "track-context.sh")));
    assert.ok(exportedFiles.includes(path.join("shared", "bin", "track-update.sh")));
    assert.ok(exportedFiles.some((file) => file.startsWith(`${kind}${path.sep}`)));
    assert.ok(manifest.files.includes(`${kind}/README.md`));
    assert.ok((helperStat.mode & 0o111) !== 0);
  });
}
