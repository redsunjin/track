import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  collectOrchestrationValidationCommands,
  TRACK_ORCHESTRATION_CONTRACT_FILE,
  trackOrchestrationContractToIntermediateSchema,
} from "../src/orchestration-contract.js";

test("trackOrchestrationContractToIntermediateSchema maps explicit harness payloads", async () => {
  const fixture = JSON.parse(await readFile(path.resolve("examples/track-bootstrap.example.json"), "utf8")) as unknown;

  const schema = trackOrchestrationContractToIntermediateSchema(fixture, {
    cwd: path.resolve("."),
    sourceName: "project-harness-runner",
    sources: ["harness", "agent"],
    validationCommands: ["npm run check:harness"],
  });

  assert.equal(TRACK_ORCHESTRATION_CONTRACT_FILE, ".agent/track-bootstrap.json");
  assert.equal(schema.version, 1);
  assert.equal(schema.project.id, "repo-name");
  assert.equal(schema.project.name, "Repo Name");
  assert.equal(schema.project.mode, "sprint");
  assert.equal(schema.phases[0]?.id, "harness-execution");
  assert.equal(schema.phases[0]?.checkpoints?.[0]?.id, "define-next-slice");
  assert.equal(schema.tasks?.[0]?.id, "run-agent-harness");
  assert.equal(schema.tasks?.[0]?.phase_id, "harness-execution");
  assert.equal(schema.metadata?.kind, "track-orchestration-contract");
  assert.equal(schema.metadata?.method, "gsd");
  assert.deepEqual(schema.metadata?.sources, ["harness", "agent"]);
  assert.deepEqual(schema.metadata?.validation_commands, [
    "scripts/agent-harness.sh",
    "npm run check",
    "npm run smoke",
    "npm run check:harness",
  ]);
});

test("trackOrchestrationContractToIntermediateSchema creates a default plan when phases and tasks are missing", () => {
  const schema = trackOrchestrationContractToIntermediateSchema(
    {
      project: { name: "Minimal Harness" },
      goal: "Create a usable Track plan",
      validation: { checks: ["npm test"] },
    },
    { cwd: "/tmp/minimal-harness" }
  );

  assert.equal(schema.project.id, "minimal-harness");
  assert.equal(schema.phases[0]?.id, "harness-execution");
  assert.equal(schema.phases[0]?.checkpoints?.length, 3);
  assert.equal(schema.tasks?.[0]?.id, "run-agent-harness");
  assert.equal(schema.tasks?.[0]?.status, "doing");
  assert.match(schema.tasks?.[0]?.title ?? "", /npm test/);
});

test("collectOrchestrationValidationCommands de-dupes payload and fallback validation", () => {
  const commands = collectOrchestrationValidationCommands(
    {
      validation: {
        preferred: "npm test",
        checks: ["npm run check", "npm test"],
        smokes: ["npm run smoke"],
      },
    },
    ["npm run check", "scripts/agent-harness.sh"]
  );

  assert.deepEqual(commands, ["npm test", "npm run check", "npm run smoke", "scripts/agent-harness.sh"]);
});

test("trackOrchestrationContractToIntermediateSchema rejects non-object payload roots", () => {
  assert.throws(() => trackOrchestrationContractToIntermediateSchema([]), /must be a JSON object/);
});
