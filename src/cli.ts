#!/usr/bin/env node

import process from "node:process";

import { applyTrackMutation } from "./actions.js";
import {
  exportAgentPack,
  installAgentPack,
  listAgentPackKinds,
  normalizeAgentPackKind,
  summarizeAgentPackExport,
  summarizeAgentPackInstall,
} from "./agent-packs.js";
import type { TrackMutationCommand } from "./actions.js";
import { expandCommandAliases } from "./aliases.js";
import { renderBuddy } from "./buddy.js";
import { buildMonitorBotPushEvents, renderMonitorBotPushBatch } from "./bot-bridge.js";
import { checkHarnessConsistency, renderHarnessCheck } from "./harness.js";
import { buildTrackControlSnapshot } from "./control.js";
import { importExternalPlan, summarizeExternalPlanImport } from "./external-plan.js";
import { generateTrackMap, renderTrackMap } from "./generator.js";
import { TrackMCPServer, runStdioServer } from "./mcp.js";
import {
  loadOpenClawPitwallResult,
  renderOpenClawPitwall,
  resolveOpenClawPitwallFilter,
} from "./openclaw-pitwall.js";
import { captureOpenClawTelemetry, renderOpenClawCaptureSummary } from "./openclaw-live.js";
import {
  buildTrackPackageHandoff,
  buildTrackReleaseCandidateTagDryRun,
  checkTrackPublishModeGuard,
  checkTrackPackageDryRun,
  checkTrackPackageLayout,
  checkTrackPublishReadiness,
  listTrackPackageBoundaries,
  renderPackageDryRunCheck,
  renderPackageHandoffNote,
  renderPackageLayoutCheck,
  renderPackagePublishModeGuard,
  renderPackageReadinessCheck,
  renderPackageReleaseCandidateTagDryRun,
} from "./package-layout.js";
import type { PackagePublishModeTarget } from "./package-layout.js";
import {
  loadPitwallDetail,
  loadPitwallOwnerLoad,
  renderPitwall,
  renderPitwallDetail,
  renderPitwallOwners,
  renderPitwallQueue,
  scanPitwall,
} from "./pitwall.js";
import { renderNext, renderStatus } from "./render.js";
import { loadTrackRoadmap } from "./roadmap.js";
import { loadTrackState } from "./state.js";
import { summarizeTrack } from "./summary.js";
import { runWatchLoop } from "./watch.js";

