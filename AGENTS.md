# AGENTS.md — working knowledge for maintainers and coding agents

jest-fetch-mock is a fetch mock for Jest: ~1.4M npm downloads/week. It was dormant 2020–2026 (npm stuck at 3.0.3 while master accumulated fixes) and was revived in July 2026 with the 3.2.0 release. This file captures how the project works and what has been learned, so anyone — human or agent — can continue from here.

## Architecture (4.x)

- `src/createFetchMock.js` — the entire implementation as a pure factory. `resolvePrimitives()` uses the environment's own `fetch/Response/Request/Headers` when **all four** exist (jest-environment-node since Jest 28); otherwise the cross-fetch fallback engages (jest-environment-jsdom). `enableMocks()` **never replaces existing globals** — it only fills gaps in fallback mode. Passthrough goes to `fetch.realFetch` (the captured original; reassignable in tests). Conditional mocking is a second mock fn (`isMocking`) routed through `configureMocking(once, matcher, body, init)`.
- `src/index.js` — the default instance bound to the global `jest` (requires Jest's injected globals at import, like 3.x). `src/factory.js` — dependency-free `createFetchMock` entry for `injectGlobals: false`. `src/setup.js` — `setupFilesAfterEnv` one-liner. `.mjs` wrappers for ESM. `package.json` has an `exports` map with a `./*` escape hatch.
- `types/index.d.ts` — **self-contained**: no `@types/jest` dependency (structural `FetchMockInstance` mirrors the jest-mock surface) and no forced `dom` lib — ambient `Response`/`Request` types come from the consumer's `lib: ["dom"]` or `@types/node` ≥ 18. **Do not reintroduce `import Global = NodeJS.Global` or `/// <reference types="jest" />`.**
- `types/test.ts` — compile-only type assertions, checked by `yarn tsc`.
- Runtime dep: `cross-fetch` only (the jsdom fallback + its passthrough). Floors: Node ≥ 18, Jest ≥ 28. The 3.x line (branch from tag `v3.2.0`) remains for older stacks and keeps the old stomp-the-globals design.

## Commands

- `yarn install && yarn test` — jest (with **enforced coverage thresholds**: 98% statements / 96% branches / 100% functions / 98% lines) + `tsc` (type tests) + `eslint`.
- `bash integration/run.sh` — packs the tarball and runs six consumer fixtures against it (see `integration/README.md`). **This is the release gate.**
- Local publishes are never done; see Releases.

## Releases

1. Update `CHANGELOG.md`, bump `package.json` version in a commit named exactly the version (e.g. `3.2.0`).
2. Tag `v<version>` and push the tag. `.github/workflows/publish.yml` re-runs the suite, verifies tag == package.json version, and publishes via **npm trusted publishing** (OIDC — no tokens anywhere; provenance is automatic). Prerelease tags (any tag containing `-`, e.g. `v3.2.0-beta.2`) go to the `next` dist-tag; stable tags to `latest`.
3. **Write a proper GitHub release for every tag** (mark betas as prereleases). Group changes, link issues/PRs, credit contributors. There were no releases 2019–2026; that must not happen again.
4. Verify after publishing: `npm view jest-fetch-mock dist-tags`, then a clean-room `npm i jest-fetch-mock@<tag>` + smoke test.
5. Gates: integration suite green before tagging; **nothing goes to `latest` without the maintainer's (Jeff Lau) explicit approval**. Betas to `next` may ship autonomously.

npm account notes: the package is npm "high-impact" (mandatory 2FA); avoid account email/2FA changes near release windows — they trigger a 72-hour publishing freeze. Sole owner: `jefflau`.

## Conventions

- Commit messages: plain imperative style ("Fix …", "Add …"), body explains why. **No AI attribution anywhere** — no AI co-author trailers or "generated with" footers in commits, PRs, releases, or issue comments.
- Credit community contributors: when adapting a stale community PR, keep them as `Co-authored-by` and thank them on the PR (e.g. #223 was landed this way after 4.6 years).
- Strict semver. The 3.x line must never break API or behavior except spec-compliance bug fixes (documented in CHANGELOG). Breaking work goes to 4.0.0 behind a beta soak on `next`.
- PRs merge with merge commits (repo convention). CI (unit matrix Node 18/20/22/24 + integration on 20/24) must be green.

## Behavioral subtleties (hard-won; tests pin all of these)

- **`resetMocks: true` in a consumer's Jest config** wipes the mock implementation after setup — fetch resolves `undefined`. Most-reported issue ever (#81, #78, #104, #202). Since 4.0, `enableMocks()` registers a `beforeEach` re-arm hook when one is available (`setupFilesAfterEnv` or test files). The hook must NOT be registered while a test is executing — jest-circus records the violation against the running test even if you catch the throw — hence the `expect.getState().currentTestName` guard (`inRunningTest`). Empirical fact: `mockReset()` does NOT restore the implementation passed to `jest.fn(impl)` on Jest 29 or 30.
- **`DOMException` does not inherit from `Error`** — match abort reasons by `name`, never `instanceof Error`. Node's default abort reason message ("This operation was aborted") differs from the library's historical one ("The operation was aborted. "); the library deliberately keeps its own for plain aborts and passes custom/timeout reasons through.
- Native undici serializes MIME types without the space (`text/csv;charset=utf-8`); node-fetch kept it. Native `Request` requires absolute URLs — relative inputs are resolved against `http://localhost/` in native mode (jsdom fallback unchanged). `MockParams.url`/`counter` are `Object.defineProperty`-patched onto native responses.
- The correct Jest option name is `setupFilesAfterEnv` (a past session kept writing "setupFilesAfterEach" — it does not exist).
- A `Response` passed directly to `mockResponse` is served **as-is**: read-once body, same instance every call. Documented; don't "fix" without a major.
- The once-gate and once-response of `dontMockOnceIf`/`doMockOnceIf` are consumed by the **same** fetch call — a call that evaluates unmocked still consumes a queued once-response silently.
- `fetch()` must **never throw synchronously**: aborted signals and unparseable input surface as rejections (`AbortError` DOMException / TypeError) — fixed in 3.2.0 (#237); the try/catch in `normalizeResponse` is what guarantees it.
- The `__isFallback` branch in `responseWrapper` exists for the whatwg-fetch browser polyfill; under node-fetch, `Response.body` is getter-only so its body assignments silently no-op. Near-dead under Jest; candidate for removal in v4.
- The library calls `jest.fn()` at import time — it cannot load where Jest globals don't exist (`globalSetup`, plain Node scripts).
- The abort error message is `The operation was aborted. ` (node's DOMException wording), not "Aborted!".

## State as of 2026-07-08 and roadmap

- 3.2.0 shipped the 2020–2026 backlog to `latest` (the 3.1.0 version number was deliberately skipped — a stale 2024 git tag exists for it). Publishing it resolved ~10 open issues; the stale/obsolete sweep closed 9 more.
- **4.0.0-beta.1 is on the `next` dist-tag**: the full modernization described under Architecture landed (native primitives, factory entry, setup one-liner, re-arm hook, TimeoutError reasons, `defaultResponseInit`, `realFetch`, exports map, self-contained types, Node ≥18/Jest ≥28 floors, `domexception` dropped). Every 3.x API is unchanged; the 3.x unit suite and all seven integration fixtures pass against 4.0 unmodified (except assertions on node-fetch-specific MIME spacing).
- Toward **4.0.0 stable**: soak the beta on `next`, watch for issue reports, then maintainer sign-off → retag stable. Remaining nice-to-haves for 4.x minors: jsdom-fallback modernization (whatwg-fetch or undici instead of node-fetch 2), Jest 30 `globalsCleanup: 'on'` verification, label sweep of the remaining ~50 open issues against the new architecture (#218 and the native-fetch cluster can close when 4.0 goes stable).
- Dev toolchain migration (eslint flat config, jest 30 as the repo's own runner, TS 6) is queued as deliberate work — Dependabot is configured to in-range updates only.
