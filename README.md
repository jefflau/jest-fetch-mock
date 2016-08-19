# Jest Fetch Mock

Fetch is the new way to do HTTP requests in the browser, and it can be used in other environments such as React Native. Jest Fetch Mock allows you to easily mock your `fetch` calls and return the response you need to fake the HTTP requests. It's easy to setup and you don't need a library like `nock` to get goin and it uses Jest's built-in support for mocking under the surface. It currently supports the mocking of the go-to polyfill for fetch, [`whatwg-fetch`](https://github.com/github/fetch)

## Setup and Installation

To setup your fetch mock you need to do the following things:

```
$ npm install --save jest-fetch-mock
```

Create a setupJest file to setup the mock or add this to an existing setupFile:

```js
//setupJest.js
global.fetch = require('jest-fetch-mock');
```

Add the setupFile to your jest config in package.json:

```JSON
"jest": {
  "automock": false,
  "setupFiles": [
    "./setupJest.js"
  ]
}
```

##API

* `fetch.mockImplementation(body, init)` - Mock all fetch calls
* `fetch.mockImplementationOnce(body, init)` - Mock each fetch call independently

For information on the parameters body and init take, you can look at the MDN docs on the Response Constructor function, which `jest-fetch-mock` uses under the surface.

https://developer.mozilla.org/en-US/docs/Web/API/Response/Response

In the examples below, I am testing my action creators in Redux, but it doesn't have to be used with Redux.

## Example 1 - Mocking all fetches

In this example I am mocking just one fetch call. Any additional fetch calls in the same function will also have the same mock response. For more complicated functions with multiple fetch calls, you can check out example 2.

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

##Example 2 - Mocking multiple fetches with different responses

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
