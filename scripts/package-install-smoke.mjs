#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

async function main() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "track-install-smoke-"));
  const consumerRoot = path.join(tempRoot, "consumer");

  run("npm", ["run", "build"], repoRoot);
  run("npm", ["run", "vscode:build"], repoRoot);

  const pack = run("npm", ["pack", "--json", "--pack-destination", tempRoot], repoRoot);
  const packEntries = JSON.parse(pack.stdout);
  const filename = packEntries[0]?.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("npm pack did not return a tarball filename.");
  }
  const tarballPath = path.isAbsolute(filename) ? filename : path.join(tempRoot, filename);

  await mkdir(consumerRoot, { recursive: true });
  await writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "track-install-smoke-consumer", private: true, type: "module" }, null, 2)}\n`
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], consumerRoot);
  run("node", ["--input-type=module", "--eval", importSmokeSource()], consumerRoot);

  const binPath = path.join(consumerRoot, "node_modules", ".bin", "track");
  const cli = run(binPath, ["pitwall", "--openclaw", "--no-color"], consumerRoot);
  if (!cli.stdout.includes("Pitwall // OpenClaw Workers")) {
    throw new Error("installed track CLI did not render the OpenClaw Pitwall board.");
  }

  process.stdout.write(
    [
      "PACKAGE INSTALL SMOKE OK",
      `TARBALL  ${tarballPath}`,
      `CONSUMER ${consumerRoot}`,
      "IMPORTS  track, track/core, track/cli, track/bot-bridge, track/openclaw-adapter, track/openclaw-live",
      "CLI      track pitwall --openclaw --no-color",
    ].join("\n") + "\n"
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function importSmokeSource() {
  return `
const root = await import("track");
const core = await import("track/core");
const cli = await import("track/cli");
const botBridge = await import("track/bot-bridge");
const adapter = await import("track/openclaw-adapter");
const openclawLive = await import("track/openclaw-live");
if (typeof root.summarizeTrack !== "function") throw new Error("missing root summarizeTrack export");
if (typeof core.summarizeTrack !== "function") throw new Error("missing track/core summarizeTrack export");
if (typeof cli.renderOpenClawPitwall !== "function") throw new Error("missing track/cli OpenClaw Pitwall export");
if (typeof botBridge.buildMonitorBotPushEvents !== "function") throw new Error("missing bot bridge push export");
if (typeof adapter.buildOpenClawSnapshotFromToolData !== "function") throw new Error("missing OpenClaw adapter export");
if (typeof openclawLive.captureOpenClawTelemetry !== "function") throw new Error("missing OpenClaw live export");
`;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`package-install-smoke: ${message}\n`);
  process.exitCode = 1;
});
