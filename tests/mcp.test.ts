import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PassThrough } from "node:stream";
import { parse } from "yaml";

import { TrackMCPServer, runStdioServer } from "../src/mcp.js";

test("TrackMCPServer initializes, lists tools, and returns track status", async () => {
  const server = new TrackMCPServer({
    repoRoot: path.resolve("."),
    workspaceRoot: path.resolve(".."),
  });

  const initialize = await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal((initialize?.result as { serverInfo: { name: string } }).serverInfo.name, "track-mcp");

  const tools = await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const toolNames = ((tools?.result as { tools: Array<{ name: string }> }).tools).map((tool) => tool.name);
  assert.deepEqual(toolNames, [
    "get_track_status",
    "get_track_map",
    "get_pitwall_overview",
    "get_pitwall_detail",
    "get_pitwall_owner_load",
    "start_track_task",
    "complete_track_task",
    "block_track_task",
    "unblock_track_task",
    "advance_track_checkpoint",
  ]);

  const result = await server.handle({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "get_track_status", arguments: {} },
  });
  const payload = (result?.result as { structuredContent: { summary: { projectName: string } } }).structuredContent;
  assert.equal(payload.summary.projectName, "Track");
});

test("TrackMCPServer returns track map and pitwall detail", async () => {
  const workspaceRoot = path.resolve("..");
  const server = new TrackMCPServer({
    repoRoot: path.resolve("."),
    workspaceRoot,
  });

  const mapResult = await server.handle({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "get_track_map", arguments: {} },
  });
  const mapPayload = (mapResult?.result as { structuredContent: { segments: Array<{ label: string }> } }).structuredContent;
  assert.ok(mapPayload.segments.some((segment) => segment.label === "MCP contract"));

  const detailResult = await server.handle({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "get_pitwall_detail", arguments: { root: workspaceRoot, selector: "track" } },
  });
  const detailPayload =
    (detailResult?.result as { structuredContent: { detail: { summary: { projectName: string } } } }).structuredContent;
  assert.equal(detailPayload.detail.summary.projectName, "Track");

  const ownersResult = await server.handle({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "get_pitwall_owner_load", arguments: { root: workspaceRoot } },
  });
  const ownersPayload =
    (ownersResult?.result as { structuredContent: { owners: Array<{ owner: string }> } }).structuredContent;
  assert.ok(ownersPayload.owners.some((owner) => owner.owner === "codex"));
});

test("TrackMCPServer write tools persist state changes and append events", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "track-mcp-write-"));
  const trackDir = path.join(tempRoot, ".track");
  const statePath = path.join(trackDir, "state.yaml");
  await mkdir(trackDir, { recursive: true });
  await writeFile(
    statePath,
    [
      "version: 1",
      "project:",
      "  id: demo",
      "  name: Demo Track",
      "track:",
      "  id: demo-track",
      "  title: Demo Track plugin",
      "laps:",
      "  - id: lap-1",
      "    title: Setup",
      "    status: todo",
      "    checkpoints:",
      "      - id: cp-1",
      "        title: Wire write tools",
      "        status: todo",
      "        weight: 1",
      "      - id: cp-2",
      "        title: Verify checkpoint advance",
      "        status: todo",
      "        weight: 1",
      "tasks:",
      "  - id: task-1",
      "    title: Wire write tools",
      "    checkpoint_id: cp-1",
      "    status: todo",
      "    owner: codex",
      "  - id: task-2",
      "    title: Verify checkpoint advance",
      "    checkpoint_id: cp-2",
      "    status: todo",
      "    owner: codex",
      "flags: []",
      "events: []",
      "",
    ].join("\n"),
    "utf8"
  );

  const server = new TrackMCPServer({
    repoRoot: tempRoot,
    workspaceRoot: tempRoot,
  });

  await server.handle({
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: { name: "start_track_task", arguments: { task_id: "task-1", actor: "test-mcp" } },
  });
  await server.handle({
    jsonrpc: "2.0",
    id: 11,
    method: "tools/call",
    params: {
      name: "block_track_task",
      arguments: { task_id: "task-1", reason: "waiting on review", actor: "test-mcp" },
    },
  });
  await server.handle({
    jsonrpc: "2.0",
    id: 12,
    method: "tools/call",
    params: { name: "unblock_track_task", arguments: { task_id: "task-1", actor: "test-mcp" } },
  });
  await server.handle({
    jsonrpc: "2.0",
    id: 13,
    method: "tools/call",
    params: { name: "complete_track_task", arguments: { task_id: "task-1", actor: "test-mcp" } },
  });
  const advanceResult = await server.handle({
    jsonrpc: "2.0",
    id: 14,
    method: "tools/call",
    params: { name: "advance_track_checkpoint", arguments: { checkpoint_id: "cp-2", actor: "test-mcp" } },
  });

  const payload =
    (advanceResult?.result as { structuredContent: { summary: { percentComplete: number } } }).structuredContent;
  assert.equal(payload.summary.percentComplete, 100);

  const savedState = parse(await readFile(statePath, "utf8")) as {
    tasks: Array<{ id: string; status: string }>;
    laps: Array<{ checkpoints: Array<{ id: string; status: string }> }>;
    events: Array<{ type: string }>;
  };
  assert.equal(savedState.tasks.find((task) => task.id === "task-1")?.status, "done");
  assert.equal(savedState.tasks.find((task) => task.id === "task-2")?.status, "done");
  assert.equal(savedState.laps[0]?.checkpoints[0]?.status, "done");
  assert.equal(savedState.laps[0]?.checkpoints[1]?.status, "done");
  assert.equal(savedState.events.length, 5);
  assert.equal(savedState.events.at(-1)?.type, "checkpoint.advanced");

  const eventLog = (await readFile(path.join(trackDir, "events.ndjson"), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string });
  assert.equal(eventLog.length, 5);
  assert.equal(eventLog[0]?.type, "task.started");
  assert.equal(eventLog[1]?.type, "task.blocked");
  assert.equal(eventLog[2]?.type, "task.unblocked");
  assert.equal(eventLog[3]?.type, "task.completed");
  assert.equal(eventLog[4]?.type, "checkpoint.advanced");
});

test("runStdioServer handles initialize and validation errors", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "track-mcp-stdio-"));
  const input = new PassThrough();
  const output = new PassThrough();
  let outputBuffer = "";

  output.on("data", (chunk) => {
    outputBuffer += chunk.toString("utf8");
  });

  const serverPromise = runStdioServer({
    repoRoot: path.resolve("."),
    workspaceRoot: path.resolve(".."),
    input,
    output,
  });

  input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`);
  input.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_pitwall_detail", arguments: { root: tempRoot } },
    })}\n`
  );
  input.end();

  await serverPromise;

  const responses = outputBuffer
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  assert.equal(responses[0]?.result?.protocolVersion, "2024-11-05");
  assert.equal(responses[1]?.error?.code, -32602);
  assert.equal(responses[1]?.error?.message, "Argument 'selector' is required.");
});
