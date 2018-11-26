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

const isFn = unknown => typeof unknown === 'function'

const normalizeResponse = (bodyOrFunction, init) => () => isFn(bodyOrFunction) ?
    bodyOrFunction().then(({body, init}) => new ResponseWrapper(body, init)) :
    Promise.resolve(new ResponseWrapper(bodyOrFunction, init))

const normalizeError = errorOrFunction =>  isFn(errorOrFunction) ?
  errorOrFunction :
  () => Promise.reject(errorOrFunction)

const fetch = jest.fn()
fetch.Headers = Headers
fetch.Response = ResponseWrapper
fetch.Request = Request
fetch.mockResponse = (bodyOrFunction, init) => fetch.mockImplementation(normalizeResponse(bodyOrFunction, init))

fetch.mockReject = errorOrFunction => fetch.mockImplementation(normalizeError(errorOrFunction))

const mockResponseOnce = (bodyOrFunction, init) => fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = errorOrFunction => fetch.mockImplementationOnce(normalizeError(errorOrFunction))

fetch.mockResponses = (...responses) => {
  responses.forEach(([bodyOrFunction, init]) => fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init)))
  return fetch
}

fetch.resetMocks = () => {
  fetch.mockReset()
}

// Default mock is just a empty string.
fetch.mockResponse('')

module.exports = fetch
