import assert from "node:assert/strict";
import test from "node:test";

import {
  playTrackSound,
  renderBellCue,
  resolveDarwinRetroSoundFile,
  resolveTrackSoundOptions,
  soundCueFromEvent,
  soundCueFromSummary,
} from "../src/sound.js";
import type { TrackSummary } from "../src/types.js";

const baseSummary: TrackSummary = {
  activeCheckpointTitle: "Checkpoint",
  activeLapLabel: "Lap 1",
  blockedReason: null,
  currentOwner: "codex",
  health: "green",
  mode: "sprint",
  nextAction: "Next action",
  openFlags: [],
  percentComplete: 50,
  projectName: "Track",
  recentEvents: [],
  title: "Track",
};

test("resolveTrackSoundOptions keeps CLI sound opt-in and disables sound for json", () => {
  assert.deepEqual(resolveTrackSoundOptions([], {}, {}).enabled, false);
  assert.deepEqual(resolveTrackSoundOptions(["status", "--sound"], {}, {}).enabled, true);
  assert.deepEqual(resolveTrackSoundOptions(["status", "--sound"], {}, { json: true }).enabled, false);
  assert.deepEqual(resolveTrackSoundOptions(["status"], { TRACK_SOUND: "1" }, {}).enabled, true);
  assert.deepEqual(resolveTrackSoundOptions(["status", "--no-sound"], { TRACK_SOUND: "1" }, {}).enabled, false);
  assert.equal(resolveTrackSoundOptions(["status", "--sound-theme", "retro"], {}, {}).theme, "retro");
});

test("sound cue selection maps status and mutation events to retro race cues", () => {
  assert.equal(soundCueFromSummary(baseSummary), "green");
  assert.equal(soundCueFromSummary({ ...baseSummary, health: "yellow" }), "yellow");
  assert.equal(soundCueFromSummary({ ...baseSummary, health: "red" }), "red");
  assert.equal(soundCueFromEvent({ type: "task.completed" }, baseSummary), "task-done");
  assert.equal(soundCueFromEvent({ type: "checkpoint.advanced" }, baseSummary), "checkpoint-done");
  assert.equal(soundCueFromEvent({ type: "task.blocked" }, baseSummary), "red");
});

test("playTrackSound uses afplay on macOS when a system sound exists", () => {
  const calls: Array<{ command: string; args: string[]; unref: boolean }> = [];
  const result = playTrackSound("task-done", { enabled: true, mode: "auto", theme: "retro" }, {
    existsSync: () => true,
    platform: "darwin",
    spawn: (command, args) => {
      const call = { command, args, unref: false };
      calls.push(call);
      return {
        unref: () => {
          call.unref = true;
        },
      };
    },
  });

  assert.equal(result.played, true);
  assert.equal(result.method, "afplay");
  assert.equal(calls[0]?.command, "/usr/bin/afplay");
  assert.deepEqual(calls[0]?.args, [resolveDarwinRetroSoundFile("task-done")]);
  assert.equal(calls[0]?.unref, true);
});

test("playTrackSound falls back to terminal bell outside macOS", () => {
  let stderr = "";
  const result = playTrackSound("red", { enabled: true, mode: "auto", theme: "retro" }, {
    platform: "linux",
    stderr: {
      write: (chunk: string) => {
        stderr += chunk;
        return true;
      },
    },
  });

  assert.equal(result.played, true);
  assert.equal(result.method, "bell");
  assert.equal(stderr, renderBellCue("red"));
});
