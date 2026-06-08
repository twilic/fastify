import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TWILIC_CONTENT_TYPE,
  createTwilicFastify,
  parseTwilic,
  twilicParser,
  twilicPlugin,
  twilicReply,
} from "../dist/index.js";

test("TWILIC_CONTENT_TYPE is application/vnd.twilic", () => {
  assert.equal(TWILIC_CONTENT_TYPE, "application/vnd.twilic");
});

test("named exports are functions", () => {
  assert.equal(typeof createTwilicFastify, "function");
  assert.equal(typeof parseTwilic, "function");
  assert.equal(typeof twilicParser, "function");
  assert.equal(typeof twilicReply, "function");
  assert.equal(typeof twilicPlugin, "function");
});

test("createTwilicFastify returns parse, reply, and parser", () => {
  const twilic = createTwilicFastify();
  assert.equal(typeof twilic.parse, "function");
  assert.equal(typeof twilic.reply, "function");
  assert.equal(typeof twilic.parser, "function");
});
