import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkHarnessConsistency, renderHarnessCheck } from "../src/harness.js";

test("checkHarnessConsistency passes when control-plane files align", async () => {
  const root = await createHarnessFixture({
    todoActive: "- `TRK-033` Harness Guardrails",
    planId: "TRK-033",
    planTitle: "Harness Guardrails",
    worksheetOfficialActiveLoop: "yes",
  });

  const result = await checkHarnessConsistency(root);

  assert.equal(result.ok, true);
  assert.equal(result.runtimeStatus, "ok");
  assert.deepEqual(result.activeSlice, { id: "TRK-033", title: "Harness Guardrails" });
  assert.deepEqual(result.nextSessionPlan, { id: "TRK-033", title: "Harness Guardrails" });
  assert.equal(result.worksheet?.path, path.join("docs", "worksheets", "HW-006-harness-guardrails.md"));
  assert.match(renderHarnessCheck(result), /HARNESS OK/);
});

test("checkHarnessConsistency fails when the plan and worksheet drift from TODO", async () => {
  const root = await createHarnessFixture({
    todoActive: "- `TRK-033` Harness Guardrails",
    planId: "TRK-099",
    planTitle: "Different Slice",
    worksheetOfficialActiveLoop: "no",
  });

  const result = await checkHarnessConsistency(root);

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /does not match TODO active id/);
  assert.match(result.issues.join("\n"), /does not match TODO active title/);
  assert.match(result.issues.join("\n"), /official_active_loop: yes/);
  assert.match(renderHarnessCheck(result), /HARNESS FAIL/);
});

test("checkHarnessConsistency fails when roadmap and state drift semantically", async () => {
  const root = await createHarnessFixture({
    todoActive: "- `TRK-033` Harness Guardrails",
    planId: "TRK-033",
    planTitle: "Harness Guardrails",
    worksheetOfficialActiveLoop: "yes",
    stateTotalLaps: 2,
    stateActiveLap: 3,
    stateLapTitle: "Drifted lap title",
    stateCheckpointTitle: "Different checkpoint title",
    stateTaskCheckpointId: "cp-missing",
  });

  const result = await checkHarnessConsistency(root);
  const issueText = result.issues.join("\n");

  assert.equal(result.ok, false);
  assert.equal(result.runtimeStatus, "error");
  assert.match(issueText, /track\.total_laps 2 does not match state lap count 1/);
  assert.match(issueText, /track\.active_lap 3 is outside the defined lap range 1-1/);
  assert.match(issueText, /Roadmap phase 1 title `Harness guardrails` does not match state lap 1 title `Drifted lap title`/);
  assert.match(issueText, /Roadmap phase 1 checkpoint 1 title `Harness consistency check` does not match state lap 1 checkpoint 1 title `Different checkpoint title`/);
  assert.match(issueText, /State task `task-001` references unknown checkpoint `cp-missing`/);
  assert.match(renderHarnessCheck(result), /RUNTIME   roadmap\/state validation failed/);
});

interface HarnessFixtureOptions {
  todoActive: string;
  planId: string;
  planTitle: string;
  worksheetOfficialActiveLoop: "yes" | "no";
  stateTotalLaps?: number;
  stateActiveLap?: number;
  stateLapTitle?: string;
  stateCheckpointTitle?: string;
  stateTaskCheckpointId?: string;
}

async function createHarnessFixture(options: HarnessFixtureOptions): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "track-harness-"));
  await mkdir(path.join(root, ".track"), { recursive: true });
  await mkdir(path.join(root, "docs", "worksheets"), { recursive: true });
  const stateTotalLaps = options.stateTotalLaps ?? 1;
  const stateActiveLap = options.stateActiveLap ?? 1;
  const stateLapTitle = options.stateLapTitle ?? "Harness guardrails";
  const stateCheckpointTitle = options.stateCheckpointTitle ?? "Harness consistency check";
  const stateTaskCheckpointId = options.stateTaskCheckpointId ?? "cp-1";

  await writeFile(
    path.join(root, "TODO.md"),
    `# TODO

## Active

${options.todoActive}

## Queued

## Parked

## Done
`,
    "utf8"
  );

  await writeFile(
    path.join(root, "NEXT_SESSION_PLAN.md"),
    `# Next Session Plan

## Active Slice

- id: \`${options.planId}\`
- title: \`${options.planTitle}\`
`,
    "utf8"
  );

  await writeFile(
    path.join(root, "docs", "worksheets", "HW-006-harness-guardrails.md"),
    `# Harness Worksheet

## 1. Work Identity

- slice_id: \`TRK-033\`
- title: \`Harness Guardrails\`
- branch_scope: current repo mainline slice
- official_active_loop: ${options.worksheetOfficialActiveLoop}
- user_visible_change: Track can self-check harness drift
`,
    "utf8"
  );

  await writeFile(
    path.join(root, ".track", "roadmap.yaml"),
    `version: 1
project:
  id: track
  name: Track
  mode: sprint
roadmap:
  phases:
    - id: phase-1
      title: Harness guardrails
      checkpoints:
        - id: cp-1
          title: Harness consistency check
`,
    "utf8"
  );

  await writeFile(
    path.join(root, ".track", "state.yaml"),
    `version: 1
project:
  id: track
  name: Track
track:
  id: track-v2
  title: Track plugin v2
  topology: sprint
  total_laps: ${stateTotalLaps}
  active_lap: ${stateActiveLap}
  percent_complete: 0
laps:
  - id: lap-1
    title: ${stateLapTitle}
    status: todo
    checkpoints:
      - id: cp-1
        title: ${stateCheckpointTitle}
        status: todo
tasks:
  - id: task-001
    title: Add harness validation
    checkpoint_id: ${stateTaskCheckpointId}
    status: todo
flags: []
events: []
`,
    "utf8"
  );

  return root;
}
