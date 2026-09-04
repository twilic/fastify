import assert from "node:assert/strict";

import Fastify from "fastify";

import { TWILIC_CONTENT_TYPE } from "../dist/index.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export { encoder, decoder, TWILIC_CONTENT_TYPE };

export function createJsonCodec() {
  return {
    encode(value) {
      return encoder.encode(JSON.stringify(value));
    },
    decode(bytes) {
      if (bytes.length === 0) {
        return null;
      }
      return JSON.parse(decoder.decode(bytes));
    },
  };
}

export function createTrackingCodec(inner = createJsonCodec()) {
  const stats = {
    encodeCalls: 0,
    decodeCalls: 0,
    lastEncoded: null,
    lastDecoded: null,
  };
  return {
    stats,
    encode(value) {
      stats.encodeCalls += 1;
      stats.lastEncoded = value;
      return inner.encode(value);
    },
    decode(bytes) {
      stats.decodeCalls += 1;
      stats.lastDecoded = bytes;
      return inner.decode(bytes);
    },
  };
}

export function twilicContentType(extra = "") {
  return extra ? `${TWILIC_CONTENT_TYPE}; ${extra}` : TWILIC_CONTENT_TYPE;
}

export async function createTestApp(register) {
  const app = Fastify({ logger: false });
  await register(app);
  return app;
}

export async function injectJson(app, options) {
  const response = await app.inject(options);
  const contentType = response.headers["content-type"] ?? "";
  const isJson = contentType.includes("application/json");
  const isTwilic = contentType.startsWith(TWILIC_CONTENT_TYPE);
  const buffer = Buffer.isBuffer(response.rawPayload)
    ? response.rawPayload
    : Buffer.from(response.payload ?? "");
  const text = buffer.toString("utf8");
  return {
    response,
    statusCode: response.statusCode,
    contentType,
    text,
    buffer,
    json: isJson && !isTwilic && text ? JSON.parse(text) : undefined,
  };
}

export function assertTwilicResponse(result, expectedStatus = 200) {
  assert.equal(result.statusCode, expectedStatus);
  assert.equal(result.contentType, TWILIC_CONTENT_TYPE);
}
