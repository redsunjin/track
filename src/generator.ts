import { createPalette, padLeftVisible, padVisible, visibleLength, type RenderOptions } from "./ansi.js";
import { sanitizeInlineText } from "./security.js";
import type {
  Checkpoint,
  DifficultyProfile,
  RoadmapCheckpoint,
  RoadmapPhase,
  SegmentType,
  TrackRoadmapFile,
  TrackSegment,
  TrackStateFile,
} from "./types.js";

export function generateTrackMap(roadmap: TrackRoadmapFile, state?: TrackStateFile): TrackSegment[] {
  const stateCheckpoints = new Map<string, Checkpoint>();
  for (const lap of state?.laps ?? []) {
    for (const checkpoint of lap.checkpoints ?? []) {
      stateCheckpoints.set(checkpoint.id, checkpoint);
    }
  }

  const segments: TrackSegment[] = [];

  for (const phase of roadmap.roadmap.phases) {
    const checkpoints = phase.checkpoints?.length ? phase.checkpoints : [phaseToCheckpoint(phase)];
    for (const checkpoint of checkpoints) {
      segments.push(buildSegment(phase, checkpoint, stateCheckpoints.get(checkpoint.id)));
    }
  }

  if (!segments.some((segment) => segment.progressState === "active")) {
    const nextUpcoming = segments.find((segment) => segment.progressState === "upcoming");
    if (nextUpcoming) {
      nextUpcoming.progressState = "active";
    }
  }

  return segments;
}

export function renderTrackMap(projectName: string, segments: TrackSegment[], options?: RenderOptions): string {
  const palette = createPalette(options);
  const active = segments.find((segment) => segment.progressState === "active");
  const stats = summarizeCourse(segments);
  const lines = [
    palette.header("TRACK // MAP GENERATOR"),
    palette.divider("------------------------------------------------------------"),
    `PROJECT  ${sanitizeInlineText(projectName, "unknown")}`,
    "MODE     RETRO COURSE BOARD",
    `ACTIVE   ${active ? palette.active(sanitizeInlineText(active.label, active.id)) : palette.muted("none")}`,
    `BOARD    ${palette.success(`${stats.done} done`)}  ${palette.active(`${stats.active} active`)}  ${palette.muted(`${stats.upcoming} upcoming`)}  ${palette.label(`${segments.length} sectors`)}`,
    palette.divider("------------------------------------------------------------"),
    palette.header("COURSE"),
    ...renderCourseRows(segments, palette),
    `LEGEND   ${palette.success("# done")}  ${palette.active("@ active")}  ${palette.muted(". upcoming")}  ${renderTypeLegend(palette)}`,
    palette.divider("------------------------------------------------------------"),
    palette.header("IDX  TYPE      DFF  SLP  PAC  ST   LABEL"),
    palette.divider("------------------------------------------------------------"),
  ];

  for (const [index, segment] of segments.entries()) {
    const typeCell = palette.segment(segment.type, segment.progressState, pad(segment.type.toUpperCase(), 8));
    const stateCell = renderProgressState(segment.progressState, palette);
    const label =
      segment.progressState === "active"
        ? palette.active(sanitizeInlineText(segment.label, segment.id))
        : segment.progressState === "done"
          ? palette.success(sanitizeInlineText(segment.label, segment.id))
          : sanitizeInlineText(segment.label, segment.id);
    lines.push(
      `${padLeftVisible(String(index + 1), 2)}   ${typeCell} ${padLeftVisible(segment.difficultyScore.toFixed(1), 3)}  ${padLeftVisible(
        segment.slopeScore.toFixed(1),
        3
      )}  ${padLeftVisible(segment.paceScore.toFixed(1), 3)}  ${stateCell} ${label}`
    );
    if (segment.notes.length) {
      lines.push(`     NOTES  ${palette.muted(sanitizeInlineText(segment.notes.join(" | "), "No notes"))}`);
    }
  }

  return lines.join("\n");
}

