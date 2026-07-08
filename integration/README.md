# Integration fixtures

Each directory under `fixtures/` is a self-contained consumer project representing a major real-world way this library is used. `run.sh` packs the library (`npm pack`) and installs the tarball into every fixture — the same artifact a user gets from the registry — then runs that fixture's tests.

| Fixture | Replicates |
|---|---|
| `jsdom-js` | Plain JavaScript app tested under `jest-environment-jsdom` (the classic CRA-style setup) |
| `react-jsdom` | React component fetching on mount, asserted with Testing Library — the single biggest consumer cohort |
| `ts-strict` | TypeScript strict mode + ts-jest, type-checked with `skipLibCheck: false` under two tsconfigs: full `@types/node`, and `types: ["jest"]` with no node types at all |
| `node-native` | `jest-environment-node` on a Node ≥18 host where native fetch exists before the mock loads |
| `jest30` | Jest 30 (current major) with `@jest/globals`-style imports |
| `e2e-passthrough` | A real local HTTP server: conditional mocking (`dontMockIf`/`doMockIf`) passing unmatched requests through to actual network sockets, and `disableMocks` restoring real fetch |

Run locally:

```
bash integration/run.sh
```

CI runs this on every PR and push to master (see `.github/workflows/nodejs.yml`). These fixtures gate every release: nothing ships to npm unless all of them pass against the packed tarball.

Fixtures intentionally have no lockfiles — they float on current ecosystem versions so drift breaks here, not in users' projects.
