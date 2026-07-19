# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-07-20

### Fixed

- Ship Fastify `twilicBody` / `reply.twilic()` TypeScript augmentations in the published package.

## [0.1.1] - 2026-06-08

Initial public release of `@twilic/fastify`. Version 0.1.0 was published locally without npm trusted publishing and is not part of the canonical release line.

### Added

- `TWILIC_CONTENT_TYPE` (`application/vnd.twilic`) constant.
- `parseTwilic(request)` helper to decode Twilic request bodies.
- `twilicReply(reply, value, init?)` helper to return Twilic-encoded responses.
- `twilicParser(options?)` preHandler hook that sets `request.twilicBody`.
- `twilicPlugin` Fastify plugin with content-type parser and `reply.twilic()` decorator.
- `createTwilicFastify(codec?)` factory for injectable encode/decode.
- Node integration tests with Fastify `inject()`.
- CI workflows for format, lint, typecheck, tests, commitlint, and PR body validation.
- npm publish workflow with [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/).
