import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { normalizeTrackLanguage, resolveTrackLanguage } from "../src/i18n.js";
import { renderNext, renderStatus } from "../src/render.js";
import { loadTrackState } from "../src/state.js";
import { summarizeTrack } from "../src/summary.js";

test("language helpers accept English and Korean aliases", () => {
  assert.equal(normalizeTrackLanguage("en"), "en");
  assert.equal(normalizeTrackLanguage("english"), "en");
  assert.equal(normalizeTrackLanguage("ko"), "ko");
  assert.equal(normalizeTrackLanguage("ko_KR"), "ko");
  assert.equal(resolveTrackLanguage(undefined, { TRACK_LANG: "ko" }), "ko");
  assert.throws(() => normalizeTrackLanguage("fr"), /--lang/);
});

test("status and next renderers support Korean labels", async () => {
  const state = await loadTrackState(path.resolve("."), ".track/state.yaml");
  const summary = summarizeTrack(state);
  const status = renderStatus(summary, { color: false, lang: "ko" });
  const next = renderNext(summary, { color: false, lang: "ko" });

  assert.match(status, /TRACK \/\/ 드라이버 HUD/);
  assert.match(status, /신호/);
  assert.match(status, /그린 플래그/);
  assert.match(status, /프로젝트/);
  assert.match(next, /TRACK \/\/ 다음 작업/);
  assert.match(next, /다음/);
});
