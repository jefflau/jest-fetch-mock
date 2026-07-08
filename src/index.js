const crossFetch = require('cross-fetch')
global.fetch = crossFetch
global.Response = crossFetch.Response
global.Headers = crossFetch.Headers
global.Request = crossFetch.Request

if (typeof DOMException === 'undefined') {
  DOMException = require('domexception')
}

const ActualResponse = Response

function responseWrapper(body, init) {
  if (body instanceof ActualResponse) {
    return body
  }

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
    init = Object.assign({}, init || {})
    for (const field of ['status', 'statusText', 'headers', 'url']) {
      if (field in resp) {
        init[field] = resp[field]
      }
    }
    return init
  }
}

function requestMatches(urlOrPredicate) {
  const predicate =
    urlOrPredicate instanceof RegExp
      ? (input) => urlOrPredicate.test(input.url)
      : typeof urlOrPredicate === 'string'
      ? (input) => input.url === urlOrPredicate
      : urlOrPredicate
  return (input, reqInit) => {
    const req = normalizeRequest(input, reqInit)
    return [predicate(req), req]
  }
}

function requestNotMatches(urlOrPredicate) {
  const matches = requestMatches(urlOrPredicate)
  return (input, reqInit) => {
    const [matched, request] = matches(input, reqInit)
    return [!matched, request]
  }
}

function staticMatches(value) {
  return (input, reqInit) => {
    return [value, normalizeRequest(input, reqInit)]
  }
}

const isFn = (unknown) => typeof unknown === 'function'

const isMocking = jest.fn(staticMatches(true))

const abortError = () =>
  new DOMException('The operation was aborted. ', 'AbortError')

const abort = () => {
  throw abortError()
}

const abortAsync = () => {
  return Promise.reject(abortError())
}

const toPromise = (val) => (val instanceof Promise ? val : Promise.resolve(val))

const normalizeResponse = (bodyOrFunction, init) => (input, reqInit) => {
  let mockResult
  try {
    mockResult = isMocking(input, reqInit)
  } catch (error) {
    // fetch() never throws synchronously: an already-aborted signal or
    // unparseable input must surface as a rejected promise
    return Promise.reject(error)
  }
  const [mocked, request] = mockResult
  return mocked
    ? isFn(bodyOrFunction)
      ? toPromise(bodyOrFunction(request)).then((resp) => {
          if (request.signal && request.signal.aborted) {
            abort()
          }
          if (resp instanceof ActualResponse) {
            return resp
          }
          return typeof resp === 'string'
            ? responseWrapper(resp, init)
            : responseWrapper(resp.body, responseInit(resp, init))
        })
      : // an aborted signal has already rejected in the isMocking call above,
        // so the static body can resolve unconditionally
        Promise.resolve(responseWrapper(bodyOrFunction, init))
    : crossFetch.fetch(input, reqInit)
}

const normalizeRequest = (input, reqInit) => {
  if (input instanceof Request) {
    if (input.signal && input.signal.aborted) {
      abort()
    }
    return input
  }
  const url =
    typeof input === 'string'
      ? input
      : input != null && typeof input.toString === 'function'
      ? input.toString()
      : null
  if (url === null) {
    throw new TypeError('Unable to parse input as string or Request')
  }
  if (reqInit && reqInit.signal && reqInit.signal.aborted) {
    abort()
  }
  return new Request(url, reqInit)
}

const normalizeError = (errorOrFunction) =>
  isFn(errorOrFunction)
    ? errorOrFunction
    : () => Promise.reject(errorOrFunction)

const fetch = jest.fn(normalizeResponse(''))
fetch.Headers = Headers
fetch.Response = responseWrapper
fetch.Request = Request
fetch.mockResponse = (bodyOrFunction, init) =>
  fetch.mockImplementation(normalizeResponse(bodyOrFunction, init))

fetch.mockReject = (errorOrFunction) =>
  fetch.mockImplementation(normalizeError(errorOrFunction))

fetch.mockAbort = () => fetch.mockImplementation(abortAsync)
fetch.mockAbortOnce = () => fetch.mockImplementationOnce(abortAsync)

const mockResponseOnce = (bodyOrFunction, init) =>
  fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = (errorOrFunction) =>
  fetch.mockImplementationOnce(normalizeError(errorOrFunction))

fetch.mockResponses = (...responses) => {
  responses.forEach((response) => {
    if (Array.isArray(response)) {
      const [body, init] = response
      fetch.mockImplementationOnce(normalizeResponse(body, init))
    } else {
      fetch.mockImplementationOnce(normalizeResponse(response))
    }
  })
  return fetch
}

fetch.isMocking = (req, reqInit) => isMocking(req, reqInit)[0]

// every conditional mock is the same operation: install a matcher on
// isMocking (persistently or for one call) and optionally set a response
// with the same persistence
const configureMocking = (once, matcher, bodyOrFunction, init) => {
  isMocking[once ? 'mockImplementationOnce' : 'mockImplementation'](matcher)
  if (bodyOrFunction) {
    const respond = once ? mockResponseOnce : fetch.mockResponse
    respond(bodyOrFunction, init)
  }
  return fetch
}

fetch.mockIf = fetch.doMockIf = (urlOrPredicate, body, init) =>
  configureMocking(false, requestMatches(urlOrPredicate), body, init)

fetch.dontMockIf = (urlOrPredicate, body, init) =>
  configureMocking(false, requestNotMatches(urlOrPredicate), body, init)

fetch.mockOnceIf = fetch.doMockOnceIf = (urlOrPredicate, body, init) =>
  configureMocking(true, requestMatches(urlOrPredicate), body, init)

fetch.dontMockOnceIf = (urlOrPredicate, body, init) =>
  configureMocking(true, requestNotMatches(urlOrPredicate), body, init)

fetch.doMock = (body, init) =>
  configureMocking(false, staticMatches(true), body, init)

fetch.mockOnce = fetch.doMockOnce = (body, init) =>
  configureMocking(true, staticMatches(true), body, init)

fetch.dontMock = () => configureMocking(false, staticMatches(false))

fetch.dontMockOnce = () => configureMocking(true, staticMatches(false))

fetch.resetMocks = () => {
  fetch.mockReset()
  isMocking.mockReset()

  // reset to default implementation with each reset
  fetch.mockImplementation(normalizeResponse(''))
  fetch.doMock()
}

fetch.enableMocks = fetch.enableFetchMocks = () => {
  global.fetchMock = global.fetch = fetch
  try {
    jest.setMock('node-fetch', fetch)
  } catch (error) {
    //ignore
  }
}

fetch.disableMocks = fetch.disableFetchMocks = () => {
  global.fetch = crossFetch
  try {
    jest.dontMock('node-fetch')
  } catch (error) {
    //ignore
  }
}

Object.defineProperty(exports, '__esModule', { value: true })
module.exports = fetch.default = fetch
