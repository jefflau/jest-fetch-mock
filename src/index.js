require('isomorphic-fetch')

if (!Promise) {
  Promise = require('promise-polyfill')
} else if (!Promise.finally) {
  Promise.finally = require('promise-polyfill').finally
}

const ActualResponse = Response

function ResponseWrapper (body, init) {
  if (body && typeof body.constructor === 'function' && body.constructor.__isFallback) {
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

const isAPromise = obj => obj && obj.then && (typeof obj.then === 'function')

function resolve (bodyOrPromise, init) {
  return () =>
    isAPromise(bodyOrPromise) ?
      bodyOrPromise.then((res) => new ResponseWrapper(res.body, res.init))
      : Promise.resolve(new ResponseWrapper(bodyOrPromise, init))
}

const fetch = jest.fn()
fetch.Headers = Headers
fetch.Response = ResponseWrapper
fetch.Request = Request
fetch.mockResponse = (bodyOrPromise, init) => fetch.mockImplementation(resolve(bodyOrPromise, init))

fetch.mockReject = error => {
  return fetch.mockImplementation(() => Promise.reject(error))
}

const mockResponseOnce = (bodyOrPromise, init) => fetch.mockImplementationOnce(resolve(bodyOrPromise, init))

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = errorOrPromise => {
  return fetch.mockImplementationOnce(() => isAPromise(errorOrPromise) ? errorOrPromise : Promise.reject(error))
}

fetch.mockResponses = (...responses) => {
  responses.forEach(([bodyOrPromise, init]) => fetch.mockImplementationOnce(resolve(bodyOrPromise, init)))
  return fetch
}

fetch.resetMocks = () => {
  fetch.mockReset()
}

// Default mock is just a empty string.
fetch.mockResponse('')

module.exports = fetch
