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

const abortError = () => new Error('Aborted!')

const abort = () => {
  throw abortError()
}

const abortAsync = () => {
  return Promise.reject(abortError())
}

const normalizeResponse = (bodyOrFunction, init) => (input, reqInit) => {
  const request = normalizeRequest(input, reqInit)
  return isMocking(input, reqInit)
    ? isFn(bodyOrFunction)
      ? bodyOrFunction(request).then(resp => {
          if (request.signal && request.signal.aborted) {
            abort()
          }
          return typeof resp === 'string'
            ? new ResponseWrapper(resp, init)
            : new ResponseWrapper(resp.body, responseInit(resp, init))
        })
      : Promise.resolve(new ResponseWrapper(bodyOrFunction, init))
    : crossFetch.fetch(input, reqInit)
}

const normalizeRequest = (input, reqInit) => {
  if (input instanceof Request) {
    if (input.signal && input.signal.aborted) {
      abort()
    }
    return input
  } else if (typeof input === 'string') {
    if (reqInit && reqInit.signal && reqInit.signal.aborted) {
      abort()
    }
    const request = new Request(input, reqInit)
    if (reqInit && reqInit.signal) {
      request.signal = reqInit.signal
    }
    return request
  } else {
    throw new TypeError('Unable to parse input as string or Request')
  }
}

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

fetch.mockAbort = () => fetch.mockImplementation(abortAsync)
fetch.mockAbortOnce = () => fetch.mockImplementationOnce(abortAsync)

const mockResponseOnce = (bodyOrFunction, init) =>
  fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = errorOrFunction =>
  fetch.mockImplementationOnce(normalizeError(errorOrFunction))

fetch.mockResponses = (...responses) => {
  responses.forEach(response => {
    if (Array.isArray(response)) {
      const [body, init] = response
      fetch.mockImplementationOnce(normalizeResponse(body, init))
    } else {
      fetch.mockImplementationOnce(normalizeResponse(response))
    }
  })
  return fetch
}

fetch.isMocking = isMocking

fetch.mockIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementation(requestMatches(urlOrPredicate))
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.dontMockIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementation(requestNotMatches(urlOrPredicate))
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.mockOnceIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementationOnce(requestMatches(urlOrPredicate))
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
  return fetch
}

fetch.dontMockOnceIf = (urlOrPredicate, bodyOrFunction, init) => {
  isMocking.mockImplementationOnce(requestNotMatches(urlOrPredicate))
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
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

fetch.doMock = (bodyOrFunction, init) => {
  isMocking.mockImplementation(() => true)
  if (bodyOrFunction) {
    fetch.mockResponse(bodyOrFunction, init)
  }
  return fetch
}

fetch.doMockOnce = (bodyOrFunction, init) => {
  isMocking.mockImplementationOnce(() => true)
  if (bodyOrFunction) {
    mockResponseOnce(bodyOrFunction, init)
  }
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
  try {
    jest.setMock('node-fetch', fetch)
  } catch (error) {
    //ignore
  }
}

fetch.disableMocks = () => {
  global.fetch = crossFetch
  try {
    jest.dontMock('node-fetch')
  } catch (error) {
    //ignore
  }
}

module.exports = fetch
