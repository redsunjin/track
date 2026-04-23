import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build artifact config emits compiled runtime files into dist", async () => {
  const config = JSON.parse(await readFile("tsconfig.build.json", "utf8")) as {
    compilerOptions?: Record<string, unknown>;
    exclude?: string[];
    extends?: string;
    include?: string[];
  };

  assert.equal(config.extends, "./tsconfig.json");
  assert.equal(config.compilerOptions?.noEmit, false);
  assert.equal(config.compilerOptions?.outDir, "dist");
  assert.equal(config.compilerOptions?.rootDir, "src");
  assert.equal(config.compilerOptions?.declaration, true);
  assert.deepEqual(config.include, ["src/**/*.ts"]);
  assert.ok(config.exclude?.includes("tests"));
  assert.ok(config.exclude?.includes("vscode-extension"));
});

test("package scripts expose a build artifact verification path", async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
    files?: string[];
    scripts?: Record<string, string>;
  };

  assert.equal(manifest.scripts?.build, "tsc -p tsconfig.build.json");
  assert.equal(
    manifest.scripts?.["package:build-check"],
    "npm run build && npm run vscode:build && node dist/cli.js package dry-run"
  );
  assert.equal(manifest.scripts?.["package:dry-run"], "npm run package:build-check");
  assert.equal(manifest.scripts?.["package:install-smoke"], "node scripts/package-install-smoke.mjs");
  assert.equal(manifest.scripts?.["package:readiness"], "node --import tsx ./src/cli.ts package readiness");
  assert.equal(manifest.scripts?.test, "npm run build && node --import tsx --test tests/**/*.test.ts");
  assert.ok(manifest.files?.includes("dist"));
});
