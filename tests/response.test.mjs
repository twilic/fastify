import { test } from "node:test";
import assert from "node:assert/strict";
import { decode } from "@twilic/core";
import {
  createTwilicFastify,
  twilicPlugin,
  twilicReply,
} from "../dist/index.js";
import {
  TWILIC_CONTENT_TYPE,
  assertTwilicResponse,
  createJsonCodec,
  createTrackingCodec,
  createTestApp,
  decoder,
  injectJson,
} from "./helpers.mjs";

test("twilicReply sets status, content-type, and custom headers", async () => {
  const twilic = createTwilicFastify(createJsonCodec());
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.get("/users", (_request, reply) => {
      return twilic.reply(
        reply,
        { ok: true },
        {
          statusCode: 201,
          headers: { "x-id": "1" },
        },
      );
    });
  });

  const result = await injectJson(app, { method: "GET", url: "/users" });
  assertTwilicResponse(result, 201);
  assert.equal(result.response.headers["x-id"], "1");
  assert.deepEqual(JSON.parse(decoder.decode(result.buffer)), { ok: true });
});

test("twilicReply encodes with @twilic/core", async () => {
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.get("/users", (_request, reply) =>
      twilicReply(reply, { ok: true, n: 1n }),
    );
  });

  const result = await injectJson(app, { method: "GET", url: "/users" });
  assertTwilicResponse(result);
  assert.deepEqual(decode(result.buffer), { ok: true, n: 1n });
});

test("reply.twilic decorator uses plugin codec", async () => {
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.get("/users", (_request, reply) =>
      reply.twilic({ via: "decorator" }),
    );
  });

  const result = await injectJson(app, { method: "GET", url: "/users" });
  assertTwilicResponse(result);
  assert.deepEqual(decode(result.buffer), { via: "decorator" });
});

test("twilicReply overwrites caller content-type with Twilic", async () => {
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.get("/users", (_request, reply) =>
      twilicReply(
        reply,
        { ok: true },
        { headers: { "content-type": "application/json" } },
      ),
    );
  });

  const result = await injectJson(app, { method: "GET", url: "/users" });
  assert.equal(result.contentType, TWILIC_CONTENT_TYPE);
});

test("createTwilicFastify().reply uses injected codec", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicFastify(codec);
  const app = await createTestApp(async (instance) => {
    await instance.register(twilicPlugin);
    instance.get("/x", (_request, reply) =>
      twilic.reply(reply, { via: "factory" }),
    );
  });

  await injectJson(app, { method: "GET", url: "/x" });
  assert.equal(codec.stats.encodeCalls, 1);
});
