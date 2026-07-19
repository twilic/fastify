# @twilic/fastify

Fastify plugin and helpers for Twilic binary request and response bodies.

## Install

```bash
pnpm add @twilic/fastify fastify @twilic/core
```

## Usage

```ts
import Fastify from "fastify";
import { twilicParser, twilicPlugin, twilicReply } from "@twilic/fastify";

const app = Fastify();

await app.register(twilicPlugin);

app.post("/users", { preHandler: twilicParser() }, (request, reply) => {
  return twilicReply(reply, { ok: true, received: request.twilicBody });
});

// or use the reply decorator:
app.get("/ping", (_request, reply) => reply.twilic({ pong: true }));
```

## API

- `TWILIC_CONTENT_TYPE`
- `parseTwilic(request)`
- `twilicReply(reply, value, init?)`
- `twilicParser(options?)`
- `twilicPlugin`
- `createTwilicFastify(codec?)`

## Runnable example

```bash
pnpm example:http-roundtrip:fastify  # Fastify server (in twilic/examples)
pnpm example:http-roundtrip:client
```

See [`http-roundtrip/`](https://github.com/twilic/examples/tree/main/http-roundtrip).

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Publish to npm

The package ships build artifacts from `dist/`.

Local dry run:

```bash
pnpm build
pnpm pack
```

GitHub Actions publish uses [npm trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/)—no long-lived `NPM_TOKEN` secret.

One-time setup on [npmjs.com](https://www.npmjs.com/package/@twilic/fastify): open the package → **Settings** → **Trusted Publisher** → **GitHub Actions**, then set **Organization or user** `twilic`, **Repository** `fastify`, and **Workflow filename** `publish-npm.yml` (exact name, including `.yml`). See also [GitHub Actions OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect).

Release steps:

1. Update [docs/CHANGELOG.md](docs/CHANGELOG.md) and bump `version` in `package.json`.
2. Create and push matching tag `v<version>`.

Example:

```bash
git tag v0.1.1
git push origin v0.1.1
```

The workflow `.github/workflows/publish-npm.yml` verifies tag/version match, runs tests, and then runs `npm publish` (OIDC authentication via `id-token: write`).

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
