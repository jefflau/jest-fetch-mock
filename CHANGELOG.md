# Changelog

## 4.0.0-beta.1 (2026-07-08, `next` dist-tag)

The modernization release. Headline: **jest-fetch-mock no longer replaces the global fetch classes with node-fetch implementations.**

### Changed (breaking)

- **Native fetch primitives.** In environments that provide `fetch`/`Response`/`Request`/`Headers` (jest-environment-node has since Jest 28), the mock builds on them and never replaces them — fixing the whole "the global `Response` broke my unrelated test" cluster (#218) and making `instanceof`, streams, `FormData`, and `Response.json()` behave natively. Where the environment has none (jest-environment-jsdom), the cross-fetch fallback engages exactly as before, filling only the missing globals.
- `disableMocks()` restores the environment's original `fetch` (previously it installed cross-fetch's).
- Support floor: **Node ≥ 18, Jest ≥ 28**. The 3.x line remains available for older stacks.
- TypeScript definitions are **self-contained**: no `@types/jest` requirement (works with `@jest/globals`-only setups, #248) and no forced `dom` lib (#201). Ambient `Response`/`Request` types must come from your `lib: ["dom"]` or `@types/node` ≥ 18 — in practice, every Jest project has one of these.
- Relative URL inputs in native mode resolve against `http://localhost/` for matching purposes (the native `Request` requires absolute URLs); jsdom-fallback behavior is unchanged.
- `domexception` dependency removed (native since Node 17).

### Added

- **`createFetchMock(jest)`** factory, also available from the dependency-free entry `jest-fetch-mock/factory` — build an instance with an explicitly-passed jest object, for `injectGlobals: false` / `@jest/globals` setups.
- **`"setupFiles": ["jest-fetch-mock/setup"]`** one-liner setup.
- **`resetMocks: true` auto-re-arm** (#78, #81, #202): when `enableMocks()` runs where `beforeEach` exists (`setupFilesAfterEnv` or a test file), the default implementation is re-armed after Jest's config-driven reset. The years-old footgun is fixed — move your setup file to `setupFilesAfterEnv` to benefit.
- **`AbortSignal.timeout()`** rejections carry the signal's `TimeoutError`; custom abort reasons pass through as-is (#242). Plain aborts keep the historical `AbortError` message.
- **`fetchMock.defaultResponseInit`** — an init merged under every mocked response, e.g. default JSON headers (#166).
- **`fetchMock.realFetch`** — the implementation unmatched requests pass through to, reassignable in tests; **`fetchMock.usingNativeFetch`** tells you which mode engaged.
- ESM wrapper and an `exports` map (with a `./*` escape hatch so deep imports keep working); `url` and `counter` MockParams are patched onto native responses so `response.url`/`response.redirected` mocking still works.

### Unchanged

Every 3.x API call, alias, chaining behavior, once-queue semantics, and the abort error message. The whole 3.x test suite and all seven consumer integration fixtures run green against 4.0.

## 3.2.0 (2026-07-08)

First release since 3.0.3 (March 2020). Everything merged to master in the intervening years ships in this release, plus a round of new fixes. Version 3.1.0 was tagged in 2024 but never published to npm; its contents are included here.

### Added

- Pass a `Response` object directly to `mockResponse`, `mockResponseOnce`, `once`, `mockResponses` and the conditional mocking functions — including responses with binary (`Buffer`) bodies ([#223], thanks [@alexkolson])
- Response functions can return a `Response` object (sync or async)
- `URL` objects (and anything else with a `toString`) accepted as fetch input ([#193])
- Mock `redirected` responses via the `counter` param in response init ([#168])
- Response functions may be synchronous — no need to return a promise ([#145])
- `engines` field declaring the Node >= 12 floor (required by the `domexception` dependency)

### Fixed

- TypeScript definitions no longer import `NodeJS.Global`, which was removed from `@types/node` — types now work with modern `@types/node`/TypeScript setups ([#184], [#201], [#248])
- `dontMockIf`/`dontMockOnceIf` predicates now receive the fully-constructed `Request` (method, headers from the init argument), matching `doMockIf` behavior
- `fetch()` called with an already-aborted signal now rejects (as per the fetch spec) instead of throwing synchronously, so it can be caught with `.catch()` ([#237])
- `fetch.isMocking` returns a plain boolean again after `resetMocks()` ([#183])
- `DOMException` is polyfilled in Node environments, fixing `mockAbort` under `jest-environment-node` ([#159])
- TypeScript: `mockIf`/`doMockIf` callbacks may return synchronously ([#220])

### Changed

- TypeScript: fetch's `input` argument is now required, matching the DOM signature ([#206], [#207])
- `cross-fetch` floor raised to ^3.1.8 (security fixes in transitive `node-fetch`) ([#228], [#249])
- The npm tarball no longer ships tooling configs, workflow files, or type-test files
- npm publishing now happens via GitHub Actions [trusted publishing](https://docs.npmjs.com/trusted-publishers) with provenance
- The `promise-polyfill` dependency was removed — unreachable code on Node ≥ 12, which the `engines` field declares

### Internal

- Test suite grown from 64 to 98 tests with coverage thresholds enforced on every run (99% statements / 98% branches)
- New `integration/` suite: six consumer fixtures (jsdom, React + Testing Library, TypeScript strict, node native-fetch host, Jest 30, and a real-HTTP-server passthrough e2e) run against the packed tarball in CI and gate every release
- Implementation compressed (~10% smaller) with no API changes

[#145]: https://github.com/jefflau/jest-fetch-mock/issues/145
[#159]: https://github.com/jefflau/jest-fetch-mock/issues/159
[#168]: https://github.com/jefflau/jest-fetch-mock/issues/168
[#183]: https://github.com/jefflau/jest-fetch-mock/issues/183
[#184]: https://github.com/jefflau/jest-fetch-mock/issues/184
[#193]: https://github.com/jefflau/jest-fetch-mock/issues/193
[#201]: https://github.com/jefflau/jest-fetch-mock/issues/201
[#206]: https://github.com/jefflau/jest-fetch-mock/issues/206
[#207]: https://github.com/jefflau/jest-fetch-mock/pull/207
[#220]: https://github.com/jefflau/jest-fetch-mock/issues/220
[#223]: https://github.com/jefflau/jest-fetch-mock/pull/223
[#228]: https://github.com/jefflau/jest-fetch-mock/pull/228
[#237]: https://github.com/jefflau/jest-fetch-mock/issues/237
[#248]: https://github.com/jefflau/jest-fetch-mock/issues/248
[#249]: https://github.com/jefflau/jest-fetch-mock/issues/249
[@alexkolson]: https://github.com/alexkolson

## 3.0.3 and earlier

See the [GitHub releases](https://github.com/jefflau/jest-fetch-mock/releases).
