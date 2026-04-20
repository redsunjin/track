import { createInterface } from "node:readline";
import process from "node:process";

import { applyTrackMutation } from "./actions.js";
import { buildTrackControlSnapshot, listTrackNextActions, listTrackTasks } from "./control.js";
import { generateTrackMap } from "./generator.js";
import { loadPitwallDetail, loadPitwallOwnerLoad, scanPitwall } from "./pitwall.js";
import { loadTrackRoadmap } from "./roadmap.js";
import { resolveWorkspacePath } from "./security.js";
import { loadTrackState } from "./state.js";
import { summarizeTrack } from "./summary.js";

type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
type JSONDict = { [key: string]: JSONValue };

const SERVER_INFO = { name: "track-mcp", version: "0.1.0" };
const PROTOCOL_VERSION = "2024-11-05";

function schema(properties: Record<string, JSONValue>, required?: string[]): JSONDict {
  const payload: JSONDict = {
    type: "object",
    properties: properties as JSONValue,
    additionalProperties: false,
  };
  if (required?.length) {
    payload.required = required;
  }
  return payload;
}

export const READ_TOOLS: JSONDict[] = [
  {
    name: "get_track_status",
    title: "Get Track status",
    description: "Read-only current repo Track summary from local .track state files.",
    inputSchema: schema({
      repo_path: { type: "string" },
      state_file: { type: "string" },
    }),
  },
  {
    name: "get_track_map",
    title: "Get Track map",
    description: "Read-only roadmap-derived track map and segment list.",
    inputSchema: schema({
      repo_path: { type: "string" },
      roadmap_file: { type: "string" },
      state_file: { type: "string" },
    }),
  },
  {
    name: "list_track_tasks",
    title: "List Track tasks",
    description: "Read-only task list with lap/checkpoint context for the current repo.",
    inputSchema: schema({
      repo_path: { type: "string" },
      state_file: { type: "string" },
    }),
  },
  {
    name: "get_track_next_actions",
    title: "Get Track next actions",
    description: "Read-only prioritized next-action list for the current repo.",
    inputSchema: schema({
      repo_path: { type: "string" },
      state_file: { type: "string" },
    }),
  },
  {
    name: "get_track_control_snapshot",
    title: "Get Track control snapshot",
    description: "Read-only structured control snapshot with summary, active lap/checkpoint, task list, and next actions.",
    inputSchema: schema({
      repo_path: { type: "string" },
      state_file: { type: "string" },
    }),
  },
  {
    name: "get_pitwall_overview",
    title: "Get Pitwall overview",
    description: "Read-only workspace overview across Track projects.",
    inputSchema: schema({
      root: { type: "string" },
    }),
  },
  {
    name: "get_pitwall_detail",
    title: "Get Pitwall detail",
    description: "Read-only detailed view for one Track project inside the workspace.",
    inputSchema: schema({
      root: { type: "string" },
      selector: { type: "string" },
    }, ["selector"]),
  },
  {
    name: "get_pitwall_owner_load",
    title: "Get Pitwall owner load",
    description: "Read-only owner and agent load summary across the workspace.",
    inputSchema: schema({
      root: { type: "string" },
    }),
  },
];

export const WRITE_TOOLS: JSONDict[] = [
  {
    name: "start_track_task",
    title: "Start Track task",
    description: "Mark one Track task as doing and persist the state change locally.",
    inputSchema: schema({
      actor: { type: "string" },
      repo_path: { type: "string" },
      state_file: { type: "string" },
      task_id: { type: "string" },
    }, ["task_id"]),
  },
  {
    name: "complete_track_task",
    title: "Complete Track task",
    description: "Mark one Track task as done and persist the state change locally.",
    inputSchema: schema({
      actor: { type: "string" },
      repo_path: { type: "string" },
      state_file: { type: "string" },
      task_id: { type: "string" },
    }, ["task_id"]),
  },
  {
    name: "block_track_task",
    title: "Block Track task",
    description: "Mark one Track task as blocked with a reason and persist the state change locally.",
    inputSchema: schema({
      actor: { type: "string" },
      reason: { type: "string" },
      repo_path: { type: "string" },
      state_file: { type: "string" },
      task_id: { type: "string" },
    }, ["task_id", "reason"]),
  },
  {
    name: "unblock_track_task",
    title: "Unblock Track task",
    description: "Clear the blocked state for one Track task and persist the state change locally.",
    inputSchema: schema({
      actor: { type: "string" },
      repo_path: { type: "string" },
      state_file: { type: "string" },
      task_id: { type: "string" },
    }, ["task_id"]),
  },
  {
    name: "advance_track_checkpoint",
    title: "Advance Track checkpoint",
    description: "Mark the active or selected Track checkpoint as done and persist the state change locally.",
    inputSchema: schema({
      actor: { type: "string" },
      checkpoint_id: { type: "string" },
      repo_path: { type: "string" },
      state_file: { type: "string" },
    }),
  },
];

