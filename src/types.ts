export type TrackHealth = "green" | "yellow" | "red";
export type TrackStatus = "todo" | "doing" | "blocked" | "done";

export interface ProjectInfo {
  id: string;
  name: string;
  mode?: string;
  target_time_hours?: number;
  current_branch?: string;
}

export interface TrackInfo {
  id: string;
  title: string;
  topology?: string;
  total_laps?: number;
  active_lap?: number;
  percent_complete?: number;
  health?: TrackHealth;
  next_action?: string | null;
  blocked_reason?: string | null;
}

export interface Checkpoint {
  id: string;
  title: string;
  status: TrackStatus;
  weight?: number;
}

export interface Lap {
  id: string;
  title: string;
  status: TrackStatus;
  checkpoints?: Checkpoint[];
}

export interface Task {
  id: string;
  title: string;
  lap_id?: string;
  checkpoint_id?: string;
  status: TrackStatus;
  owner?: string | null;
}

export interface Flag {
  id: string;
  level: TrackHealth;
  title: string;
  detail?: string;
  source?: string;
}

export interface TrackEvent {
  id: string;
  type: string;
  actor?: string;
  timestamp?: string;
  summary: string;
}

export interface TrackStateFile {
  version: number;
  project: ProjectInfo;
  track: TrackInfo;
  laps?: Lap[];
  tasks?: Task[];
  flags?: Flag[];
  events?: TrackEvent[];
}

export interface TrackSummary {
  projectName: string;
  mode: string;
  title: string;
  health: TrackHealth;
  percentComplete: number;
  activeLapLabel: string;
  activeCheckpointTitle: string;
  nextAction: string;
  blockedReason: string | null;
  currentOwner: string | null;
  openFlags: Flag[];
  recentEvents: TrackEvent[];
}

export type PitwallStaleState = "fresh" | "aging" | "stale" | "unknown";

export interface PitwallMetrics {
  activeTaskCount: number;
  blockedTaskCount: number;
  lastEventAt: string | null;
  paceDeltaPercent: number | null;
  staleState: PitwallStaleState;
  updateAgeMinutes: number | null;
}

export interface PitwallEntry {
  metrics: PitwallMetrics;
  repoPath: string;
  summary: TrackSummary;
}

export interface PitwallOwnerLoad {
  activeProjects: number;
  activeTasks: number;
  blockedTasks: number;
  checkpoints: string[];
  owner: string;
  repos: string[];
}

export interface PitwallDetail {
  metrics: PitwallMetrics;
  repoPath: string;
  state: TrackStateFile;
  summary: TrackSummary;
  roadmap?: TrackRoadmapFile;
  segments?: TrackSegment[];
}

export interface DifficultyProfile {
  effort?: number;
  uncertainty?: number;
  dependencies?: number;
  coordination?: number;
  risk?: number;
  approvals?: number;
  branch_factor?: number;
}

export interface RoadmapCheckpoint {
  id: string;
  title: string;
  goal?: string;
  kind?: string;
  difficulty?: DifficultyProfile;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  goal?: string;
  kind?: string;
  difficulty?: DifficultyProfile;
  checkpoints?: RoadmapCheckpoint[];
}

export interface TrackRoadmapFile {
  version: number;
  project: ProjectInfo;
  roadmap: {
    phases: RoadmapPhase[];
  };
}

export interface ExternalPlanCheckpoint extends RoadmapCheckpoint {
  owner?: string | null;
  status?: TrackStatus;
  weight?: number;
}

export interface ExternalPlanPhase extends RoadmapPhase {
  status?: TrackStatus;
  checkpoints?: ExternalPlanCheckpoint[];
}

export interface ExternalPlanTask extends Task {
  checkpoint_id: string;
}

export interface ExternalPlanFile {
  version: number;
  project: ProjectInfo;
  plan: {
    id?: string;
    title?: string;
    topology?: string;
    phases: ExternalPlanPhase[];
  };
  source?: {
    kind?: string;
    name?: string;
  };
  tasks?: ExternalPlanTask[];
}

export interface ProjectExternalPlanResult {
  roadmap: TrackRoadmapFile;
  state: TrackStateFile;
}

export type SegmentType =
  | "straight"
  | "sprint"
  | "sweep"
  | "chicane"
  | "hairpin"
  | "climb"
  | "pit"
  | "fork";

export interface TrackSegment {
  id: string;
  phaseId: string;
  checkpointId?: string;
  label: string;
  type: SegmentType;
  difficultyScore: number;
  slopeScore: number;
  paceScore: number;
  progressState: "active" | "done" | "upcoming";
  notes: string[];
}

export interface MutationResult {
  state: TrackStateFile;
  event: TrackEvent;
}
