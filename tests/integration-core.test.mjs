import assert from "node:assert/strict";
import { test } from "node:test";

import { decode, encode } from "@twilic/core";

import {
  TWILIC_CONTENT_TYPE,
  parseTwilic,
  twilicParser,
  twilicPlugin,
  twilicReply,
} from "../dist/index.js";
import { createTestApp, injectJson } from "./helpers.mjs";

test("twilicParser + twilicReply round-trip with @twilic/core", async () => {
  const payload = {
    id: 42n,
    name: "alice",
    active: true,
    tags: ["a", "b"],
  };

  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.post(
      "/users",
      { preHandler: twilicParser() },
      (request, reply) => {
        return twilicReply(reply, { received: request.twilicBody });
      }
    );
  });

  const { statusCode, contentType, buffer } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from(encode(payload)),
  });

  assert.equal(statusCode, 200);
  assert.equal(contentType, TWILIC_CONTENT_TYPE);

  const decoded = decode(buffer);
  assert.equal(decoded.received.id, 42n);
  assert.equal(decoded.received.name, "alice");
  assert.equal(decoded.received.active, true);
  assert.deepEqual(decoded.received.tags, ["a", "b"]);
});

test("parseTwilic decodes @twilic/core wire bytes", async () => {
  const payload = { ok: true, value: 7n };
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.post("/decode", async (request, reply) => {
      return twilicReply(reply, await parseTwilic(request));
    });
  });

  const { buffer } = await injectJson(app, {
    method: "POST",
    url: "/decode",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from(encode(payload)),
  });

  assert.deepEqual(decode(buffer), payload);
});
