import assert from "node:assert/strict";
import test from "node:test";

import { expandCommandAliases } from "../src/aliases.js";

test("expandCommandAliases maps lab to status by default", () => {
  assert.deepEqual(expandCommandAliases(["lab"]), ["status"]);
  assert.deepEqual(expandCommandAliases(["lab", "status", "--color"]), ["status", "--color"]);
  assert.deepEqual(expandCommandAliases(["watch", "--sound"]), ["status", "--watch", "--sound"]);
});

test("expandCommandAliases maps lab subcommands to existing surfaces", () => {
  assert.deepEqual(expandCommandAliases(["lab", "next"]), ["next"]);
  assert.deepEqual(expandCommandAliases(["lab", "map", "--color"]), ["map", "--color"]);
  assert.deepEqual(expandCommandAliases(["lab", "companion"]), ["companion"]);
  assert.deepEqual(expandCommandAliases(["lab", "pitwall", "--root", "/tmp/ws"]), ["pitwall", "--root", "/tmp/ws"]);
  assert.deepEqual(expandCommandAliases(["lab", "owners", "--root", "/tmp/ws"]), ["pitwall", "--owners", "--root", "/tmp/ws"]);
  assert.deepEqual(expandCommandAliases(["lab", "queue"]), ["pitwall", "--queue"]);
  assert.deepEqual(expandCommandAliases(["lab", "detail", "track"]), ["pitwall", "--detail", "track"]);
});
