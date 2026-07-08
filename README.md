# Jest Fetch Mock

![npm version](https://img.shields.io/npm/v/jest-fetch-mock)
![npm downloads](https://img.shields.io/npm/dw/jest-fetch-mock)
![Node.js CI](https://github.com/jefflau/jest-fetch-mock/actions/workflows/nodejs.yml/badge.svg)

Fetch is the canonical way to do HTTP requests in the browser, and it can be used in other environments such as Node.js and React Native. Jest Fetch Mock allows you to easily mock your `fetch` calls and return the response you need to fake the HTTP requests. It's easy to set up and you don't need a library like `nock` to get going, and it uses Jest's built-in support for mocking under the surface. This means that any of the `jest.fn()` methods are also available. For more information on the Jest mock API, check the docs [here](https://jestjs.io/docs/mock-functions).

It currently works by mocking the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) polyfill, so it supports Node.js and any browser-like runtime.

> **Using Vitest?** Use the actively maintained fork [`vitest-fetch-mock`](https://github.com/IanVS/vitest-fetch-mock) instead.
>
> **Need to mock a whole API surface** (handlers per route, shared between tests and dev)? Consider [MSW](https://mswjs.io/). Jest Fetch Mock is deliberately smaller: a drop-in `jest.fn()` for `fetch`.

## Contents

- [Usage](#usage)
  - [Installation and Setup](#package-installation)
  - [Using with TypeScript](#using-with-typescript)
  - [Using with Create-React-App](#using-with-create-react-app)
  - [A note on Node's built-in fetch](#a-note-on-nodes-built-in-fetch)
  - [Migrating from 3.x](#migrating-from-3x)
- [API](#api)
- [Examples](#examples)
  - [Simple mock and assert](#simple-mock-and-assert)
  - [Mocking all fetches](#mocking-all-fetches)
  - [Mocking a failed fetch](#mocking-a-failed-fetch)
  - [Mocking aborted fetches](#mocking-aborted-fetches)
  - [Mocking a redirected response](#mocking-a-redirected-response)
  - [Mocking multiple fetches with different responses](#mocking-multiple-fetches-with-different-responses)
  - [Mocking multiple fetches with `fetch.mockResponses`](#mocking-multiple-fetches-with-fetchmockresponses)
  - [Reset mocks between tests with `fetch.resetMocks`](#reset-mocks-between-tests-with-fetchresetmocks)
  - [Using `fetch.mock` to inspect the mock state of each fetch call](#using-fetchmock-to-inspect-the-mock-state-of-each-fetch-call)
  - [Using functions to mock slow servers](#using-functions-to-mock-slow-servers)
- [Conditional Mocking](#conditional-mocking)
- [Recipes and common gotchas](#recipes-and-common-gotchas)
- [Changelog](./CHANGELOG.md)

## Usage

### Package Installation

To setup your fetch mock you need to do the following things:

```
$ npm install --save-dev jest-fetch-mock
```

Create a `setupJest.js` file (or add to an existing setup file) to set up the mock:

```js
//setupJest.js or similar file
require('jest-fetch-mock').enableMocks()
```

Add the setup file to your Jest config in `package.json`:

```JSON
"jest": {
  "automock": false,
  "resetMocks": false,
  "setupFiles": [
    "./setupJest.js"
  ]
}
```

With this done, you'll have `fetch` and `fetchMock` available on the global scope. Fetch will be used as usual by your code and you'll use `fetchMock` in your tests.

> ⚠️ **The `resetMocks` gotcha — read this if `fetch()` mysteriously returns `undefined`.**
>
> If your Jest config sets `resetMocks: true` (Create React App does this by default since CRA 4.0.1), Jest wipes the mock's implementation before every test — after your setup file ran. `fetch` is then an empty `jest.fn()` and every call resolves to `undefined`.
>
> Fix either by setting `"resetMocks": false` in your Jest config (as shown above), or by re-enabling the mock before each test:
>
> ```js
> beforeEach(() => {
>   fetchMock.enableMocks() // or: fetch.resetMocks()
> })
> ```
>
> This is the single most-reported issue with this library (#81, #78, #104, #202).

#### Default not mocked

If you would like to have the `fetchMock` available in all tests but not enabled, add `fetchMock.dontMock()` after the `...enableMocks()` line in `setupJest.js`:

```js
// adds the 'fetchMock' global variable and rewires 'fetch' global to call 'fetchMock' instead of the real implementation
require('jest-fetch-mock').enableMocks()
// changes default behavior of fetchMock to use the real 'fetch' implementation and not mock responses
fetchMock.dontMock()
```

If you want a single test file to return to the default behavior of mocking all responses, add the following to the test file:

```js
beforeEach(() => {
  // if you have an existing `beforeEach` just add the following line to it
  fetchMock.doMock()
})
```

To enable mocking for specific URLs only:

```js
beforeEach(() => {
  // if you have an existing `beforeEach` just add the following lines to it
  fetchMock.mockIf(/^https?:\/\/example.com.*$/, async (req) => {
    if (req.url.endsWith('/path1')) {
      return 'some response body'
    } else if (req.url.endsWith('/path2')) {
      return {
        body: 'another response body',
        headers: {
          'X-Some-Response-Header': 'Some header value'
        }
      }
    } else {
      return {
        status: 404,
        body: 'Not Found'
      }
    }
  })
})
```

If you have changed the default behavior to use the real implementation, you can guarantee the next call to fetch will be mocked by using the `mockOnce` function:

```js
fetchMock.mockOnce('the next call to fetch will always return this as the body')
```

This function behaves exactly like `fetchMock.once` but guarantees the next call to `fetch` will be mocked even if the default behavior of fetchMock is to use the real implementation. You can safely convert all your `fetchMock.once` calls to `fetchMock.mockOnce` without a risk of changing their behavior.

### To setup for an individual test

For JavaScript add the following line to the start of your test case (before any other requires):

```js
require('jest-fetch-mock').enableMocks()
```

For TypeScript/ES6 add the following lines to the start of your test case (before any other imports):

```typescript
import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()
```

### Using with TypeScript

The package ships its own type definitions — no `@types/jest-fetch-mock` needed. It does rely on the `jest` global namespace, so have [`@types/jest`](https://www.npmjs.com/package/@types/jest) installed.

If you receive errors about the `fetchMock` global not existing, add a `global.d.ts` file to the root of your project (or add the following line to an existing global file):

```typescript
import 'jest-fetch-mock'
```

If you prefer you can also just import the fetchMock in a test case:

```typescript
import fetchMock from 'jest-fetch-mock'
```

Typed usage of the most common calls looks like this:

```typescript
import fetchMock, { MockResponseInit } from 'jest-fetch-mock'

fetchMock.mockResponseOnce(JSON.stringify({ data: '12345' }))

fetchMock.mockResponse(async (req: Request): Promise<MockResponseInit> => ({
  body: 'ok',
  status: 201,
}))
```

### Using with Create-React-App

> Create React App is no longer maintained, but plenty of apps built with it still are — so this section stays.

If you are using [Create-React-App](https://create-react-app.dev/) (CRA), the code for `setupJest.js` above should be placed into `src/setupTests.js` in the root of your project. CRA automatically uses this filename by convention in the Jest configuration it generates. Similarly, changing your `package.json` is not required as CRA handles this when generating your Jest configuration.

Note that CRA ≥ 4.0.1 generates a Jest config with `resetMocks: true` — see [the `resetMocks` gotcha](#package-installation) above for why that matters and how to handle it.

### A note on Node's built-in fetch

Since 4.0, this library builds on the environment's **own** fetch primitives whenever they exist — under `jest-environment-node` (Jest 28+, Node 18+) your mocked `Response`s are real native (undici) responses, `instanceof` checks work, and nothing your tests didn't ask for is touched. Where the environment provides no fetch (`jest-environment-jsdom`), the bundled cross-fetch fallback fills exactly the missing globals, as it always did. `fetchMock.usingNativeFetch` tells you which mode you're in.

### Migrating from 3.x

4.0 keeps every 3.x API. Things to check when upgrading:

- **Floors**: Node ≥ 18 and Jest ≥ 28 (stay on 3.2.0 for older stacks).
- In node environments, mocked responses are now **native** `Response` objects. If a test asserted node-fetch-specific details, it may need a touch-up (e.g. MIME types serialize as `text/csv;charset=utf-8`, without the space).
- `disableMocks()` now restores the environment's original `fetch` rather than cross-fetch's.
- Relative URLs (`fetch('/api')`) in **node** environments resolve against `http://localhost/` for match predicates; in jsdom the fallback behaves as before.
- TypeScript: the types no longer force the `dom` lib onto your compilation and no longer require `@types/jest` — but they do need ambient fetch types from either `lib: ["dom"]` or `@types/node` ≥ 18.
- If you use `resetMocks: true` in your Jest config, move `enableMocks()` to `setupFilesAfterEnv` and the old "fetch returns undefined" footgun disappears entirely.

#### `injectGlobals: false` / `@jest/globals`

The main entry needs the global `jest` object at import time. If you run with `injectGlobals: false`, build your instance explicitly:

```js
import { jest } from '@jest/globals'
import createFetchMock from 'jest-fetch-mock/factory'

const fetchMock = createFetchMock(jest)
fetchMock.enableMocks()
```

#### One-liner setup

```JSON
"jest": {
  "setupFilesAfterEnv": ["jest-fetch-mock/setup"]
}
```

## API

### Mock Responses

- `fetch.mockResponse(bodyOrFunction, init): fetch` - Mock all fetch calls
- `fetch.mockResponseOnce(bodyOrFunction, init): fetch` - Mock each fetch call independently
- `fetch.once(bodyOrFunction, init): fetch` - Alias for `mockResponseOnce(bodyOrFunction, init)`
- `fetch.mockResponses(...responses): fetch` - Mock multiple fetch calls independently
  - Each argument is an array taking `[bodyOrFunction, init]`, a body string, or a `Response`
- `fetch.mockReject(errorOrFunction): fetch` - Mock all fetch calls, letting them fail directly
- `fetch.mockRejectOnce(errorOrFunction): fetch` - Let the next fetch call fail directly
- `fetch.mockAbort(): fetch` - Causes all fetch calls to reject with an `AbortError` `DOMException` ("The operation was aborted.")
- `fetch.mockAbortOnce(): fetch` - Causes the next fetch call to reject with an `AbortError` `DOMException`

The `body` argument can be:

- a **string** — used as the response body. To respond with JSON, stringify it yourself: `fetch.mockResponse(JSON.stringify({ foo: 'bar' }))` (passing a plain object is a common mistake and produces `"[object Object]"`),
- a **`Response` object** — returned as-is, which is the way to mock binary bodies: `fetch.mockResponseOnce(new Response(Buffer.from(myBytes)))`. Note a `Response` body can only be read once, so prefer `mockResponseOnce` (or a function returning a fresh `Response`) over `mockResponse` when fetch is called repeatedly,
- a **function** — see below.

### Functions

Instead of passing body, it is also possible to pass a function that returns a promise (or a plain value).
The promise should resolve with a string, an object containing body and init props, or a `Response` object

i.e:

```js
fetch.mockResponse(() => callMyApi().then(res => ({ body: 'ok' })))
// OR
fetch.mockResponse(() => callMyApi().then(res => 'ok'))
// OR
fetch.mockResponse(() => callMyApi().then(res => new Response('ok')))
// OR synchronously:
fetch.mockResponse(() => 'ok')
```

The function may take an optional "request" parameter of type `Request`:

```js
fetch.mockResponse(req =>
  req.url === 'http://myapi/'
    ? callMyApi().then(res => 'ok')
    : Promise.reject(new Error('bad url'))
)
```

Note: the request "url" is parsed and then printed using the equivalent of `new URL(input).href` so it may not match exactly with the URLs passed to `fetch` if they are not fully qualified.
For example, passing "http://foo.com" to `fetch` will result in the request URL being "http://foo.com/" (note the trailing slash).

The same goes for rejects:

```js
fetch.mockReject(() =>
  doMyAsyncJob().then(res => Promise.reject(res.errorToRaise))
)
// OR
fetch.mockReject(req =>
  req.headers.get('content-type') === 'text/plain'
    ? Promise.reject('invalid content type')
    : doMyAsyncJob().then(res => Promise.reject(res.errorToRaise))
)
```

### Mock utilities

- `fetch.resetMocks()` - Clear previously set mocks so they do not bleed into other mocks
- `fetch.enableMocks()` - Enable fetch mocking by overriding `global.fetch` and mocking `node-fetch`
- `fetch.disableMocks()` - Disable fetch mocking and restore the environment's original `fetch`
- `fetch.mock` - The mock state for your fetch calls. Make assertions on the arguments given to `fetch` when called by the functions you are testing. For more information check the [Jest docs](https://jestjs.io/docs/mock-functions#mock-property)
- `fetch.realFetch` - The implementation unmatched (dont-mocked) requests pass through to; reassign it in a test to stub the "real" side
- `fetch.defaultResponseInit` - Optional init merged under every mocked response's own init — e.g. `fetchMock.defaultResponseInit = { headers: { 'Content-Type': 'application/json' } }` to default every mock to JSON
- `fetch.usingNativeFetch` - `true` when the environment's own fetch primitives are in use, `false` when the jsdom fallback engaged
- `createFetchMock(jest)` - Build an isolated instance from an explicitly-passed jest object (also importable dependency-free from `jest-fetch-mock/factory`)

For information on the arguments body and init can take, you can look at the MDN docs on the Response Constructor function, which `jest-fetch-mock` uses under the surface:

https://developer.mozilla.org/en-US/docs/Web/API/Response/Response

Each mocked response or error will return a [Mock Function](https://jestjs.io/docs/mock-function-api). You can use methods like `.toHaveBeenCalledWith` to ensure that the mock function was called with specific arguments. For more methods detail, take a look at [this](https://jestjs.io/docs/expect).

## Examples

In most of the complicated examples below, I am testing my action creators in Redux, but it doesn't have to be used with Redux.

### Simple mock and assert

In this simple example I won't be using any libraries. It is a simple fetch request, in this case to google.com. First we setup the `beforeEach` callback to reset our mocks. This isn't strictly necessary in this example, but since we will probably be mocking fetch more than once, we need to reset it across our tests to assert on the arguments given to fetch. Make sure the function wrapping your test is marked as async.

Once we've done that we can start to mock our response. We want to give it an object with a `data` property and a string value of `12345` and wrap it in `JSON.stringify` to JSONify it. Here we use `mockResponseOnce`, but we could also use `once`, which is an alias for a call to `mockResponseOnce`.

We then call the function that we want to test with the arguments we want to test with. We use `await` to wait until the response resolves, and then assert we have got the correct data back.

Finally we can assert on the `.mock` state that Jest provides for us to test what arguments were given to fetch and how many times it was called

```js
//api.js
export function APIRequest(who) {
  if (who === 'google') {
    return fetch('https://google.com').then(res => res.json())
  } else {
    return 'no argument provided'
  }
}
```

```js
//api.test.js
import { APIRequest } from './api'

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google and returns data to me', async () => {
    fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))

    //assert on the response
    const res = await APIRequest('google')
    expect(res.data).toEqual('12345')

    //assert on the times called and arguments given to fetch
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })
})
```

### Mocking all fetches

In this example I am mocking just one fetch call. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out the [multiple fetches](#mocking-multiple-fetches-with-different-responses) example.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {
  it('dispatches the correct actions on successful fetch request', () => {
    fetch.mockResponse(JSON.stringify({ access_token: '12345' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: { access_token: '12345' } }
    ]
    const store = mockStore({ config: { token: '' } })

    return (
      store
        .dispatch(getAccessToken())
        //getAccessToken contains the fetch call
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Mocking a failed fetch

In this example I am mocking just one fetch call but this time using the `mockReject` function to simulate a failed request. Any additional fetch calls in the same function will also have the same mock response.

```js
describe('testing a failed request', () => {
  it('rejects and surfaces the error', async () => {
    fetch.mockReject(new Error('fake error message'))

    await expect(fetch('https://anything.test')).rejects.toThrow(
      'fake error message'
    )
  })
})
```

### Mocking aborted fetches

Fetches can be mocked to act as if they were aborted during the request. This can be done in 4 ways:

1. Using `fetch.mockAbort()`
2. Using `fetch.mockAbortOnce()`
3. Passing a request (or request init) with an already-aborted 'signal' to fetch
4. Passing a request (or request init) with a 'signal' to fetch and an async function to `fetch.mockResponse` or `fetch.mockResponseOnce` that causes the signal to abort before returning the response

In every case the fetch promise rejects with an `AbortError` `DOMException` whose message is "The operation was aborted." (Before 3.2.0, case 3 threw synchronously instead of rejecting; it now rejects, matching the fetch spec.)

```js
describe('Mocking aborts', () => {
  beforeEach(() => {
    fetch.resetMocks()
    fetch.doMock()
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects with an AbortError', () => {
    fetch.mockAbort()
    return expect(fetch('/')).rejects.toThrow('The operation was aborted')
  })

  it('rejects with an AbortError once then mocks with empty response', async () => {
    fetch.mockAbortOnce()
    await expect(fetch('/')).rejects.toThrow('The operation was aborted')
    await expect(fetch('/').then((res) => res.text())).resolves.toEqual('')
  })

  it('rejects when passed an already aborted abort signal', () => {
    const c = new AbortController()
    c.abort()
    return expect(fetch('/', { signal: c.signal })).rejects.toThrow(
      'The operation was aborted'
    )
  })

  it('rejects when aborted before resolved', async () => {
    const c = new AbortController()
    fetch.mockResponse(async () => {
      jest.advanceTimersByTime(60)
      return ''
    })
    setTimeout(() => c.abort(), 50)
    await expect(fetch('/', { signal: c.signal })).rejects.toThrow(
      'The operation was aborted'
    )
  })
})
```

### Mocking a redirected response

Set the counter option >= 1 in the response init object to mock a [redirected response](https://developer.mozilla.org/en-US/docs/Web/API/Response/redirected). Note, this will only work in Node.js as it's a feature of [node-fetch's response class](https://github.com/node-fetch/node-fetch/blob/2.x/src/response.js).

```js
fetchMock.mockResponse("<main></main>", {
  counter: 1,
  status: 200,
  statusText: "ok",
});
```

### Mocking multiple fetches with different responses

In this next example, the store does not yet have a token, so we make a request to get an access token first. This means that we need to mock two different responses, one for each of the fetches. Here we can use `fetch.mockResponseOnce` or `fetch.once` to mock the response only once and call it twice. Because we return the mocked function, we can chain this jQuery style. It internally uses Jest's `mockImplementationOnce`. You can read more about it on the [Jest documentation](https://jestjs.io/docs/mock-functions)

```js
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAnimeDetails } from './animeDetails'

describe('Anime details action creators', () => {
  it('dispatches requests for an access token before requesting for animeDetails', () => {
    fetch
      .once(JSON.stringify({ access_token: '12345' }))
      .once(JSON.stringify({ name: 'naruto' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: { access_token: '12345' } },
      { type: 'SET_ANIME_DETAILS', animeDetails: { name: 'naruto' } }
    ]
    const store = mockStore({ config: { token: null } })

    return (
      store
        .dispatch(getAnimeDetails('21049'))
        //getAnimeDetails contains the 2 fetch calls
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Mocking multiple fetches with `fetch.mockResponses`

`fetch.mockResponses` takes as many arguments as you give it, all of which are arrays representing each Response Object. It will then call the `mockImplementationOnce` for each response object you give it. This reduces the amount of boilerplate code you need to write. An alternative is to use `.once` and chain it multiple times if you don't like wrapping each response arguments in a tuple/array.

In this example our actionCreator calls `fetch` 4 times, once for each season of the year and then concatenates the results into one final array. You'd have to write `fetch.mockResponseOnce` 4 times to achieve the same thing:

```js
describe('getYear action creator', () => {
  it('dispatches the correct actions on successful getSeason fetch request', () => {
    fetch.mockResponses(
      [
        JSON.stringify([{ name: 'naruto', average_score: 79 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'bleach', average_score: 68 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'one piece', average_score: 80 }]),
        { status: 200 }
      ],
      [
        JSON.stringify([{ name: 'shingeki', average_score: 91 }]),
        { status: 200 }
      ]
    )

    const expectedActions = [
      {
        type: 'FETCH_ANIMELIST_REQUEST'
      },
      {
        type: 'SET_YEAR',
        payload: {
          animes: [
            { name: 'naruto', average_score: 7.9 },
            { name: 'bleach', average_score: 6.8 },
            { name: 'one piece', average_score: 8 },
            { name: 'shingeki', average_score: 9.1 }
          ],
          year: 2016
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: {
        token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }
      },
      years: []
    })

    return (
      store
        .dispatch(getYear(2016))
        //This calls fetch 4 times, once for each season
        .then(() => {
          // return of async actions
          expect(store.getActions()).toEqual(expectedActions)
        })
    )
  })
})
```

### Reset mocks between tests with `fetch.resetMocks`

`fetch.resetMocks` resets the `fetch` mock to give fresh mock data in between tests. It only resets the `fetch` calls as to not disturb any other mocked functionality.

```js
describe('getYear action creator', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocks each test independently', async () => {
    fetch.once(JSON.stringify([{ name: 'naruto', average_score: 79 }]))
    // ... first test's fetches and assertions
  })

  it('starts from a clean slate', async () => {
    // fetch.mock.calls is empty again here thanks to resetMocks
    fetch.once(JSON.stringify([{ name: 'bleach', average_score: 68 }]))
    // ... second test's fetches and assertions
  })
})
```

(Remember: if your Jest config has `resetMocks: true`, see [the gotcha at the top](#package-installation) — Jest's automatic reset clears the mock *implementation* too, which is more than `fetch.resetMocks()` does.)

### Using `fetch.mock` to inspect the mock state of each fetch call

`fetch.mock` by default uses [Jest's mocking functions](https://jestjs.io/docs/mock-functions#mock-property). Therefore you can make assertions on the mock state. In this example we have an arbitrary function that makes a different fetch request based on the argument you pass to it. In our test, we run Jest's `beforeEach()` and make sure to reset our mock before each `it()` block as we will make assertions on the arguments we are passing to `fetch()`. The most used property is the `fetch.mock.calls` array. It can give you information on each call, and their arguments which you can use for your `expect()` calls. Jest also comes with some nice aliases for the most used ones.

```js
// api.js

import 'cross-fetch'

export function APIRequest(who) {
  if (who === 'facebook') {
    return fetch('https://facebook.com')
  } else if (who === 'twitter') {
    return fetch('https://twitter.com')
  } else {
    return fetch('https://google.com')
  }
}
```

```js
// api.test.js
import { APIRequest } from './api'

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google by default', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest()

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('calls facebook', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('facebook')

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://facebook.com')
  })

  it('calls twitter', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('twitter')

    expect(fetch).toBeCalled() // alias for expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch).toBeCalledWith('https://twitter.com') // alias for expect(fetch.mock.calls[0][0]).toEqual();
  })
})
```

### Using functions to mock slow servers

By default you will want to have your fetch mock return immediately. However if you have some custom logic that needs to test for slower servers, you can do this by passing it a function and returning a promise when your function resolves

```js
// api.test.js
import { request } from './api'

describe('testing timeouts', () => {
  it('resolves with function and timeout', async () => {
    fetch.mockResponseOnce(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 100))
    )
    const response = await request()
    expect(response).toEqual('ok')
  })
})
```

## Conditional Mocking

In some test scenarios, you may want to temporarily disable (or enable) mocking for all requests or the next (or a certain number of) request(s).
You may want to only mock fetch requests to some URLs that match a given request path while in others you may want to mock
all requests except those matching a given request path. You may even want to conditionally mock based on request headers.

The conditional mock functions cause `jest-fetch-mock` to pass fetches through to the concrete fetch implementation conditionally.
Calling `fetch.dontMock`, `fetch.doMock`, `fetch.doMockIf` or `fetch.dontMockIf` overrides the default behavior
of mocking/not mocking all requests. `fetch.dontMockOnce`, `fetch.doMockOnce`, `fetch.doMockOnceIf` and `fetch.dontMockOnceIf` only overrides the behavior
for the next call to `fetch`, then returns to the default behavior (either mocking all requests or mocking the requests based on the last call to
`fetch.dontMock`, `fetch.doMock`, `fetch.doMockIf` and `fetch.dontMockIf`).

Calling `fetch.resetMocks()` will return to the default behavior of mocking all fetches with a text response of empty string.

- `fetch.dontMock()` - Change the default behavior to not mock any fetches until `fetch.resetMocks()` or `fetch.doMock()` is called
- `fetch.doMock(bodyOrFunction?, responseInit?)` - Reverses `fetch.dontMock()`. This is the default state after `fetch.resetMocks()`
- `fetch.dontMockOnce()` - For the next fetch, do not mock then return to the default behavior for subsequent fetches. Can be chained.
- `fetch.doMockOnce(bodyOrFunction?, responseInit?)` or `fetch.mockOnce` - For the next fetch, mock the response then return to the default behavior for subsequent fetches. Can be chained.
- `fetch.doMockIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` or `fetch.mockIf` - causes all fetches to be not be mocked unless they match the given string/RegExp/predicate
  (i.e. "only mock 'fetch' if the request is for the given URL otherwise, use the real fetch implementation")
- `fetch.dontMockIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` - causes all fetches to be mocked unless they match the given string/RegExp/predicate
  (i.e. "don't mock 'fetch' if the request is for the given URL, otherwise mock the request")
- `fetch.doMockOnceIf(urlOrPredicate, bodyOrFunction?, responseInit?):fetch` or `fetch.mockOnceIf` - causes the next fetch to be mocked if it matches the given string/RegExp/predicate. Can be chained.
  (i.e. "only mock 'fetch' if the next request is for the given URL otherwise, use the default behavior")
- `fetch.dontMockOnceIf(urlOrPredicate):fetch` - causes the next fetch to be not be mocked if it matches the given string/RegExp/predicate. Can be chained.
  (i.e. "don't mock 'fetch' if the next request is for the given URL, otherwise use the default behavior")
- `fetch.isMocking(input, init):boolean` - test utility function to see if the given url/request would be mocked.
  This is not a read only operation and any "MockOnce" will evaluate (and return to the default behavior)

For convenience, all the conditional mocking functions also accept optional parameters after the 1st parameter that call
`mockResponse` or `mockResponseOnce` respectively. This allows you to conditionally mock a response in a single call.

### Conditional mocking examples

```js
describe('conditional mocking', () => {
  const realResponse = 'REAL FETCH RESPONSE'
  const mockedDefaultResponse = 'MOCKED DEFAULT RESPONSE'
  const testUrl = defaultRequestUri
  let crossFetchSpy
  beforeEach(() => {
    fetch.resetMocks()
    fetch.mockResponse(mockedDefaultResponse)
    crossFetchSpy = jest
      .spyOn(require('cross-fetch'), 'fetch')
      .mockImplementation(async () =>
        Promise.resolve(new Response(realResponse))
      )
  })

  afterEach(() => {
    crossFetchSpy.mockRestore()
  })

  const expectMocked = async (uri, response = mockedDefaultResponse) => {
    return expect(request(uri)).resolves.toEqual(response)
  }
  const expectUnmocked = async uri => {
    return expect(request(uri)).resolves.toEqual(realResponse)
  }

  describe('doMockIf', () => {
    it("doesn't mock normally", async () => {
      fetch.doMockIf('http://foo')
      await expectUnmocked()
      await expectUnmocked()
    })
    it('mocks when matches string', async () => {
      fetch.doMockIf(testUrl)
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches regex', async () => {
      fetch.doMockIf(new RegExp(testUrl))
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.doMockIf(input => input.url === testUrl)
      await expectMocked()
      await expectMocked()
    })
  })

  describe('dontMockIf', () => {
    it('mocks normally', async () => {
      fetch.dontMockIf('http://foo')
      await expectMocked()
      await expectMocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockIf(testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
  })

  describe('dont/do mock', () => {
    test('dontMock', async () => {
      fetch.dontMock()
      await expectUnmocked()
      await expectUnmocked()
    })
    test('dontMockOnce', async () => {
      fetch.dontMockOnce()
      await expectUnmocked()
      await expectMocked()
    })
    test('doMock', async () => {
      fetch.dontMock()
      fetch.doMock()
      await expectMocked()
      await expectMocked()
    })
    test('doMockOnce', async () => {
      fetch.dontMock()
      fetch.doMockOnce()
      await expectMocked()
      await expectUnmocked()
    })
  })
})
```

For a longer, exhaustive example of interleaved once/if conditional mocks, see [tests/test.js](./tests/test.js).

## Recipes and common gotchas

### Respond with JSON — stringify it

`mockResponse` takes a body **string**. Passing an object directly silently becomes `"[object Object]"` and then `response.json()` fails:

```js
fetch.mockResponse(JSON.stringify({ foo: 'bar' })) // ✅
fetch.mockResponse({ foo: 'bar' })                 // ❌ "[object Object]"
```

### One mock per endpoint

The cleanest way to route different URLs to different responses ([#126](https://github.com/jefflau/jest-fetch-mock/issues/126)):

```js
fetch.mockResponse(async (req) => {
  const url = new URL(req.url)
  switch (url.pathname) {
    case '/users':
      return JSON.stringify([{ id: 1 }])
    case '/teams':
      return JSON.stringify([{ id: 42 }])
    default:
      return { status: 404, body: 'Not Found' }
  }
})
```

Or scope mocking to one host and leave everything else real with `fetch.mockIf(/^https:\/\/api\.example\.com\//, handler)`.

### Empty bodies and `response.json()`

The default mock response is an empty string, and `res.json()` on an empty body **rejects** ("Unexpected end of JSON input") — browsers are no more lenient ([#63](https://github.com/jefflau/jest-fetch-mock/issues/63)). If the code under test always calls `.json()`, always mock a JSON body — at minimum `fetch.mockResponse('{}')`.

### `ok` and `status`

`response.ok` is derived automatically: it is `true` for `status` in the 200–299 range ([#119](https://github.com/jefflau/jest-fetch-mock/issues/119)). To test an error path, just set the status:

```js
fetch.mockResponseOnce('server blew up', { status: 503 })
```

### Mocking ponyfill imports (`cross-fetch`, `node-fetch`)

Code that imports fetch as a module (`import fetch from 'cross-fetch'`) bypasses the global mock. Redirect the module to the mock instead ([#122](https://github.com/jefflau/jest-fetch-mock/issues/122)):

```js
// setupJest.js
require('jest-fetch-mock').enableMocks()
jest.setMock('cross-fetch', fetchMock) // and/or 'node-fetch' (done automatically for node-fetch)
```

`enableMocks()` already does this for `node-fetch`; add a `jest.setMock` line per additional ponyfill module your code imports.

### "jest is not defined"

`jest-fetch-mock` calls `jest.fn()` on import, so it can only be imported where Jest's globals exist: test files, `setupFiles`, or `setupFilesAfterEnv` — not in `globalSetup`, custom sequencers, or plain Node scripts ([#104](https://github.com/jefflau/jest-fetch-mock/issues/104)). For `injectGlobals: false` setups, use `createFetchMock` from `jest-fetch-mock/factory`, which imports cleanly anywhere. If the error appears after a dependency update, also try clearing the watcher/cache: `npx jest --clearCache`.

### Binary responses

Pass a `Response` with a `Buffer` body (new in 3.2.0):

```js
fetch.mockResponseOnce(new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
const buf = await (await fetch('https://example.com/img.png')).arrayBuffer()
```

## License

MIT — see [LICENSE.md](./LICENSE.md).
