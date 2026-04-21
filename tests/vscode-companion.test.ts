import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

type CompanionSnapshot = {
  currentOwner: string;
  percentComplete: number;
  projectName: string;
  recentEvents: Array<{ summary: string; timestamp?: string }>;
};

const { coerceCompanionSnapshot, renderCompanionDocument } = require("../vscode-extension/src/companion-view.ts") as {
  coerceCompanionSnapshot: (value: unknown) => CompanionSnapshot;
  renderCompanionDocument: (
    snapshot: CompanionSnapshot,
    options?: {
      generatedAt?: string;
      repoRoot?: string;
      statePath?: string;
      errorMessage?: string;
    }
  ) => string;
};

test("coerceCompanionSnapshot normalizes summary data for the VS Code panel", () => {
  const snapshot = coerceCompanionSnapshot({
    activeCheckpointTitle: "VS Code companion scaffold",
    activeLapLabel: "VS Code companion (4/4)",
    blockedReason: null,
    currentOwner: "codex",
    health: "green",
    nextAction: "Scaffold VS Code companion",
    percentComplete: 93,
    projectName: "Track",
    recentEvents: [
      {
        summary: "Started Scaffold VS Code companion",
        timestamp: "2026-04-05T06:44:58.659Z",
      },
    ],
    title: "Track plugin MVP",
  });

  assert.equal(snapshot.projectName, "Track");
  assert.equal(snapshot.percentComplete, 93);
  assert.equal(snapshot.currentOwner, "codex");
  assert.equal(snapshot.recentEvents[0]?.summary, "Started Scaffold VS Code companion");
});

test("renderCompanionDocument escapes HTML and prints the summary shell", () => {
  const html = renderCompanionDocument(
    coerceCompanionSnapshot({
      activeCheckpointTitle: "<script>alert(1)</script>",
      activeLapLabel: "Lap 4",
      blockedReason: null,
      currentOwner: "codex",
      health: "yellow",
      nextAction: "Wire <panel>",
      percentComplete: 78,
      projectName: "Track <Companion>",
      recentEvents: [
        {
          summary: "Started <panel>",
          timestamp: "2026-04-05T06:44:58.659Z",
        },
      ],
      title: "Track plugin MVP",
    }),
    {
      generatedAt: "2026-04-06T00:00:00.000Z",
      repoRoot: "/workspace/track",
      statePath: "/workspace/track/.track/state.yaml",
    }
  );

  assert.match(html, /Track Companion/);
  assert.match(html, /Track plugin MVP/);
  assert.match(html, /Track &lt;Companion&gt;/);
  assert.match(html, /Wire &lt;panel&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
