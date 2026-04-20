import type { DifficultyProfile, ProjectInfo, TrackStatus } from "./types.js";

export interface IntermediateRoadmapSchema {
  version: number;
  project: ProjectInfo;
  phases: IntermediatePhase[];
  tasks?: IntermediateTask[];
  metadata?: Record<string, unknown>;
}

export interface IntermediatePhase {
  id: string;
  title: string;
  goal?: string;
  kind?: string;
  difficulty?: DifficultyProfile;
  checkpoints?: IntermediateCheckpoint[];
}

export interface IntermediateCheckpoint {
  id: string;
  title: string;
  goal?: string;
  kind?: string;
  difficulty?: DifficultyProfile;
  status?: TrackStatus;
  weight?: number;
}

export interface IntermediateTask {
  id: string;
  title: string;
  phase_id?: string;
  checkpoint_id?: string;
  status?: TrackStatus;
  owner?: string | null;
}
