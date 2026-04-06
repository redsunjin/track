import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module") as {
  _load: (...args: unknown[]) => unknown;
};

const EXAMPLE_PATH = path.resolve("examples", "track-state.example.yaml");

test("VS Code companion host smoke path loads summary and refreshes on state change", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "track-vscode-host-"));
  const trackDir = path.join(tempDir, ".track");
  const statePath = path.join(trackDir, "state.yaml");
  const extensionPath = path.resolve("vscode-extension");
  const yaml = await readFile(EXAMPLE_PATH, "utf8");

  await mkdir(trackDir, { recursive: true });
  await writeFile(statePath, yaml, "utf8");

  const subscriptions: Array<{ dispose: () => void }> = [];
  const commandHandlers = new Map<string, () => unknown | Promise<unknown>>();
  const panels: Array<{
    title: string;
    webview: { html: string };
    reveal: () => void;
    onDidDispose: (callback: () => void) => void;
    dispose: () => void;
  }> = [];
  const watchers: Array<{
    changeCallbacks: Array<() => void>;
    createCallbacks: Array<() => void>;
    deleteCallbacks: Array<() => void>;
    dispose: () => void;
  }> = [];
  const statusBar = {
    command: "",
    dispose: () => undefined,
    show: () => undefined,
    text: "",
    tooltip: "",
  };

  const mockVscode = {
    RelativePattern: class RelativePattern {
      constructor(
        public readonly base: { uri: { fsPath: string } },
        public readonly pattern: string
      ) {}
    },
    StatusBarAlignment: {
      Right: 2,
    },
    ViewColumn: {
      Beside: 2,
    },
    commands: {
      registerCommand: (name: string, handler: () => unknown | Promise<unknown>) => {
        commandHandlers.set(name, handler);
        return { dispose: () => commandHandlers.delete(name) };
      },
    },
    window: {
      createStatusBarItem: () => statusBar,
      createWebviewPanel: (_viewType: string, title: string) => {
        let disposeCallback: (() => void) | undefined;
        const panel = {
          title,
          webview: { html: "" },
          reveal: () => undefined,
          onDidDispose: (callback: () => void) => {
            disposeCallback = callback;
          },
          dispose: () => {
            disposeCallback?.();
          },
        };
        panels.push(panel);
        return panel;
      },
    },
    workspace: {
      createFileSystemWatcher: () => {
        const watcher = {
          changeCallbacks: [] as Array<() => void>,
          createCallbacks: [] as Array<() => void>,
          deleteCallbacks: [] as Array<() => void>,
          dispose: () => undefined,
          onDidChange(callback: () => void) {
            watcher.changeCallbacks.push(callback);
          },
          onDidCreate(callback: () => void) {
            watcher.createCallbacks.push(callback);
          },
          onDidDelete(callback: () => void) {
            watcher.deleteCallbacks.push(callback);
          },
        };
        watchers.push(watcher);
        return watcher;
      },
      workspaceFolders: [
        {
          uri: {
            fsPath: tempDir,
          },
        },
      ],
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request: unknown, parent: unknown, isMain: unknown) {
    if (request === "vscode") {
      return mockVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { activate } = require("../vscode-extension/src/extension.ts") as {
      activate: (context: { extensionPath: string; subscriptions: Array<{ dispose: () => void }> }) => void;
    };

    activate({
      extensionPath,
      subscriptions,
    });

    await waitFor(() => statusBar.text.includes("Track"));
    assert.equal(commandHandlers.has("track.openCompanion"), true);
    assert.equal(commandHandlers.has("track.refreshCompanion"), true);
    assert.equal(watchers.length, 3);
    assert.equal(watchers[0]?.changeCallbacks.length ?? 0, 1);
    assert.match(statusBar.tooltip, /Text dashboard|Lock checkpoint weights and event schema/);

    await commandHandlers.get("track.openCompanion")?.();
    assert.equal(panels.length, 1);
    await waitFor(() => panels[0]?.webview.html.includes("Track Companion"));
    assert.match(panels[0]?.webview.html ?? "", /Track Demo/);

    await writeFile(
      statePath,
      yaml.replace(
        "next_action: Lock checkpoint weights and event schema",
        "next_action: Refresh panel after state update"
      ),
      "utf8"
    );
    await commandHandlers.get("track.refreshCompanion")?.();
    assert.doesNotMatch(String(statusBar.text), /offline/i);
    assert.match(panels[0]?.webview.html ?? "", /Track Companion/);

    for (const disposable of subscriptions) {
      disposable.dispose();
    }
  } finally {
    Module._load = originalLoad;
  }
});

async function waitFor(assertion: () => boolean, timeoutMs = 2_500): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (assertion()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Timed out waiting for extension host state.");
}
