# Jest Fetch Mock

Fetch is the canonical way to do HTTP requests in the browser, and it can be used in other environments such as React Native. Jest Fetch Mock allows you to easily mock your `fetch` calls and return the response you need to fake the HTTP requests. It's easy to setup and you don't need a library like `nock` to get going and it uses Jest's built-in support for mocking under the surface. This means that any of the `jest.fn()` methods are also available. For more information on the jest mock API, check their docs [here](https://facebook.github.io/jest/docs/en/mock-functions.html)

It currently supports the mocking with the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) polyfill, so it supports Node.js and any browser-like runtime.

## Contents

- [Usage](#usage)
  - [Installation and Setup](#installation-and-setup)
  - [Using with Create-React-App](#using-with-create-react-app)
- [API](#api)
- [Examples](#examples)
  - [Simple mock and assert](#simple-mock-and-assert)
  - [Mocking all fetches](#mocking-all-fetches)
  - [Mocking a failed fetch](#mocking-a-failed-fetch)
  - [Mocking multiple fetches with different responses](#mocking-multiple-fetches-with-different-responses)
  - [Mocking multiple fetches with `fetch.mockResponses`](#mocking-multiple-fetches-with-fetchmockresponses)
  - [Reset mocks between tests with `fetch.resetMocks`](#reset-mocks-between-tests-with-fetchresetmocks)
  - [Using `fetch.mock` to inspect the mock state of each fetch call](#using-fetchmock-to-inspect-the-mock-state-of-each-fetch-call)
  - [Using functions to mock slow servers](#using-functions-to-mock-slow-servers)

## Usage

### Installation and Setup

To setup your fetch mock you need to do the following things:

```
$ npm install --save-dev jest-fetch-mock
```

Create a `setupJest` file to setup the mock or add this to an existing `setupFile`. :

```js
//setupJest.js or similar file
global.fetch = require('jest-fetch-mock')
```

Add the setupFile to your jest config in `package.json`:

```JSON
"jest": {
  "automock": false,
  "setupFiles": [
    "./setupJest.js"
  ]
}
```

### TypeScript guide

If you are using TypeScript, then you can follow the instructions below instead.

```
$ npm install --save-dev jest-fetch-mock
```

Create a `setupJest.ts` file to setup the mock :

```ts
import {GlobalWithFetchMock} from "jest-fetch-mock";

const customGlobal: GlobalWithFetchMock = global as GlobalWithFetchMock;
customGlobal.fetch = require('jest-fetch-mock');
customGlobal.fetchMock = customGlobal.fetch;
```

Add the setupFile to your jest config in `package.json`:

```JSON
"jest": {
  "automock": false,
  "setupFiles": [
    "./setupJest.ts"
  ]
}
```

With this done, you'll have `fetch` and `fetchMock` available on the global scope. Fetch will be used as usual by your code and you'll use `fetchMock` in your tests.

### Using with Create-React-App

If you are using [Create-React-App](https://github.com/facebookincubator/create-react-app) (CRA), the code for `setupTest.js` above should be placed into `src/setupTests.js` in the root of your project. CRA automatically uses this filename by convention in the Jest configuration it generates. Similarly, changing to your `package.json` is not required as CRA handles this when generating your Jest configuration.

### For Ejected Create React Apps _ONLY_:

> Note: Keep in mind that if you decide to "eject" before creating src/setupTests.js, the resulting package.json file won't contain any reference to it, so you should manually create the property setupTestFrameworkScriptFile in the configuration for Jest, something like the [following](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#srcsetuptestsjs-1):

```JSON
"jest": {
  "setupTestFrameworkScriptFile": "<rootDir>/src/setupTests.js"
 }
```

## API

### Mock Responses

- `fetch.mockResponse(bodyOrFunction, init): fetch` - Mock all fetch calls
- `fetch.mockResponseOnce(bodyOrFunction, init): fetch` - Mock each fetch call independently
- `fetch.once(bodyOrFunction, init): fetch` - Alias for mockResponseOnce
- `fetch.mockResponses(...responses): fetch` - Mock multiple fetch calls independently
  - Each argument is an array taking `[bodyOrFunction, init]`
- `fetch.mockReject(errorOrFunction): fetch` - Mock all fetch calls, letting them fail directly
- `fetch.mockRejectOnce(errorOrFunction): fetch` - Let the next fetch call fail directly

### Functions

Instead of passing body, it is also possible to pass a function that returns a promise.
The promise should resolve with an object containing body and init props

i.e:

```
fetch.mockResponse(() => callMyApi().then(res => ({body: res}))
```

The same goes for rejects:

```
fetch.mockReject(() => doMyAsyncJob().then(res => Promise.reject(res.errorToRaise)))
```

### Mock utilities

- `fetch.resetMocks()` - Clear previously set mocks so they do not bleed into other mocks
- `fetch.mock` - The mock state for your fetch calls. Make assertions on the arguments given to `fetch` when called by the functions you are testing. For more information check the [Jest docs](https://facebook.github.io/jest/docs/en/mock-functions.html#mock-property)

For information on the arguments body and init can take, you can look at the MDN docs on the Response Constructor function, which `jest-fetch-mock` uses under the surface.

https://developer.mozilla.org/en-US/docs/Web/API/Response/Response

Each mocked response or err
or will return a [Mock Function](http://facebook.github.io/jest/docs/mock-function-api.html#content). You can use methods like `.toHaveBeenCalledWith` to ensure that the mock function was called with specific arguments. For more methods detail, take a look at [this](http://facebook.github.io/jest/docs/expect.html#content).

## Examples

In most of the complicated examples below, I am testing my action creators in Redux, but it doesn't have to be used with Redux.

### Simple mock and assert

In this simple example I won't be using any libraries. It is a simple fetch request, in this case to google.com. First we setup the `beforeEach` callback to reset our mocks. This isn't strictly necessary in this example, but since we will probably be mocking fetch more than once, we need to reset it across our tests to assert on the arguments given to fetch.

Once we've done that we can start to mock our response. We want to give it an objectwith a `data` property and a string value of `12345` and wrap it in `JSON.stringify` to JSONify it. Here we use `mockResponseOnce`, but we could also use `once`, which is an alias.

We then call the function that we want to test with the arguments we want to test with. In the `then` callback we assert we have got the correct data back.

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

  it('calls google and returns data to me', () => {
    fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))

    //assert on the response
    APIRequest('google').then(res => {
      expect(res.data).toEqual('12345')
    })

    //assert on the times called and arguments given to fetch
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })
})
```

### Mocking all fetches

In this example I am mocking just one fetch call. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

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

In this example I am mocking just one fetch call but this time using the `mockReject` function to simulate a failed request. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {
  it('dispatches the correct actions on a failed fetch request', () => {
    fetch.mockReject(new Error('fake error message'))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN_FAILED', error: { status: 503 } }
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

### Mocking multiple fetches with different responses

In this next example, the store does not yet have a token, so we make a request to get an access token first. This means that we need to mock two different responses, one for each of the fetches. Here we can use `fetch.mockResponseOnce` or `fetch.once` to mock the response only once and call it twice. Because we return the mocked function, we can chain this jQuery style. It internally uses Jest's `mockImplementationOnce`. You can read more about it on the [Jest documentation](https://facebook.github.io/jest/docs/mock-functions.html#content)

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

    //once is an alias for .mockResponseOnce
    //

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
      fetch.resetMocks();
  });
  it('dispatches the correct actions on successful getSeason fetch request', () => {

    fetch.mockResponses(
      [
        JSON.stringify([ {name: 'naruto', average_score: 79} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'bleach', average_score: 68} ]), { status: 200}
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
            {name: 'naruto', average_score: 7.9},
            {name: 'bleach', average_score: 6.8}
          ],
          year: 2016,
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: { token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }},
      years: []
    })

    return store.dispatch(getYear(2016))
      //This calls fetch 2 times, once for each season
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
  });
  it('dispatches the correct actions on successful getSeason fetch request', () => {

    fetch.mockResponses(
      [
        JSON.stringify([ {name: 'bleach', average_score: 68} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'one piece', average_score: 80} ]), { status: 200}
      ],
      [
        JSON.stringify([ {name: 'shingeki', average_score: 91} ]), { status: 200}
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
            {name: 'bleach', average_score: 6.8},
            {name: 'one piece', average_score: 8},
            {name: 'shingeki', average_score: 9.1}
          ],
          year: 2016,
        }
      },
      {
        type: 'FETCH_ANIMELIST_COMPLETE'
      }
    ]
    const store = mockStore({
      config: { token: { access_token: 'wtw45CmyEuh4P621IDVxWkgVr5QwTg3wXEc4Z7Cv' }},
      years: []
    })

    return store.dispatch(getYear(2016))
      //This calls fetch 3 times, once for each season
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
      ,

  })
})
```

### Using `fetch.mock` to inspect the mock state of each fetch call

`fetch.mock` by default uses [Jest's mocking functions](https://facebook.github.io/jest/docs/en/mock-functions.html#mock-property). Therefore you can make assertions on the mock state. In this example we have an arbitrary function that makes a different fetch request based on the argument you pass to it. In our test, we run Jest's `beforeEach()` and make sure to reset our mock before each `it()` block as we will make assertions on the arguments we are passing to `fetch()`. The most uses property is the `fetch.mock.calls` array. It can give you information on each call, and their arguments which you can use for your `expect()` calls. Jest also comes with some nice aliases for the most used ones.

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

    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
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

By default you will want to have your fetch mock return immediately. However if you have some custom logic that needs to tests for slower servers, you can do this by passing it a function and returning a promise when your function resolves

```js
// api.test.js
import { request } from './api'

describe('testing timeouts', () => {
  it('resolves with function and timeout', async () => {
    fetch.mockResponseOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 100))
    )
    try {
      const response = await request()
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    }
  })
})
```
