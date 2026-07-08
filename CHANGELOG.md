# Changelog

## 3.2.0 (unreleased)

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
- `fetch()` called with an already-aborted signal now rejects (as per the fetch spec) instead of throwing synchronously, so it can be caught with `.catch()` ([#237])
- `fetch.isMocking` returns a plain boolean again after `resetMocks()` ([#183])
- `DOMException` is polyfilled in Node environments, fixing `mockAbort` under `jest-environment-node` ([#159])
- TypeScript: `mockIf`/`doMockIf` callbacks may return synchronously ([#220])

### Changed

- TypeScript: fetch's `input` argument is now required, matching the DOM signature ([#206], [#207])
- `cross-fetch` floor raised to ^3.1.8 (security fixes in transitive `node-fetch`) ([#228], [#249])
- The npm tarball no longer ships tooling configs, workflow files, or type-test files
- npm publishing now happens via GitHub Actions [trusted publishing](https://docs.npmjs.com/trusted-publishers) with provenance

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
