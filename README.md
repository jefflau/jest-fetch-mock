# Jest Fetch Mock

Fetch is the new way to do HTTP requests in the browser, and it can be used in other environments such as React Native. Jest Fetch Mock allows you to easily mock your `fetch` calls and return the response you need to fake the HTTP requests. It's easy to setup and you don't need a library like `nock` to get going and it uses Jest's built-in support for mocking under the surface. It currently supports the mocking of the go-to isomorphic polyfill for fetch, [`isomorphic-fetch`](https://github.com/matthew-andrews/isomorphic-fetch), so it supports Node.js and any browser-like runtime.

## Setup and Installation

To setup your fetch mock you need to do the following things:

```
$ npm install --save-dev jest-fetch-mock
```

Create a `setupJest` file to setup the mock or add this to an existing `setupFile`. :

```js
//setupJest.js or similar file
global.fetch = require('jest-fetch-mock');
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

### Using with Create-React-App

If you are using [Create-React-App](https://github.com/facebookincubator/create-react-app) (CRA), the code for `setupTest.js` above should be placed into `src/setupTests.js` in the root of your project.  CRA automatically uses this filename by convention in the Jest configuration it generates.  Similarly, changing to your `package.json` is not required as CRA handles this when generating your Jest configuration.

> Note: Keep in mind that if you decide to "eject" before creating src/setupTests.js, the resulting package.json file won't contain any reference to it, so you should manually create the property setupTestFrameworkScriptFile in the configuration for Jest, something like the [following](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#srcsetuptestsjs-1):

```JSON
"jest": {
  "setupTestFrameworkScriptFile": "<rootDir>/src/setupTests.js"
 }
```

## API

* `fetch.mockResponse(body, init)` - Mock all fetch calls
* `fetch.mockResponseOnce(body, init)` - Mock each fetch call independently
* `fetch.mockResponses(...responses)` - Mock multiple fetch calls independently
  * Each argument is an array taking `[body, init]`
* `fetch.mockReject(error)` - Mock all fetch calls, letting them fail directly
* `fetch.mockRejectOnce(error)` - Let the next fetch call fail directly
* `fetch.resetMocks()` - Clear previously set mocks so they do not bleed into other mocks

For information on the parameters body and init take, you can look at the MDN docs on the Response Constructor function, which `jest-fetch-mock` uses under the surface.

https://developer.mozilla.org/en-US/docs/Web/API/Response/Response

Each API will return a [Mock Function](http://facebook.github.io/jest/docs/mock-function-api.html#content). You can use methods like `.toHaveBeenCalledWith` to ensure that the mock function was called with specific arguments. For more methods detail, take a look at [this](http://facebook.github.io/jest/docs/expect.html#content).

In the examples below, I am testing my action creators in Redux, but it doesn't have to be used with Redux.

## Example 1 - Mocking all fetches

In this example I am mocking just one fetch call. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [ thunk ]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {

  it('dispatches the correct actions on successful fetch request', () => {

    fetch.mockResponse(JSON.stringify({access_token: '12345' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: {access_token: '12345'}}
    ]
    const store = mockStore({ config: {token: "" } })

    return store.dispatch(getAccessToken())
      //getAccessToken contains the fetch call
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })

  });

})

```

## Example 2 - Mocking a failed fetch

In this example I am mocking just one fetch call but this time using the `mockReject` function to simulate a failed request. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 3.

```js
import configureMockStore from 'redux-mock-store' // mock store
import thunk from 'redux-thunk'

const middlewares = [ thunk ]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {

  it('dispatches the correct actions on a failed fetch request', () => {

    fetch.mockReject(new Error('fake error message'))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN_FAILED', error: {status: 503}}
    ]
    const store = mockStore({ config: {token: "" } })

    return store.dispatch(getAccessToken())
      //getAccessToken contains the fetch call
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })

  });

})

```

## Example 3 - Mocking multiple fetches with different responses

In this next example, the store does not yet have a token, so we make a request to get an access token first. This means that we need to mock two different responses, one for each of the fetches. Here we can use `fetch.mockResponseOnce` to mock the response only once, which internally uses jest's `mockImplementationOnce`. You can read more about it on the [Jest documentation](https://facebook.github.io/jest/docs/mock-functions.html#content)

```js
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

const middlewares = [ thunk ]
const mockStore = configureMockStore(middlewares)

import { getAnimeDetails } from './animeDetails'

describe('Anime details action creators', () => {

  it('dispatches requests for an access token before requesting for animeDetails', () => {

    fetch.mockResponseOnce(JSON.stringify({ access_token: '12345' }))
    fetch.mockResponseOnce(JSON.stringify({ name: 'naruto' }))

    const expectedActions = [
      { type: 'SET_ACCESS_TOKEN', token: { access_token: '12345' }},
      { type: 'SET_ANIME_DETAILS', animeDetails: { name: 'naruto' }}
    ]
    const store = mockStore({ config: { token: null }})

    return store.dispatch(getAnimeDetails("21049"))
      //getAnimeDetails contains the 2 fetch calls
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
  })

})
```

## Example 4 - Mocking multiple fetches with `fetch.mockResponses`

`fetch.mockResponses` takes as many arguments as you give it, all of which are arrays representing each Response Object. It will then call the `mockImplementationOnce` for each response object you give it. This reduces the amount of boilerplate code you need to write.

In this example our actionCreator calls `fetch` 4 times, once for each season of the year and then concatenates the results into one final array. You'd have to write `fetch.mockResponseOnce` 4 times to achieve the same thing:

```js
describe('getYear action creator', () => {
  it('dispatches the correct actions on successful getSeason fetch request', () => {

    fetch.mockResponses(
      [
        JSON.stringify([ {name: 'naruto', average_score: 79} ]), { status: 200}
      ],
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
            {name: 'naruto', average_score: 7.9},
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
      //This calls fetch 4 times, once for each season
      .then(() => { // return of async actions
        expect(store.getActions()).toEqual(expectedActions)
      })
  });
})
```

## Example 5 - Reset mocks between tests with `fetch.resetMocks`

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