function summarizeCourse(segments: TrackSegment[]): { active: number; done: number; upcoming: number } {
  return {
    active: segments.filter((segment) => segment.progressState === "active").length,
    done: segments.filter((segment) => segment.progressState === "done").length,
    upcoming: segments.filter((segment) => segment.progressState === "upcoming").length,
  };
}

function renderCourseRows(segments: TrackSegment[], palette: ReturnType<typeof createPalette>): string[] {
  const maxWidth = 104;
  const rows: string[] = [];
  let row = `${palette.muted("START")} `;

  for (const [index, segment] of segments.entries()) {
    const token = renderSegmentToken(segment, index + 1, palette);
    const separator = row.trim().length ? " " : "";
    if (visibleLength(row) + visibleLength(separator) + visibleLength(token) > maxWidth) {
      rows.push(row.trimEnd());
      row = "      ";
    }
    row += `${separator}${token}`;
  }

  if (row.trim().length) {
    rows.push(`${row.trimEnd()} ${palette.muted("FINISH")}`);
  }

  return rows.map((line, index) => `${index === 0 ? "TRACK   " : "        "}${line}`);
}

function renderSegmentToken(
  segment: TrackSegment,
  index: number,
  palette: ReturnType<typeof createPalette>
): string {
  const marker = segment.progressState === "active" ? "@" : segment.progressState === "done" ? "#" : ".";
  const sector = String(index).padStart(2, "0");
  return palette.segment(segment.type, segment.progressState, `[${marker}${sector}${glyphForType(segment.type)}]`);
}

function renderTypeLegend(palette: ReturnType<typeof createPalette>): string {
  return [
    palette.segment("sprint", "upcoming", ">>>> sprint"),
    palette.segment("straight", "upcoming", "==== straight"),
    palette.segment("sweep", "upcoming", "~~~~ sweep"),
    palette.segment("chicane", "upcoming", "S//S chicane"),
    palette.segment("climb", "upcoming", "/^^\\ climb"),
    palette.segment("fork", "upcoming", "Y--Y fork"),
  ].join("  ");
}

function renderProgressState(
  progressState: "active" | "done" | "upcoming",
  palette: ReturnType<typeof createPalette>
): string {
  if (progressState === "active") {
    return palette.active(padVisible("ACTIVE", 7));
  }
  if (progressState === "done") {
    return palette.success(padVisible("DONE", 7));
  }
  return palette.muted(padVisible("UPCOMING", 7));
}

function buildSegment(
  phase: RoadmapPhase,
  checkpoint: RoadmapCheckpoint,
  stateCheckpoint?: Checkpoint
): TrackSegment {
  const difficulty = mergeDifficulty(phase.difficulty, checkpoint.difficulty, checkpoint.kind ?? phase.kind);
  const difficultyScore = computeDifficultyScore(difficulty);
  const slopeScore = computeSlopeScore(difficulty);
  const paceScore = computePaceScore(difficulty);
  const type = selectSegmentType(difficulty, difficultyScore, slopeScore, paceScore, checkpoint.kind ?? phase.kind);
  const progressState = deriveProgressState(stateCheckpoint?.status);

  return {
    id: checkpoint.id,
    phaseId: phase.id,
    checkpointId: checkpoint.id,
    label: checkpoint.title,
    type,
    difficultyScore,
    slopeScore,
    paceScore,
    progressState,
    notes: buildNotes(difficulty, type, checkpoint.kind ?? phase.kind),
  };
}

function phaseToCheckpoint(phase: RoadmapPhase): RoadmapCheckpoint {
  return {
    id: phase.id,
    title: phase.title,
    goal: phase.goal,
    kind: phase.kind,
    difficulty: phase.difficulty,
  };
}

function mergeDifficulty(
  phaseDifficulty: DifficultyProfile | undefined,
  checkpointDifficulty: DifficultyProfile | undefined,
  kind?: string
): Required<DifficultyProfile> {
  const base: Required<DifficultyProfile> = {
    effort: 2,
    uncertainty: 1,
    dependencies: 1,
    coordination: 1,
    risk: 1,
    approvals: 0,
    branch_factor: 0,
  };

  const merged = {
    ...base,
    ...phaseDifficulty,
    ...checkpointDifficulty,
  };

  applyKindBias(merged, kind);
  return merged;
}