export const TOOLS: JSONDict[] = [...READ_TOOLS, ...WRITE_TOOLS];

const WRITE_TOOL_NAMES = new Set([
  "start_track_task",
  "complete_track_task",
  "block_track_task",
  "unblock_track_task",
  "advance_track_checkpoint",
]);

export class MCPError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export class TrackMCPServer {
  allowWrite: boolean;
  repoRoot: string;
  workspaceRoot: string;

  constructor(options?: { allowWrite?: boolean; repoRoot?: string; workspaceRoot?: string }) {
    this.allowWrite = options?.allowWrite ?? resolveWriteAllowed();
    this.repoRoot = options?.repoRoot ?? process.cwd();
    this.workspaceRoot = options?.workspaceRoot ?? process.cwd();
  }

  async handle(request: JSONDict): Promise<JSONDict | null> {
    const method = request.method;
    const requestId = request.id ?? null;

    if (typeof method !== "string") {
      throw new MCPError(-32600, "Request method must be a string.");
    }

    if (method === "notifications/initialized") {
      return null;
    }
    if (method === "ping") {
      return { jsonrpc: "2.0", id: requestId, result: {} };
    }
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: requestId,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };
    }
    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id: requestId,
        result: { tools: this.allowWrite ? TOOLS : READ_TOOLS },
      };
    }
    if (method === "tools/call") {
      const params = expectObject(request.params, "params");
      const name = params.name;
      if (typeof name !== "string" || !name) {
        throw new MCPError(-32602, "Tool name is required.");
      }
      const argumentsObject = expectObject(params.arguments, "arguments");
      const payload = await this.callTool(name, argumentsObject);
      return {
        jsonrpc: "2.0",
        id: requestId,
        result: {
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
          isError: false,
        },
      };
    }

    throw new MCPError(-32601, `Method not found: ${method}`);
  }

  async callTool(name: string, argumentsObject: JSONDict): Promise<JSONDict> {
    if (WRITE_TOOL_NAMES.has(name) && !this.allowWrite) {
      throw new MCPError(-32001, "Track MCP write tools are disabled. Start the server with --allow-write or set TRACK_MCP_WRITE=1.");
    }

    if (name === "get_track_status") {
      const repoRoot = await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot);
      const state = await loadTrackState(repoRoot, readOptionalString(argumentsObject, "state_file"));
      const summary = summarizeTrack(state);
      return {
        repo_path: repoRoot,
        summary,
      } as unknown as JSONDict;
    }

    if (name === "get_track_map") {
      const repoRoot = await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot);
      const roadmap = await loadTrackRoadmap(repoRoot, readOptionalString(argumentsObject, "roadmap_file"));
      const state = await loadTrackState(repoRoot, readOptionalString(argumentsObject, "state_file")).catch(() => undefined);
      const segments = generateTrackMap(roadmap, state);
      return {
        repo_path: repoRoot,
        project: roadmap.project,
        segments,
      } as unknown as JSONDict;
    }

    if (name === "list_track_tasks") {
      const repoRoot = await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot);
      const state = await loadTrackState(repoRoot, readOptionalString(argumentsObject, "state_file"));
      const tasks = listTrackTasks(state);
      return {
        repo_path: repoRoot,
        tasks,
      } as unknown as JSONDict;
    }

    if (name === "get_track_next_actions") {
      const repoRoot = await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot);
      const state = await loadTrackState(repoRoot, readOptionalString(argumentsObject, "state_file"));
      const next_actions = listTrackNextActions(state);
      return {
        repo_path: repoRoot,
        next_actions,
      } as unknown as JSONDict;
    }

    if (name === "get_track_control_snapshot") {
      const repoRoot = await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot);
      const state = await loadTrackState(repoRoot, readOptionalString(argumentsObject, "state_file"));
      const snapshot = buildTrackControlSnapshot(state);
      return {
        repo_path: repoRoot,
        snapshot,
      } as unknown as JSONDict;
    }

    if (name === "get_pitwall_overview") {
      const root = await readWorkspaceRoot(argumentsObject, "root", this.workspaceRoot);
      const entries = await scanPitwall(root);
      return {
        root,
        entries,
      } as unknown as JSONDict;
    }

    if (name === "get_pitwall_detail") {
      const root = await readWorkspaceRoot(argumentsObject, "root", this.workspaceRoot);
      const selector = readOptionalString(argumentsObject, "selector");
      if (!selector) {
        throw new MCPError(-32602, "Argument 'selector' is required.");
      }
      const detail = await loadPitwallDetail(root, selector);
      return {
        root,
        detail,
      } as unknown as JSONDict;
    }

    if (name === "get_pitwall_owner_load") {
      const root = await readWorkspaceRoot(argumentsObject, "root", this.workspaceRoot);
      const owners = await loadPitwallOwnerLoad(root);
      return {
        root,
        owners,
      } as unknown as JSONDict;
    }

    if (name === "start_track_task") {
      return this.runMutation("start", argumentsObject);
    }

    if (name === "complete_track_task") {
      return this.runMutation("done", argumentsObject);
    }

    if (name === "block_track_task") {
      return this.runMutation("block", argumentsObject);
    }

    if (name === "unblock_track_task") {
      return this.runMutation("unblock", argumentsObject);
    }

    if (name === "advance_track_checkpoint") {
      return this.runMutation("checkpoint-advance", argumentsObject);
    }

    throw new MCPError(-32601, `Unknown tool: ${name}`);
  }

  async runMutation(
    command: "start" | "done" | "block" | "unblock" | "checkpoint-advance",
    argumentsObject: JSONDict
  ): Promise<JSONDict> {
    const taskId =
      command === "checkpoint-advance" ? undefined : readRequiredString(argumentsObject, "task_id");
    const reason = command === "block" ? readRequiredString(argumentsObject, "reason") : undefined;
    const result = await applyTrackMutation({
      actor: readOptionalString(argumentsObject, "actor") ?? "track-mcp",
      checkpointId: readOptionalString(argumentsObject, "checkpoint_id"),
      command,
      reason,
      repoRoot: await readRepoRoot(argumentsObject, this.repoRoot, this.workspaceRoot),
      stateFile: readOptionalString(argumentsObject, "state_file"),
      taskId,
    });

    return {
      event: result.event,
      repo_path: result.repoPath,
      state: result.state,
      state_file: result.stateFilePath,
      summary: result.summary,
    } as unknown as JSONDict;
  }
}

