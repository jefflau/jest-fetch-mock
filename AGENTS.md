# AGENTS.md — working knowledge for maintainers and coding agents

jest-fetch-mock is a fetch mock for Jest: ~1.4M npm downloads/week. It was dormant 2020–2026 (npm stuck at 3.0.3 while master accumulated fixes) and was revived in July 2026 with the 3.2.0 release. This file captures how the project works and what has been learned, so anyone — human or agent — can continue from here.

## Architecture

- `src/index.js` — the entire implementation, single CommonJS file, ~250 lines. On require it assigns `global.fetch/Response/Headers/Request` from **cross-fetch** (node-fetch 2 under Node) and wraps fetch in a `jest.fn()`. Conditional mocking is a second `jest.fn()` (`isMocking`) whose implementation decides mock vs. passthrough per call; all eight conditional functions route through `configureMocking(once, matcher, body, init)`.
- `types/index.d.ts` — hand-written definitions. They depend on the global `jest` namespace (consumers need `@types/jest`) and `/// <reference lib="dom" />`. **Do not reintroduce `import Global = NodeJS.Global`** — it was removed from `@types/node` and broke consumers for years.
- `types/test.ts` — compile-only type assertions, checked by `yarn tsc`.
- Runtime deps: `cross-fetch` (the fetch implementation + passthrough target) and `domexception` (only needed on Node < 17; engines floor is Node 12). `promise-polyfill` was removed as dead code.

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

- **`resetMocks: true` in a consumer's Jest config** wipes the mock implementation after setup — fetch resolves `undefined`. Most-reported issue ever (#81, #78, #104, #202). Docs carry a prominent warning; v4 plans auto-re-arming.
- A `Response` passed directly to `mockResponse` is served **as-is**: read-once body, same instance every call. Documented; don't "fix" without a major.
- The once-gate and once-response of `dontMockOnceIf`/`doMockOnceIf` are consumed by the **same** fetch call — a call that evaluates unmocked still consumes a queued once-response silently.
- `fetch()` must **never throw synchronously**: aborted signals and unparseable input surface as rejections (`AbortError` DOMException / TypeError) — fixed in 3.2.0 (#237); the try/catch in `normalizeResponse` is what guarantees it.
- The `__isFallback` branch in `responseWrapper` exists for the whatwg-fetch browser polyfill; under node-fetch, `Response.body` is getter-only so its body assignments silently no-op. Near-dead under Jest; candidate for removal in v4.
- The library calls `jest.fn()` at import time — it cannot load where Jest globals don't exist (`globalSetup`, plain Node scripts).
- The abort error message is `The operation was aborted. ` (node's DOMException wording), not "Aborted!".

## State as of 2026-07-08 and roadmap

- 3.2.0 shipped the 2020–2026 backlog (the 3.1.0 version number was deliberately skipped — a stale 2024 git tag exists for it). Publishing it resolved ~10 open issues (#231, #252, #249, #201, #206, #109, #220, #95, #94...).
- Issue tracker: obsolete/stale issues to close are listed in the tracker sweep (#4, #85, #62, #130, #161, #177, #155, #224, #104). Big open themes: Node native fetch conflicts (#218 is the key issue — the global overwrite breaks unrelated tests), feature requests (#166 default headers is most-wanted, #242 TimeoutError).
- **v4.0.0 roadmap** (breaking, beta-soaked, API-compatible where possible): use the environment's native fetch primitives instead of stomping globals (jsdom still has no fetch in 2026 — keep a ponyfill fallback there); accept an injected mock factory (`createFetchMock(jest)`-style, fixes `injectGlobals: false`); dual CJS+ESM with an `exports` map including a `./*` escape hatch; self-contained types that don't force `lib: ["dom"]` or `@types/jest`; drop `domexception`; floor Node ≥18 / Jest ≥28; auto-re-arm after `resetMocks: true`; `AbortSignal.timeout()` → `TimeoutError`; global default response headers. Borrow from vitest-fetch-mock v0.4 (MIT fork of this repo, zero-dep TS rewrite) — but stay dual-format, not ESM-only.
