import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = path.resolve(".");

const SHARED_FILES = [
  "agents/shared/README.md",
  "agents/shared/bin/track-context.sh",
  "agents/shared/bin/track-update.sh",
];

const PACK_FILES = {
  "claude-code": [
    "agents/claude-code/README.md",
    "agents/claude-code/CLAUDE_PROMPT.md",
    "agents/claude-code/COMMAND_PATTERNS.md",
  ],
  codex: [
    "agents/codex/README.md",
    "agents/codex/OPERATING_GUIDE.md",
    "agents/codex/COMMANDS_AND_MCP.md",
  ],
  "gemini-cli": [
    "agents/gemini-cli/README.md",
    "agents/gemini-cli/OPERATING_GUIDE.md",
    "agents/gemini-cli/COMMANDS_AND_MCP.md",
  ],
} as const;

test("shared agent helper files exist and expose the common Track contract", async () => {
  const contents = await Promise.all(
    SHARED_FILES.map(async (relativePath) => ({
      relativePath,
      content: await readFile(path.join(REPO_ROOT, relativePath), "utf8"),
    }))
  );

  assert.match(contents[0]?.content ?? "", /shared/i);
  assert.match(contents[1]?.content ?? "", /npm run status/);
  assert.match(contents[2]?.content ?? "", /node --import tsx \.\/src\/cli\.ts start/);
  assert.match(contents[2]?.content ?? "", /checkpoint advance/);
});

for (const [packName, relativePaths] of Object.entries(PACK_FILES)) {
  test(`${packName} pack stays thin over the shared Track contract`, async () => {
    const contents = await Promise.all(
      relativePaths.map(async (relativePath) => ({
        relativePath,
        content: await readFile(path.join(REPO_ROOT, relativePath), "utf8"),
      }))
    );

    for (const entry of contents) {
      assert.match(entry.content, /shared/i, `${entry.relativePath} should mention the shared contract`);
    }

    assert.ok(
      contents.some((entry) => entry.content.includes("track-context.sh")),
      `${packName} pack should reference the shared context helper`
    );
    assert.ok(
      contents.some((entry) => entry.content.includes("track-update.sh")),
      `${packName} pack should reference the shared update helper`
    );
    assert.ok(
      contents.some((entry) => entry.content.match(/\.track/i)),
      `${packName} pack should mention local Track state in at least one file`
    );
  });
}
