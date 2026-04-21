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
const COURSE_VIEW_ID = "track.course";

interface ControlTask {
  id: string;
  title: string;
  status: string;
  owner: string | null;
  lapTitle: string | null;
  checkpointTitle: string | null;
  isCurrent: boolean;
}

interface ControlAction {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  owner: string | null;
  priority: string;
}

interface ControlSnapshot {
  activeLap: {
    title: string;
    index: number;
    total: number;
    status: string;
  } | null;
  activeCheckpoint: {
    title: string;
    status: string;
  } | null;
  nextActions: ControlAction[];
  summary: unknown;
  tasks: ControlTask[];
}

interface CompanionData {
  control: ControlSnapshot | null;
  snapshot: CompanionSnapshot;
}

interface TrackTreeNode {
  children?: TrackTreeNode[];
  description?: string;
  label: string;
  tooltip?: string;
}

export function activate(context: any): void {
  const controller = new TrackCompanionController(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_COMMAND, () => controller.showPanel()),
    vscode.commands.registerCommand(REFRESH_COMMAND, () => controller.refresh()),
    vscode.window.registerTreeDataProvider(COURSE_VIEW_ID, controller.treeProvider),
    controller
  );

  void controller.start();
}

export function deactivate(): void {}

class TrackCompanionController {
  private panel: any | undefined;
  readonly treeProvider = new TrackCourseTreeProvider();
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
      const data = await loadCompanionData(this.context.extensionPath, repoRoot);
      this.updateStatusBar(data.snapshot);
      this.treeProvider.update(data);
      this.updatePanel(data.snapshot, repoRoot, {
        generatedAt: new Date().toISOString(),
        repoRoot,
        statePath,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatusBar();
      this.treeProvider.update(null, message);
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
    this.statusBar.text = `$(radio-tower) Track ${token} ${snapshot.percentComplete}%`;
    this.statusBar.tooltip = [
      "Track Corner Widget",
      `Signal: ${healthSignal(snapshot.health)}`,
      `Checkpoint: ${snapshot.activeCheckpointTitle}`,
      `Next: ${snapshot.nextAction}`,
      `Owner: ${snapshot.currentOwner}`,
    ].join("\n");
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

class TrackCourseTreeProvider {
  private readonly changeEmitter = new vscode.EventEmitter();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private control: ControlSnapshot | null = null;
  private errorMessage: string | null = null;
  private snapshot: CompanionSnapshot | null = null;

  update(data: CompanionData | null, errorMessage?: string): void {
    this.control = data?.control ?? null;
    this.snapshot = data?.snapshot ?? null;
    this.errorMessage = errorMessage ?? null;
    this.changeEmitter.fire();
  }

  getTreeItem(node: TrackTreeNode): any {
    const collapsibleState =
      node.children && node.children.length > 0
        ? vscode.TreeItemCollapsibleState?.Expanded ?? 2
        : vscode.TreeItemCollapsibleState?.None ?? 0;
    const item = new vscode.TreeItem(node.label, collapsibleState);
    item.description = node.description;
    item.tooltip = node.tooltip ?? node.description ?? node.label;
    return item;
  }

  getChildren(node?: TrackTreeNode): TrackTreeNode[] {
    if (node) {
      return node.children ?? [];
    }
    if (this.errorMessage) {
      return [{ label: "TRACK OFFLINE", description: this.errorMessage }];
    }
    if (!this.snapshot) {
      return [{ label: "TRACK STANDBY", description: "Open a workspace with .track/state.yaml" }];
    }

    const activeLap = this.control?.activeLap;
    const activeCheckpoint = this.control?.activeCheckpoint;
    const tasks = this.control?.tasks ?? [];
    const currentTasks = tasks.filter((task) => task.status !== "done").slice(0, 8);
    const nextActions = this.control?.nextActions?.slice(0, 5) ?? [];
    const signal = healthSignal(this.snapshot.health);

    return [
      {
        label: "SIGNAL",
        description: `${signal} · ${this.snapshot.percentComplete}%`,
        children: [
          { label: "Project", description: this.snapshot.projectName },
          { label: "Lap", description: activeLap ? `${activeLap.title} (${activeLap.index}/${activeLap.total})` : this.snapshot.activeLapLabel },
          { label: "Checkpoint", description: activeCheckpoint?.title ?? this.snapshot.activeCheckpointTitle },
          { label: "Owner", description: this.snapshot.currentOwner },
        ],
      },
      {
        label: "NEXT ACTIONS",
        description: nextActions[0]?.title ?? this.snapshot.nextAction,
        children: nextActions.length
          ? nextActions.map((action) => ({
              label: action.title,
              description: action.owner ?? action.priority,
              tooltip: action.detail ?? action.kind,
            }))
          : [{ label: this.snapshot.nextAction, description: "plan" }],
      },
      {
        label: "TASK BOARD",
        description: currentTasks.length ? `${currentTasks.length} open` : "clear",
        children: currentTasks.length
          ? currentTasks.map((task) => ({
              label: task.title,
              description: `${task.status}${task.owner ? ` · ${task.owner}` : ""}`,
              tooltip: task.checkpointTitle ?? task.lapTitle ?? task.id,
            }))
          : [{ label: "All tracked tasks clear", description: "finish flag" }],
      },
      {
        label: "RECENT",
        description: this.snapshot.recentEvents[0]?.summary ?? "no events",
        children: this.snapshot.recentEvents.map((event) => ({
          label: event.summary,
          description: event.timestamp,
        })),
      },
    ];
  }
}

async function loadCompanionData(extensionPath: string, repoRoot: string): Promise<CompanionData> {
  const control = await loadControlSnapshot(extensionPath, repoRoot);
  if (control) {
    return {
      control,
      snapshot: coerceCompanionSnapshot(control.summary),
    };
  }

  return {
    control: null,
    snapshot: await loadCompanionSnapshot(extensionPath, repoRoot),
  };
}

async function loadControlSnapshot(extensionPath: string, repoRoot: string): Promise<ControlSnapshot | null> {
  const raw = await runTrackCli(extensionPath, repoRoot, ["control", "--json", "--no-color"]);
  if (!raw.trim()) {
    return null;
  }
  const parsed = JSON.parse(raw) as Partial<ControlSnapshot>;
  return {
    activeLap: parsed.activeLap ?? null,
    activeCheckpoint: parsed.activeCheckpoint ?? null,
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
    summary: parsed.summary ?? {},
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
  };
}

async function loadCompanionSnapshot(extensionPath: string, repoRoot: string): Promise<CompanionSnapshot> {
  const stdout = await runTrackCli(extensionPath, repoRoot, ["status", "--json", "--no-color"]);

  if (!stdout.trim()) {
    throw new Error("Track CLI returned no summary output.");
  }

  return coerceCompanionSnapshot(JSON.parse(stdout));
}

async function runTrackCli(extensionPath: string, repoRoot: string, args: string[]): Promise<string> {
  const repoBase = path.resolve(extensionPath, "..");
  const cliPath = path.join(repoBase, "src", "cli.ts");
  const tsxLoaderPath = pathToFileURL(path.join(repoBase, "node_modules", "tsx", "dist", "loader.mjs")).href;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--import", tsxLoaderPath, cliPath, ...args],
    {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
    }
  );

  if (!stdout.trim()) {
    throw new Error(stderr.trim() || "Track CLI returned no summary output.");
  }

  return stdout;
}

function healthSignal(health: CompanionSnapshot["health"]): string {
  if (health === "red") {
    return "RED FLAG";
  }
  if (health === "yellow") {
    return "YELLOW FLAG";
  }
  return "GREEN FLAG";
}
