import type { TwilicValue } from "@twilic/core";
import "fastify";

export interface TwilicReplyInit {
  statusCode?: number;
  headers?: Record<string, string>;
}

declare module "fastify" {
  interface FastifyRequest {
    twilicBody?: TwilicValue;
  }

  interface FastifyReply {
    twilic(value: TwilicValue, init?: TwilicReplyInit): FastifyReply;
  }
}
