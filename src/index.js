require('isomorphic-fetch');

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
  return fetch.mockImplementation(
    () => Promise.resolve(new ResponseWrapper(body, init))
  );
};

fetch.mockReject = (error) => {
  return fetch.mockImplementation(
    () => Promise.reject(error)
  );
};

fetch.mockResponseOnce = (body, init) => {
  return fetch.mockImplementationOnce(
    () => Promise.resolve(new ResponseWrapper(body, init))
  );
};


fetch.mockRejectOnce = (error) => {
  return fetch.mockImplementationOnce(
    () => Promise.reject(error)
  );
};

fetch.mockResponses = (...responses) => {
  return responses.map(([ body, init ]) => {
    return fetch.mockImplementationOnce(
      () => Promise.resolve(new ResponseWrapper(body, init))
    );
  })
};

fetch.resetMocks = () => {
  fetch.mockReset();
};

// Default mock is just a empty string.
fetch.mockResponse('');

module.exports = fetch;
