# jest-fetch-mock

## Setup and Installation

To setup your fetch mock you need to do the following things:

```
$ npm install --save jest-fetch-mock
```

Add a setupFiles option in your jest config in package.json:

```JSON
//package.json
"jest": {
  "automock": false,
  "testRegex": "\\.test\\.js$",
  "setupFiles": [
    "./setupJest.js"
  ]
}
```

Create the setupJest file to setup the mock:

```js
//setupJest.js
jest.mock('fetch');
global.fetch = require('fetch');
```

Add the actual mock module to your `__mock__` folder and export it so Jest can use it.

```js
//__mock__/fetch.js
import fetch from 'jest-fetch-mock'
module.exports = fetch
```


## Example

```js
import configureMockStore from 'redux-mock-store' // mock store 
import thunk from 'redux-thunk'

const middlewares = [ thunk ]
const mockStore = configureMockStore(middlewares)

import { getAccessToken } from './accessToken'

describe('Access token action creators', () => {

  pit('dispatches the correct actions on successful fetch request', () => {

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


