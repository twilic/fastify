import { decode, encode, type TwilicValue } from "@twilic/core";
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import fp from "fastify-plugin";

import "./types.js";

export const TWILIC_CONTENT_TYPE = "application/vnd.twilic";

export interface TwilicCodec {
  encode: (value: TwilicValue) => Uint8Array;
  decode: (bytes: Uint8Array) => TwilicValue;
}

export interface TwilicParserOptions {
  requireContentType?: boolean;
}

export interface TwilicReplyInit {
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface TwilicPluginOptions {
  codec?: TwilicCodec;
}

export interface TwilicFastify<T = TwilicValue> {
  parse: (request: FastifyRequest) => Promise<T>;
  reply: (
    reply: FastifyReply,
    value: TwilicValue,
    init?: TwilicReplyInit
  ) => FastifyReply;
  parser: (options?: TwilicParserOptions) => preHandlerAsyncHookHandler;
}

function normalizeContentType(
  contentType: string | string[] | undefined
): string | undefined {
  if (Array.isArray(contentType)) {
    return contentType[0];
  }
  return contentType;
}

function hasTwilicContentType(
  contentType: string | string[] | undefined
): boolean {
  return (
    normalizeContentType(contentType)?.startsWith(TWILIC_CONTENT_TYPE) ?? false
  );
}

async function readRequestBody(request: FastifyRequest): Promise<Buffer> {
  if (Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (request.body instanceof Uint8Array) {
    return Buffer.from(request.body);
  }
  if (typeof request.body === "string") {
    return Buffer.from(request.body);
  }
  if (request.body === undefined || request.body === null) {
    return Buffer.alloc(0);
  }
  return Buffer.alloc(0);
}

function parseWithCodec<T>(
  codec: TwilicCodec,
  request: FastifyRequest
): Promise<T> {
  return readRequestBody(request).then(
    (body) => codec.decode(new Uint8Array(body)) as T
  );
}

function replyWithCodec(
  codec: TwilicCodec,
  reply: FastifyReply,
  value: TwilicValue,
  init?: TwilicReplyInit
): FastifyReply {
  const body = Buffer.from(codec.encode(value));
  if (init?.statusCode !== undefined) {
    reply.status(init.statusCode);
  }
  if (init?.headers) {
    for (const [key, headerValue] of Object.entries(init.headers)) {
      reply.header(key, headerValue);
    }
  }
  return reply.type(TWILIC_CONTENT_TYPE).send(body);
}

function parserWithCodec<T>(
  codec: TwilicCodec,
  options?: TwilicParserOptions
): preHandlerAsyncHookHandler {
  const requireContentType = options?.requireContentType ?? true;

  return async (request, reply) => {
    const contentType = request.headers["content-type"];
    if (requireContentType && !hasTwilicContentType(contentType)) {
      return reply.status(415).send("Unsupported Media Type");
    }

    const value = await parseWithCodec<T>(codec, request);
    request.twilicBody = value as TwilicValue;
  };
}

const defaultCodec: TwilicCodec = {
  encode,
  decode,
};

export function createTwilicFastify<T = TwilicValue>(
  codec: TwilicCodec = defaultCodec
): TwilicFastify<T> {
  return {
    parse: (request) => parseWithCodec<T>(codec, request),
    reply: (reply, value, init) => replyWithCodec(codec, reply, value, init),
    parser: (options) => parserWithCodec<T>(codec, options),
  };
}

export function parseTwilic<T = TwilicValue>(
  request: FastifyRequest
): Promise<T> {
  return parseWithCodec<T>(defaultCodec, request);
}

export function twilicReply(
  reply: FastifyReply,
  value: TwilicValue,
  init?: TwilicReplyInit
): FastifyReply {
  return replyWithCodec(defaultCodec, reply, value, init);
}

export function twilicParser<T = TwilicValue>(
  options?: TwilicParserOptions
): preHandlerAsyncHookHandler {
  return parserWithCodec<T>(defaultCodec, options);
}

export const twilicPlugin = fp<TwilicPluginOptions>(
  async (fastify, options = {}) => {
    const codec = options.codec ?? defaultCodec;

    fastify.addContentTypeParser(
      TWILIC_CONTENT_TYPE,
      { parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      }
    );

    fastify.addContentTypeParser(
      /^application\/vnd\.twilic\b/i,
      { parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      }
    );

    fastify.decorateRequest("twilicBody", null);

    fastify.decorateReply(
      "twilic",
      function twilic(
        this: FastifyReply,
        value: TwilicValue,
        init?: TwilicReplyInit
      ) {
        return replyWithCodec(codec, this, value, init);
      }
    );
  },
  {
    name: "@twilic/fastify",
  }
);