async function main(): Promise<void> {
  const args = expandCommandAliases(process.argv.slice(2));
  const command = args[0] ?? "status";
  const targetId = args[1];
  const file = readFlag(args, "--file");
  const roadmapFile = readFlag(args, "--roadmap");
  const root = readFlag(args, "--root");
  const reason = readFlag(args, "--reason");
  const actor = readFlag(args, "--actor") ?? "track";
  const intervalMs = parseInterval(readFlag(args, "--interval"));
  const color = readColorPreference(args);
  const allowWrite = args.includes("--allow-write");
  const dryRun = args.includes("--dry-run");
  const json = args.includes("--json");
  const preserveProgress = !args.includes("--reset-progress");
  const adapterKind = readFlag(args, "--adapter");
  const packKind = readFlag(args, "--tool");
  const outDir = readFlag(args, "--out");
  const sourceFile = readFlag(args, "--source");
  const sessionsFile = readFlag(args, "--sessions");
  const processesFile = readFlag(args, "--processes");
  const previousSourceFile = readFlag(args, "--previous");
  const packageTargetMode = readFlag(args, "--target");
  const packageCandidateTag = readFlag(args, "--tag");
  const packageCandidateRc = parseOptionalInteger(readFlag(args, "--rc"));
  const packageAllowPrivateRootArtifact = args.includes("--allow-private-root");
  const stateOutFile = readFlag(args, "--state-out");
  const roadmapOutFile = readFlag(args, "--roadmap-out");
  const watch = args.includes("--watch");
  const openClawMode = args.includes("--openclaw");
  const includeMainSessions = args.includes("--include-main");
  const includeCompleted = args.includes("--include-completed");

  if (command === "mcp") {
    await runStdioServer({
      allowWrite,
      repoRoot: process.cwd(),
      workspaceRoot: root ?? process.cwd(),
    });
    return;
  }

  if (command === "mcp-smoke-test") {
    const server = new TrackMCPServer({
      allowWrite,
      repoRoot: process.cwd(),
      workspaceRoot: root ?? process.cwd(),
    });
    const initialize = await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    const tools = await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const statusResult = await server.handle({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_track_status", arguments: {} },
    });
    const tasksResult = await server.handle({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "list_track_tasks", arguments: {} },
    });
    const nextActionsResult = await server.handle({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_track_next_actions", arguments: {} },
    });
    const controlSnapshotResult = await server.handle({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "get_track_control_snapshot", arguments: {} },
    });
    const pitwallResult = await server.handle({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "get_pitwall_overview", arguments: { root: root ?? process.cwd() } },
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          initialized: initialize,
          tools,
          status: statusResult,
          tasks: tasksResult,
          nextActions: nextActionsResult,
          controlSnapshot: controlSnapshotResult,
          pitwall: pitwallResult,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  if (command === "openclaw") {
    const subcommand = args[1] ?? "capture";
    if (subcommand === "capture") {
      const workspaceRoot = root ?? process.cwd();
      const capture = () =>
        captureOpenClawTelemetry({
          includeMainSessions,
          outputFile: outDir,
          processesFile,
          sessionsFile,
          sourceFile,
          workspaceRoot,
          write: !dryRun,
        });

      if (watch) {
        ensureWatchable(json);
        await runWatchLoop(async () => renderOpenClawCaptureSummary(await capture()), { intervalMs });
        return;
      }

      const result = await capture();
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${renderOpenClawCaptureSummary(result)}\n`);
      return;
    }

    if (subcommand === "push") {
      const workspaceRoot = root ?? process.cwd();
      const loadCurrent = () =>
        loadOpenClawPitwallResult({
          includeMainSessions,
          sourceFile,
          workspaceRoot,
        });
      const loadPrevious = () =>
        previousSourceFile
          ? loadOpenClawPitwallResult({
              includeMainSessions,
              sourceFile: previousSourceFile,
              workspaceRoot,
            })
          : Promise.resolve(undefined);

      if (watch) {
        ensureWatchable(json);
        let previousSnapshot = (await loadPrevious())?.snapshot;
        await runWatchLoop(async () => {
          const current = await loadCurrent();
          const events = buildMonitorBotPushEvents(current.snapshot, {
            includeCompleted,
            previousSnapshot,
          });
          previousSnapshot = current.snapshot;
          return renderMonitorBotPushBatch(events);
        }, { intervalMs });
        return;
      }

      const [current, previous] = await Promise.all([loadCurrent(), loadPrevious()]);
      const events = buildMonitorBotPushEvents(current.snapshot, {
        includeCompleted,
        previousSnapshot: previous?.snapshot,
      });
      const result = {
        events,
        previousSourceFound: previous?.sourceFound ?? false,
        previousSourcePath: previous?.sourcePath ?? null,
        sourceFound: current.sourceFound,
        sourcePath: current.sourcePath,
      };
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${renderMonitorBotPushBatch(events)}\n`);
      return;
    }

    throw new Error(`Unknown Track openclaw command: ${subcommand}`);
  }

  if (command === "pitwall") {
    const pitwallRoot = root ?? process.cwd();
    const detailSelector = readFlag(args, "--detail");
    const ownersMode = args.includes("--owners");
    const queueMode = args.includes("--queue");
    if (openClawMode) {
      const filter = resolveOpenClawPitwallFilter(args);
      const loadResult = () =>
        loadOpenClawPitwallResult({
          filter,
          includeMainSessions,
          sourceFile,
          workspaceRoot: pitwallRoot,
        });

      if (watch) {
        ensureWatchable(json);
        await runWatchLoop(async () => renderOpenClawPitwall(await loadResult(), { color }), { intervalMs });
        return;
      }

      const result = await loadResult();
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${renderOpenClawPitwall(result, { color })}\n`);
      return;
    }
    if (ownersMode) {
      if (watch) {
        ensureWatchable(json);
        await runWatchLoop(async () => {
          const owners = await loadPitwallOwnerLoad(pitwallRoot);
          return renderPitwallOwners(pitwallRoot, owners, { color });
        }, { intervalMs });
        return;
      }
      const owners = await loadPitwallOwnerLoad(pitwallRoot);
      if (json) {
        process.stdout.write(`${JSON.stringify(owners, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${renderPitwallOwners(pitwallRoot, owners, { color })}\n`);
      return;
    }
    if (detailSelector) {
      if (watch) {
        ensureWatchable(json);
        await runWatchLoop(async () => {
          const detail = await loadPitwallDetail(pitwallRoot, detailSelector);
          return renderPitwallDetail(detail, { color });
        }, { intervalMs });
        return;
      }
      const detail = await loadPitwallDetail(pitwallRoot, detailSelector);
      if (json) {
        process.stdout.write(`${JSON.stringify(detail, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${renderPitwallDetail(detail, { color })}\n`);
      return;
    }
    if (watch) {
      ensureWatchable(json);
      await runWatchLoop(async () => {
        const entries = await scanPitwall(pitwallRoot);
        return queueMode
          ? renderPitwallQueue(pitwallRoot, entries, { color })
          : renderPitwall(pitwallRoot, entries, { color });
      }, { intervalMs });
      return;
    }
    const entries = await scanPitwall(pitwallRoot);
    if (json) {
      process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      `${queueMode ? renderPitwallQueue(pitwallRoot, entries, { color }) : renderPitwall(pitwallRoot, entries, { color })}\n`
    );
    return;
  }

  if (command === "map") {
    if (watch) {
      ensureWatchable(json);
      await runWatchLoop(async () => {
        const roadmap = await loadTrackRoadmap(process.cwd(), roadmapFile);
        const state = await loadTrackState(process.cwd(), file).catch(() => undefined);
        const segments = generateTrackMap(roadmap, state);
        return renderTrackMap(roadmap.project.name, segments, { color });
      }, { intervalMs });
      return;
    }
    const roadmap = await loadTrackRoadmap(process.cwd(), roadmapFile);
    const state = await loadTrackState(process.cwd(), file).catch(() => undefined);
    const segments = generateTrackMap(roadmap, state);
    if (json) {
      process.stdout.write(`${JSON.stringify(segments, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${renderTrackMap(roadmap.project.name, segments, { color })}\n`);
    return;
  }

  if (command === "import") {
    const existingState = preserveProgress ? await loadTrackState(process.cwd(), file).catch(() => undefined) : undefined;
    const result = await importExternalPlan({
      adapterKind,
      cwd: process.cwd(),
      dryRun,
      existingState,
      preserveProgress,
      roadmapOutFile,
      sourceFile,
      stateOutFile,
    });

    if (json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${summarizeExternalPlanImport(result)}\n`);
    process.stdout.write(`${renderStatus(summarizeTrack(result.state), { color })}\n`);
    return;
  }

  if (command === "pack") {
    const subcommand = args[1] ?? "list";
    if (subcommand === "list") {
      const packs = listAgentPackKinds();
      if (json) {
        process.stdout.write(`${JSON.stringify({ packs }, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${packs.join("\n")}\n`);
      return;
    }

    if (subcommand === "export") {
      const normalizedKind = normalizeAgentPackKind(packKind);
      if (!normalizedKind) {
        throw new Error("`track pack export` requires `--tool <claude-code|codex|gemini-cli>`.");
      }

      const result = await exportAgentPack({
        repoRoot: process.cwd(),
        kind: normalizedKind,
        outDir,
      });

      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${summarizeAgentPackExport(result)}\n`);
      return;
    }

    if (subcommand === "install") {
      const normalizedKind = normalizeAgentPackKind(packKind);
      if (!normalizedKind) {
        throw new Error("`track pack install` requires `--tool <claude-code|codex|gemini-cli>`.");
      }

      const result = await installAgentPack({
        dryRun,
        repoRoot: process.cwd(),
        kind: normalizedKind,
        targetDir: outDir,
      });

      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${summarizeAgentPackInstall(result)}\n`);
      return;
    }

    throw new Error(`Unknown Track pack command: ${subcommand}`);
  }

  if (command === "package") {
    const subcommand = args[1] ?? "list";
    if (subcommand === "list") {
      const boundaries = listTrackPackageBoundaries();
      if (json) {
        process.stdout.write(`${JSON.stringify({ boundaries }, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${boundaries.map((boundary) => `${boundary.packageName}\t${boundary.entrypoint}`).join("\n")}\n`);
      return;
    }

    if (subcommand === "check") {
      const result = await checkTrackPackageLayout(process.cwd());
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackageLayoutCheck(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === "dry-run") {
      const result = await checkTrackPackageDryRun(process.cwd());
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackageDryRunCheck(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === "readiness" || subcommand === "gate") {
      const result = await checkTrackPublishReadiness(process.cwd());
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackageReadinessCheck(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === "handoff" || subcommand === "notes") {
      const result = await buildTrackPackageHandoff(process.cwd());
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackageHandoffNote(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === "publish-guard" || subcommand === "mode-guard") {
      const result = await checkTrackPublishModeGuard(process.cwd(), {
        targetMode: normalizePackagePublishModeTarget(packageTargetMode),
      });
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackagePublishModeGuard(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === "rc-tag" || subcommand === "tag-dry-run") {
      const result = await buildTrackReleaseCandidateTagDryRun(process.cwd(), {
        allowPrivateRootArtifact: packageAllowPrivateRootArtifact,
        candidateTag: packageCandidateTag,
        rc: packageCandidateRc,
      });
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderPackageReleaseCandidateTagDryRun(result)}\n`);
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }

    throw new Error(`Unknown Track package command: ${subcommand}`);
  }

  if (command === "check:harness") {
    const result = await checkHarnessConsistency(process.cwd());
    if (json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderHarnessCheck(result)}\n`);
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "control") {
    const state = await loadTrackState(process.cwd(), file);
    const snapshot = buildTrackControlSnapshot(state);
    if (json) {
      process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${renderStatus(snapshot.summary, { color })}\n`);
    for (const action of snapshot.nextActions.slice(0, 3)) {
      process.stdout.write(`ACTION   ${action.title}\n`);
    }
    return;
  }

  if (["start", "done", "block", "unblock"].includes(command) || (command === "checkpoint" && targetId === "advance")) {
    const mutationCommand: TrackMutationCommand =
      command === "checkpoint" ? "checkpoint-advance" : requireMutationCommand(command);
    const result = await applyTrackMutation({
      actor,
      checkpointId: command === "checkpoint" ? args[2] : undefined,
      command: mutationCommand,
      reason,
      repoRoot: process.cwd(),
      stateFile: file,
      taskId: command === "checkpoint" ? undefined : requireTarget(command, args[1]),
    });

    if (json) {
      process.stdout.write(`${JSON.stringify({ event: result.event, state: result.state }, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${result.event.summary}\n`);
    process.stdout.write(`${renderStatus(result.summary, { color })}\n`);
    return;
  }

  const state = await loadTrackState(process.cwd(), file);
  const summary = summarizeTrack(state);

  if (command === "buddy" || command === "companion") {
    if (watch) {
      ensureWatchable(json);
      await runWatchLoop(async () => {
        const liveState = await loadTrackState(process.cwd(), file);
        const liveSummary = summarizeTrack(liveState);
        const roadmap = await loadTrackRoadmap(process.cwd(), roadmapFile).catch(() => undefined);
        return renderBuddy(liveSummary, roadmap, liveState, { color });
      }, { intervalMs });
      return;
    }
    const roadmap = await loadTrackRoadmap(process.cwd(), roadmapFile).catch(() => undefined);
    if (json) {
      process.stdout.write(`${JSON.stringify({ summary, hasRoadmap: Boolean(roadmap) }, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${renderBuddy(summary, roadmap, state, { color })}\n`);
    return;
  }

  if (watch) {
    ensureWatchable(json);
    ensureReadableCommand(command);
      await runWatchLoop(async () => {
        const liveState = await loadTrackState(process.cwd(), file);
        const liveSummary = summarizeTrack(liveState);
        return command === "next" ? renderNext(liveSummary, { color }) : renderStatus(liveSummary, { color });
      }, { intervalMs });
      return;
    }

  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  switch (command) {
    case "status":
      process.stdout.write(`${renderStatus(summary, { color })}\n`);
      return;
    case "next":
      process.stdout.write(`${renderNext(summary, { color })}\n`);
      return;
    default:
      throw new Error(`Unknown Track command: ${command}`);
  }
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function normalizePackagePublishModeTarget(raw: string | undefined): PackagePublishModeTarget {
  if (!raw) {
    return "current";
  }
  if (raw === "current" || raw === "private-root" || raw === "publishable") {
    return raw;
  }
  throw new Error("`--target` must be one of current, private-root, or publishable.");
}

function requireTarget(command: string, target: string | undefined): string {
  if (!target) {
    throw new Error(`Command \`${command}\` requires a task id.`);
  }
  return target;
}

function requireMutationCommand(command: string): TrackMutationCommand {
  if (command === "start" || command === "done" || command === "block" || command === "unblock") {
    return command;
  }
  throw new Error(`Unknown Track command: ${command}`);
}

function ensureWatchable(json: boolean): void {
  if (json) {
    throw new Error("`--watch` cannot be combined with `--json`.");
  }
}

function ensureReadableCommand(command: string): void {
  if (command !== "status" && command !== "next") {
    throw new Error(`Unknown Track command: ${command}`);
  }
}

function parseInterval(raw: string | undefined): number {
  const parsed = Number(raw ?? "1000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

function parseOptionalInteger(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function readColorPreference(args: string[]): boolean | undefined {
  if (args.includes("--no-color")) {
    return false;
  }
  if (args.includes("--color")) {
    return true;
  }
  return undefined;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`track: ${message}\n`);
  process.exitCode = 1;
});
