/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Implements basic mock for the fetch interface use `whatwg-fetch` polyfill.
 *
 * See https://fetch.spec.whatwg.org/
 */

const { Response, Headers, Request } = require('whatwg-fetch');

const ActualResponse = Response;

function ResponseWrapper(body, init) {
  if (
    typeof body.constructor === 'function' &&
    body.constructor.__isFallback
  ) {
    const response = new ActualResponse(null, init);
    response.body = body;

    const actualClone = response.clone;
    response.clone = () => {
      const clone = actualClone.call(response);
      const [body1, body2] = body.tee();
      response.body = body1;
      clone.body = body2;
      return clone;
    };

    return response;
  }

  return new ActualResponse(body, init);
}

const fetch = jest.fn();
fetch.Headers = Headers;
fetch.Response = ResponseWrapper;
fetch.Request = Request;
fetch.mockResponse = (body, init) => {
  fetch.mockImplementation(
    () => {
      if(init && init.status >= 400) {
        return Promise.reject(new ResponseWrapper(body, init))
      }
      else {
        return Promise.resolve(new ResponseWrapper(body, init))
      }
    }
  );
};

fetch.mockResponseOnce = (body, init) => {
  fetch.mockImplementationOnce(
    () => Promise.resolve(new ResponseWrapper(body, init))
  );
};

fetch.mockResponses = (...responses) => {
  responses.forEach(([ body, init ]) => {
    fetch.mockImplementationOnce(
      () => Promise.resolve(new ResponseWrapper(body, init))
    );
  })
};

// Default mock is just a empty string.
fetch.mockResponse('');

module.exports = fetch;
