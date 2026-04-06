import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import vscode = require("vscode");

import { coerceCompanionSnapshot, renderCompanionDocument, type CompanionSnapshot } from "./companion-view";

const execFileAsync = promisify(execFile);

const OPEN_COMMAND = "track.openCompanion";
const REFRESH_COMMAND = "track.refreshCompanion";
const PANEL_TYPE = "track.companion";

export function activate(context: any): void {
  const controller = new TrackCompanionController(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_COMMAND, () => controller.showPanel()),
    vscode.commands.registerCommand(REFRESH_COMMAND, () => controller.refresh()),
    controller
  );

  void controller.start();
}

export function deactivate(): void {}

class TrackCompanionController {
  private panel: any | undefined;
  private readonly statusBar: any;
  private readonly watchers: any[] = [];

  constructor(private readonly context: any) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBar.command = OPEN_COMMAND;
    this.statusBar.tooltip = "Open Track Companion";
  }

  async start(): Promise<void> {
    this.statusBar.show();
    this.watchWorkspace();
    await this.refresh();
  }

  dispose(): void {
    this.statusBar.dispose();
    this.panel?.dispose();
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
  }

  async showPanel(): Promise<void> {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(PANEL_TYPE, "Track Companion", vscode.ViewColumn.Beside, {
        enableScripts: false,
        retainContextWhenHidden: true,
      });

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside);
    }

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const repoRoot = this.getWorkspaceRoot();
    const statePath = repoRoot ? path.join(repoRoot, ".track", "state.yaml") : ".track/state.yaml";

    if (!repoRoot) {
      this.updateStatusBar();
      this.updatePanel(
        null,
        undefined,
        {
          generatedAt: new Date().toISOString(),
          repoRoot: "No workspace folder",
          statePath,
          errorMessage: "Open a Track workspace folder to load companion data.",
        }
      );
      return;
    }

    try {
      const snapshot = await loadCompanionSnapshot(this.context.extensionPath, repoRoot);
      this.updateStatusBar(snapshot);
      this.updatePanel(snapshot, repoRoot, {
        generatedAt: new Date().toISOString(),
        repoRoot,
        statePath,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatusBar();
      this.updatePanel(
        null,
        repoRoot,
        {
          generatedAt: new Date().toISOString(),
          repoRoot,
          statePath,
          errorMessage: message,
        }
      );
    }
  }

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  }

  private watchWorkspace(): void {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return;
    }

    for (const pattern of [".track/state.yaml", ".track/state.yml", ".track/state.json"]) {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, pattern));
      watcher.onDidChange(() => {
        void this.refresh();
      });
      watcher.onDidCreate(() => {
        void this.refresh();
      });
      watcher.onDidDelete(() => {
        void this.refresh();
      });
      this.watchers.push(watcher);
    }
  }

  private updateStatusBar(snapshot?: CompanionSnapshot): void {
    if (!snapshot) {
      this.statusBar.text = "$(warning) Track offline";
      this.statusBar.tooltip = "Track companion could not load workspace summary.";
      return;
    }

    const token = snapshot.health === "red" ? "RED" : snapshot.health === "yellow" ? "YEL" : "GRN";
    this.statusBar.text = `$(pulse) Track ${snapshot.percentComplete}% ${token}`;
    this.statusBar.tooltip = `${snapshot.activeCheckpointTitle} · ${snapshot.nextAction}`;
  }

  private updatePanel(
    snapshot: CompanionSnapshot | null,
    repoRoot: string | undefined,
    options: {
      generatedAt: string;
      repoRoot: string;
      statePath: string;
      errorMessage?: string;
    }
  ): void {
    if (!this.panel) {
      return;
    }

    this.panel.title = snapshot ? `Track Companion // ${snapshot.projectName}` : "Track Companion";
    this.panel.webview.html = renderCompanionDocument(snapshot, {
      errorMessage: options.errorMessage,
      generatedAt: options.generatedAt,
      repoRoot: options.repoRoot,
      statePath: options.statePath,
    });
  }
}

async function loadCompanionSnapshot(extensionPath: string, repoRoot: string): Promise<CompanionSnapshot> {
  const repoBase = path.resolve(extensionPath, "..");
  const cliPath = path.join(repoBase, "src", "cli.ts");
  const tsxLoaderPath = pathToFileURL(path.join(repoBase, "node_modules", "tsx", "dist", "loader.mjs")).href;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--import", tsxLoaderPath, cliPath, "status", "--json", "--no-color"],
    {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
    }
  );

  if (!stdout.trim()) {
    throw new Error(stderr.trim() || "Track CLI returned no summary output.");
  }

  return coerceCompanionSnapshot(JSON.parse(stdout));
}