export async function runStdioServer(options?: {
  allowWrite?: boolean;
  repoRoot?: string;
  workspaceRoot?: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}): Promise<void> {
  const server = new TrackMCPServer({
    allowWrite: options?.allowWrite,
    repoRoot: options?.repoRoot,
    workspaceRoot: options?.workspaceRoot,
  });
  const input = options?.input ?? process.stdin;
  const output = options?.output ?? process.stdout;
  const lineReader = createInterface({ input, crlfDelay: Infinity });

  for await (const rawLine of lineReader) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    let request: JSONDict | undefined;
    let response: JSONDict | null;
    try {
      request = JSON.parse(line) as JSONDict;
      if (!request || typeof request !== "object" || Array.isArray(request)) {
        throw new MCPError(-32600, "Request must be a JSON object.");
      }
      response = await server.handle(request);
    } catch (error: unknown) {
      const requestId = request?.id ?? null;
      if (error instanceof SyntaxError) {
        response = { jsonrpc: "2.0", id: requestId, error: { code: -32700, message: `Parse error: ${error.message}` } };
      } else if (error instanceof MCPError) {
        response = { jsonrpc: "2.0", id: requestId, error: { code: error.code, message: error.message } };
      } else {
        const message = error instanceof Error ? error.message : String(error);
        response = { jsonrpc: "2.0", id: requestId, error: { code: -32000, message: `Internal error: ${message}` } };
      }
    }

    if (response) {
      output.write(`${JSON.stringify(response)}\n`);
    }
  }
}

function expectObject(value: JSONValue | undefined, label: string): JSONDict {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new MCPError(-32602, `${label} must be an object.`);
  }
  return value as JSONDict;
}

function readOptionalString(argumentsObject: JSONDict, key: string): string | undefined {
  const value = argumentsObject[key];
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new MCPError(-32602, `Argument '${key}' must be a string.`);
  }
  return value;
}

function readRequiredString(argumentsObject: JSONDict, key: string): string {
  const value = readOptionalString(argumentsObject, key);
  if (!value) {
    throw new MCPError(-32602, `Argument '${key}' is required.`);
  }
  return value;
}

async function readRepoRoot(argumentsObject: JSONDict, fallback: string, workspaceRoot: string): Promise<string> {
  const repoPath = readOptionalString(argumentsObject, "repo_path");
  if (!repoPath) {
    return fallback;
  }
  return resolveWorkspacePath(workspaceRoot, repoPath, "Argument 'repo_path'");
}

async function readWorkspaceRoot(argumentsObject: JSONDict, key: string, workspaceRoot: string): Promise<string> {
  return resolveWorkspacePath(workspaceRoot, readOptionalString(argumentsObject, key), `Argument '${key}'`);
}

function resolveWriteAllowed(): boolean {
  const value = process.env.TRACK_MCP_WRITE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
