const crossFetch = require('cross-fetch')
global.fetch = crossFetch
global.Response = crossFetch.Response
global.Headers = crossFetch.Headers
global.Request = crossFetch.Request

if (!Promise) {
  Promise = require('promise-polyfill')
} else if (!Promise.finally) {
  Promise.finally = require('promise-polyfill').finally
}

const ActualResponse = Response

function ResponseWrapper(body, init) {
  if (
    body &&
    typeof body.constructor === 'function' &&
    body.constructor.__isFallback
  ) {
    const response = new ActualResponse(null, init)
    response.body = body

    const actualClone = response.clone
    response.clone = () => {
      const clone = actualClone.call(response)
      const [body1, body2] = body.tee()
      response.body = body1
      clone.body = body2
      return clone
    }

    return response
  }

  return new ActualResponse(body, init)
}

function responseInit(resp, init) {
  if (typeof resp.init === 'object') {
    return resp.init
  } else {
    const init = Object.assign({}, init || {})
    for (const field of ['status', 'statusText', 'headers', 'url']) {
      if (field in resp) {
        init[field] = resp[field]
      }
    }
    return init
  }
}

function requestMatches(urlOrPredicate) {
  if (typeof urlOrPredicate === 'function') {
    return urlOrPredicate
  }
  const predicate =
    urlOrPredicate instanceof RegExp
      ? input => urlOrPredicate.exec(input) !== null
      : input => input === urlOrPredicate
  return input => {
    const requestUrl = typeof input === 'object' ? input.url : input
    return predicate(requestUrl)
  }
}

function requestNotMatches(urlOrPredicate) {
  const matches = requestMatches(urlOrPredicate)
  return input => {
    return !matches(input)
  }
}

const isFn = unknown => typeof unknown === 'function'

const isMocking = jest.fn(() => true)

const normalizeResponse = (bodyOrFunction, init) => (input, reqInit) =>
  isMocking(input, reqInit)
    ? isFn(bodyOrFunction)
      ? bodyOrFunction(input, reqInit).then(resp =>
          typeof resp === 'string'
            ? new ResponseWrapper(resp, init)
            : new ResponseWrapper(resp.body, responseInit(resp, init))
        )
      : Promise.resolve(new ResponseWrapper(bodyOrFunction, init))
    : crossFetch.fetch(input, reqInit)

const normalizeError = errorOrFunction =>
  isFn(errorOrFunction)
    ? errorOrFunction
    : () => Promise.reject(errorOrFunction)

const fetch = jest.fn(normalizeResponse(''))
fetch.Headers = Headers
fetch.Response = ResponseWrapper
fetch.Request = Request
fetch.mockResponse = (bodyOrFunction, init) =>
  fetch.mockImplementation(normalizeResponse(bodyOrFunction, init))

fetch.mockReject = errorOrFunction =>
  fetch.mockImplementation(normalizeError(errorOrFunction))

const mockResponseOnce = (bodyOrFunction, init) =>
  fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = (bodyOrFunction, init) =>
  mockResponseOnce(bodyOrFunction, init).doMockOnce()

fetch.mockRejectOnce = errorOrFunction =>
  fetch.mockImplementationOnce(normalizeError(errorOrFunction))

fetch.mockResponses = (...responses) => {
  responses.forEach(([bodyOrFunction, init]) =>
    fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))
  )
  return fetch
}

fetch.isMocking = isMocking

fetch.onlyMockIf = urlOrPredicate => {
  isMocking.mockImplementation(requestMatches(urlOrPredicate))
  return fetch
}

fetch.neverMockIf = urlOrPredicate => {
  isMocking.mockImplementation(requestNotMatches(urlOrPredicate))
  return fetch
}

fetch.onlyMockOnceIf = urlOrPredicate => {
  isMocking.mockImplementationOnce(requestMatches(urlOrPredicate))
  return fetch
}

fetch.neverMockOnceIf = urlOrPredicate => {
  isMocking.mockImplementationOnce(requestNotMatches(urlOrPredicate))
  return fetch
}

fetch.dontMock = () => {
  isMocking.mockImplementation(() => false)
  return fetch
}

fetch.dontMockOnce = () => {
  isMocking.mockImplementationOnce(() => false)
  return fetch
}

fetch.doMock = () => {
  isMocking.mockImplementation(() => true)
  return fetch
}

fetch.doMockOnce = () => {
  isMocking.mockImplementationOnce(() => true)
  return fetch
}

fetch.resetMocks = () => {
  fetch.mockReset()
  isMocking.mockReset()

  // reset to default implementation with each reset
  fetch.mockImplementation(normalizeResponse(''))
  fetch.doMock()
  fetch.isMocking = isMocking
}

fetch.enableMocks = () => {
  global.fetchMock = global.fetch = fetch
  jest.setMock('node-fetch', fetch)
}

fetch.disableMocks = () => {
  global.fetch = crossFetch
  jest.dontMock('node-fetch')
}

module.exports = fetch