function applyKindBias(profile: Required<DifficultyProfile>, kind?: string): void {
  switch (kind) {
    case "integration":
      profile.dependencies = clampScale(profile.dependencies + 1);
      profile.coordination = clampScale(profile.coordination + 1);
      break;
    case "research":
      profile.uncertainty = clampScale(profile.uncertainty + 1);
      profile.risk = clampScale(profile.risk + 1);
      break;
    case "qa":
      profile.approvals = clampScale(profile.approvals + 1);
      break;
    case "release":
      profile.approvals = clampScale(profile.approvals + 2);
      profile.risk = clampScale(profile.risk + 2);
      break;
    case "migration":
      profile.dependencies = clampScale(profile.dependencies + 1);
      profile.risk = clampScale(profile.risk + 2);
      break;
    default:
      break;
  }
}

function computeDifficultyScore(profile: Required<DifficultyProfile>): number {
  return round1(
    profile.effort * 0.28 +
      profile.uncertainty * 0.2 +
      profile.dependencies * 0.16 +
      profile.coordination * 0.14 +
      profile.risk * 0.14 +
      profile.approvals * 0.05 +
      profile.branch_factor * 0.03
  );
}

function computeSlopeScore(profile: Required<DifficultyProfile>): number {
  return round1(
    profile.uncertainty * 0.34 +
      profile.dependencies * 0.22 +
      profile.risk * 0.2 +
      profile.approvals * 0.14 +
      profile.coordination * 0.1
  );
}

function computePaceScore(profile: Required<DifficultyProfile>): number {
  return round1(
    6 -
      (profile.effort * 0.35 +
        profile.uncertainty * 0.25 +
        profile.dependencies * 0.2 +
        profile.coordination * 0.1 +
        profile.risk * 0.1)
  );
}

function selectSegmentType(
  profile: Required<DifficultyProfile>,
  difficultyScore: number,
  slopeScore: number,
  paceScore: number,
  kind?: string
): SegmentType {
  if (profile.approvals >= 4 || kind === "release") {
    return "pit";
  }
  if (profile.branch_factor >= 2) {
    return "fork";
  }
  if (slopeScore >= 3.3) {
    return "climb";
  }
  if (difficultyScore >= 3.8) {
    return "hairpin";
  }
  if (difficultyScore >= 3) {
    return "chicane";
  }
  if (difficultyScore >= 2.2) {
    return "sweep";
  }
  if (paceScore >= 3.8) {
    return "sprint";
  }
  return "straight";
}

function deriveProgressState(status?: string): "active" | "done" | "upcoming" {
  if (status === "doing" || status === "blocked") {
    return "active";
  }
  if (status === "done") {
    return "done";
  }
  return "upcoming";
}

function buildNotes(
  profile: Required<DifficultyProfile>,
  type: SegmentType,
  kind?: string
): string[] {
  const notes: string[] = [`kind:${kind ?? "build"}`];
  if (type === "climb") {
    notes.push("steep uncertainty or dependency load");
  }
  if (type === "hairpin") {
    notes.push("tight high-difficulty turn");
  }
  if (type === "pit") {
    notes.push("approval or release gate");
  }
  if (type === "fork") {
    notes.push("branching or multi-path delivery");
  }
  if (profile.approvals > 0) {
    notes.push(`approvals:${profile.approvals}`);
  }
  if (profile.branch_factor > 0) {
    notes.push(`branches:${profile.branch_factor}`);
  }
  return notes;
}

function glyphForType(type: SegmentType): string {
  switch (type) {
    case "straight":
      return "====";
    case "sprint":
      return ">>>>";
    case "sweep":
      return "~~~~";
    case "chicane":
      return "S//S";
    case "hairpin":
      return "U--U";
    case "climb":
      return "/^^\\";
    case "pit":
      return "|PP|";
    case "fork":
      return "Y--Y";
  }
}

function clampScale(value: number): number {
  return Math.max(0, Math.min(5, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${" ".repeat(width - value.length)}${value}`;
}
