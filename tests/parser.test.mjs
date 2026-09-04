import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createTwilicFastify,
  twilicParser,
  twilicPlugin,
  twilicReply,
} from "../dist/index.js";
import {
  TWILIC_CONTENT_TYPE,
  createJsonCodec,
  createTrackingCodec,
  createTestApp,
  encoder,
  injectJson,
  twilicContentType,
} from "./helpers.mjs";

function createTestTwilic() {
  return createTwilicFastify(createJsonCodec());
}

async function withPlugin(app) {
  await app.register(twilicPlugin);
}

test("twilicParser decodes request body into request.twilicBody", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (request, reply) => {
        return reply.send(request.twilicBody);
      }
    );
  });

  const { statusCode, json } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from(encoder.encode(JSON.stringify({ id: 1, name: "A" }))),
  });

  assert.equal(statusCode, 200);
  assert.deepEqual(json, { id: 1, name: "A" });
});

test("accepts content-type with parameters", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (request, reply) => {
        return reply.send(request.twilicBody);
      }
    );
  });

  const { statusCode, json } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": twilicContentType("charset=utf-8") },
    payload: Buffer.from(encoder.encode(JSON.stringify({ ok: true }))),
  });

  assert.equal(statusCode, 200);
  assert.deepEqual(json, { ok: true });
});

test("returns 415 when content-type is missing", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (_request, reply) => {
        return reply.send("ok");
      }
    );
  });

  const { statusCode, text } = await injectJson(app, {
    method: "POST",
    url: "/users",
    payload: Buffer.from(encoder.encode(JSON.stringify({ id: 1 }))),
  });

  assert.equal(statusCode, 415);
  assert.match(text, /Unsupported Media Type/);
});

test("returns 415 when content-type is not Twilic", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (_request, reply) => {
        return reply.send("ok");
      }
    );
  });

  const { statusCode, text } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": "application/json" },
    payload: Buffer.from(encoder.encode(JSON.stringify({ id: 1 }))),
  });

  assert.equal(statusCode, 415);
  assert.equal(text, "Unsupported Media Type");
});

test("requireContentType false skips validation", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body)
    );
    instance.post(
      "/users",
      { preHandler: twilic.parser({ requireContentType: false }) },
      (request, reply) => reply.send(request.twilicBody)
    );
  });

  const { statusCode, json } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": "application/json" },
    payload: Buffer.from(encoder.encode(JSON.stringify({ ok: true }))),
  });

  assert.equal(statusCode, 200);
  assert.deepEqual(json, { ok: true });
});

test("decodes empty body when content-type is valid", async () => {
  const twilic = createTestTwilic();
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (request, reply) => {
        return reply.send(request.twilicBody ?? null);
      }
    );
  });

  const { statusCode, json } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.alloc(0),
  });

  assert.equal(statusCode, 200);
  assert.equal(json, null);
});

test("uses injected codec decode", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicFastify(codec);
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (request, reply) => {
        return reply.send(request.twilicBody);
      }
    );
  });

  await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from(codec.encode({ tracked: true })),
  });

  assert.equal(codec.stats.decodeCalls, 1);
  assert.ok(codec.stats.lastDecoded instanceof Uint8Array);
});

test("propagates decode errors from codec", async () => {
  const twilic = createTwilicFastify({
    encode: () => new Uint8Array(0),
    decode() {
      throw new Error("decode failed");
    },
  });
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.setErrorHandler((error, _request, reply) => {
      reply.status(500).send(error.message);
    });
    instance.post(
      "/users",
      { preHandler: twilic.parser() },
      (_request, reply) => {
        return reply.send("ok");
      }
    );
  });

  const { statusCode, text } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from([1]),
  });

  assert.equal(statusCode, 500);
  assert.equal(text, "decode failed");
});

test("twilicParser() decodes @twilic/core wire bytes", async () => {
  const { encode } = await import("@twilic/core");
  const app = await createTestApp(async (instance) => {
    await withPlugin(instance);
    instance.post(
      "/users",
      { preHandler: twilicParser() },
      (request, reply) => {
        return twilicReply(reply, { received: request.twilicBody });
      }
    );
  });

  const payload = { id: 1n, label: "core" };
  const { statusCode, buffer } = await injectJson(app, {
    method: "POST",
    url: "/users",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    payload: Buffer.from(encode(payload)),
  });

  assert.equal(statusCode, 200);
  const { decode } = await import("@twilic/core");
  const decoded = decode(buffer);
  assert.equal(decoded.received.id, 1n);
  assert.equal(decoded.received.label, "core");
});
