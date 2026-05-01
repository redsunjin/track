#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

async function main() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "track-clean-uat-"));
  const consumerRoot = path.join(tempRoot, "consumer");

  run("npm", ["run", "build"], repoRoot);
  run("npm", ["run", "vscode:build"], repoRoot);

  const tarballPath = packTarball(tempRoot);

  await mkdir(path.join(consumerRoot, ".agent"), { recursive: true });
  await writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "track-clean-uat-consumer",
        private: true,
        type: "module",
        scripts: {
          check: "node --version",
          smoke: "node --version",
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    path.join(consumerRoot, "README.md"),
    ["# Clean UAT Consumer", "", "## Roadmap", "", "Verify Track from an installed tarball."].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(consumerRoot, ".agent", "track-bootstrap.json"),
    `${JSON.stringify(
      {
        version: 1,
        source: "project-harness-runner",
        project: { id: "clean-uat-consumer", name: "Clean UAT Consumer", mode: "sprint" },
        method: "gsd",
        goal: "Prove Track can bootstrap from an installed package.",
        validation: {
          preferred: "npm run check",
          checks: ["npm run check"],
          smokes: ["npm run smoke"],
        },
        phases: [
          {
            id: "harness-execution",
            title: "Harness execution",
            checkpoints: [
              { id: "define-next-slice", title: "Define next implementation slice", status: "doing" },
              { id: "validate-harness", title: "Validate with harness", status: "todo" },
            ],
          },
        ],
        tasks: [
          {
            id: "run-clean-uat",
            title: "Run clean-project UAT",
            checkpoint_id: "validate-harness",
            owner: "codex",
            status: "doing",
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], consumerRoot);

  const binPath = path.join(consumerRoot, "node_modules", ".bin", "track");
  assertIncludes(
    run(binPath, ["init", "--name", "Clean UAT Consumer", "--template", "simple", "--no-color"], consumerRoot).stdout,
    "TRACK INIT CREATED",
    "track init did not create Track files"
  );
  assertIncludes(
    run(binPath, ["status", "--no-color"], consumerRoot).stdout,
    "Clean UAT Consumer",
    "track status did not render initialized project"
  );
  assertIncludes(
    run(binPath, ["map", "--no-color"], consumerRoot).stdout,
    "TRACK // MAP GENERATOR",
    "track map did not render initialized roadmap"
  );
  assertIncludes(
    run(binPath, ["bootstrap", "--from", "readme,package", "--dry-run", "--no-color"], consumerRoot).stdout,
    "TRACK BOOTSTRAP DRAFT",
    "track bootstrap readme/package draft failed"
  );

  const harnessBootstrap = run(binPath, ["bootstrap", "--from", "harness", "--dry-run", "--json"], consumerRoot).stdout;
  assertIncludes(harnessBootstrap, "\"topology\": \"harness\"", "harness bootstrap did not project harness topology");
  assertIncludes(harnessBootstrap, "Run clean-project UAT", "harness bootstrap did not project harness task");

  const blockedInit = runAllowFailure(binPath, ["init", "--name", "Clean UAT Consumer", "--no-color"], consumerRoot);
  if (blockedInit.status === 0 || !blockedInit.stderr.includes("would overwrite")) {
    throw new Error("track init did not block overwrite in the clean UAT project.");
  }

  process.stdout.write(
    [
      "CLEAN PROJECT UAT OK",
      `TARBALL  ${tarballPath}`,
      `CONSUMER ${consumerRoot}`,
      "CLI      track init/status/map/bootstrap",
      "GUARD    init overwrite blocked without --force",
    ].join("\n") + "\n"
  );
}

function packTarball(destination) {
  const pack = run("npm", ["pack", "--json", "--pack-destination", destination], repoRoot);
  const packEntries = JSON.parse(pack.stdout);
  const filename = packEntries[0]?.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("npm pack did not return a tarball filename.");
  }
  return path.isAbsolute(filename) ? filename : path.join(destination, filename);
}

function run(command, args, cwd) {
  const result = runAllowFailure(command, args, cwd);
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }
  return result;
}

function runAllowFailure(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function assertIncludes(output, expected, message) {
  if (!output.includes(expected)) {
    throw new Error(`${message}\nExpected output to include: ${expected}\nActual output:\n${output}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`clean-project-uat: ${message}\n`);
  process.exitCode = 1;
});
