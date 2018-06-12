require('isomorphic-fetch')

if (!Promise) {
  Promise = require('promise-polyfill');
} else if (!Promise.finally) {
  Promise.finally = require('promise-polyfill').finally;
}

const ActualResponse = Response

function ResponseWrapper(body, init) {
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

const fetch = jest.fn()
fetch.Headers = Headers
fetch.Response = ResponseWrapper
fetch.Request = Request
fetch.mockResponse = (body, init) => {
  return fetch.mockImplementation(() =>
    Promise.resolve(new ResponseWrapper(body, init))
  )
}

fetch.mockReject = error => {
  return fetch.mockImplementation(() => Promise.reject(error))
}

const mockResponseOnce = (body, init) => {
  return fetch.mockImplementationOnce(() =>
    Promise.resolve(new ResponseWrapper(body, init))
  )
}

fetch.mockResponseOnce = mockResponseOnce

fetch.once = mockResponseOnce

fetch.mockRejectOnce = error => {
  return fetch.mockImplementationOnce(() => Promise.reject(error))
}

fetch.mockResponses = (...responses) => {
  responses.forEach(([body, init]) => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve(new ResponseWrapper(body, init))
    )
  })
  return fetch
}

fetch.resetMocks = () => {
  fetch.mockReset()
}

// Default mock is just a empty string.
fetch.mockResponse('')

module.exports = fetch
