// Factory for a fetch mock bound to a jest-like mock function factory.
// Uses the environment's own fetch primitives (fetch/Response/Request/Headers)
// when they exist - jest-environment-node has provided them since Jest 28 -
// and falls back to cross-fetch's implementations only where they are absent
// (jest-environment-jsdom still ships no fetch). Existing globals are never
// replaced; missing ones are installed by enableMocks().

const resolvePrimitives = () => {
  const g = globalThis
  if (
    typeof g.fetch === 'function' &&
    typeof g.Response === 'function' &&
    typeof g.Request === 'function' &&
    typeof g.Headers === 'function'
  ) {
    return {
      fetch: g.fetch,
      Response: g.Response,
      Request: g.Request,
      Headers: g.Headers,
      usingFallback: false,
    }
  }
  const crossFetch = require('cross-fetch')
  return {
    fetch: crossFetch.fetch,
    Response: crossFetch.Response,
    Request: crossFetch.Request,
    Headers: crossFetch.Headers,
    usingFallback: true,
  }
}

function createFetchMock(jestLike) {
  if (!jestLike || typeof jestLike.fn !== 'function') {
    throw new TypeError(
      'createFetchMock expects the jest object (or anything with a jest-compatible fn())'
    )
  }

  const primitives = resolvePrimitives()
  const ActualResponse = primitives.Response
  const ActualRequest = primitives.Request

  const abortError = (signal) => {
    const reason = signal && signal.reason
    // a custom or timeout reason (AbortSignal.timeout -> TimeoutError) is
    // surfaced as-is; a default AbortError reason keeps the historical
    // message (note DOMException does not inherit from Error, so match by name)
    if (reason !== undefined && !(reason && reason.name === 'AbortError')) {
      return reason
    }
    return new DOMException('The operation was aborted. ', 'AbortError')
  }

  const throwIfAborted = (signal) => {
    if (signal && signal.aborted) {
      throw abortError(signal)
    }
  }

  // MockParams supports two fields the native Response constructor ignores:
  // url and counter (redirected). node-fetch honored them via init; on native
  // classes they are patched onto the instance.
  const applyNonstandardInit = (response, init) => {
    if (init) {
      if (init.url !== undefined && response.url !== init.url) {
        Object.defineProperty(response, 'url', {
          value: init.url,
          configurable: true,
        })
      }
      if (init.counter >= 1 && !response.redirected) {
        Object.defineProperty(response, 'redirected', {
          value: true,
          configurable: true,
        })
      }
    }
    return response
  }

  const withDefaults = (init) =>
    fetch.defaultResponseInit
      ? Object.assign({}, fetch.defaultResponseInit, init)
      : init

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

      return applyNonstandardInit(response, init)
    }

    return applyNonstandardInit(new ActualResponse(body, init), init)
  }

  function responseInit(resp, init) {
    if (typeof resp.init === 'object') {
      return withDefaults(resp.init)
    }
    const merged = withDefaults(Object.assign({}, init))
    for (const field of ['status', 'statusText', 'headers', 'url']) {
      if (field in resp) {
        merged[field] = resp[field]
      }
    }
    return merged
  }

  const buildRequest = (url, init) => {
    try {
      return new ActualRequest(url, init)
    } catch (error) {
      // the native Request requires absolute URLs; keep relative inputs
      // working by resolving against a synthetic base, the way jsdom does
      return new ActualRequest(new URL(url, 'http://localhost/'), init)
    }
  }

  const normalizeRequest = (input, reqInit) => {
    if (input instanceof ActualRequest) {
      throwIfAborted(input.signal)
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
    throwIfAborted(reqInit && reqInit.signal)
    return buildRequest(url, reqInit)
  }

  const toPredicate = (urlOrPredicate) =>
    urlOrPredicate instanceof RegExp
      ? (input) => urlOrPredicate.test(input.url)
      : typeof urlOrPredicate === 'string'
      ? (input) => input.url === urlOrPredicate
      : urlOrPredicate

  // registered routes: consulted by the persistent implementations before
  // the conditional gate - first registered match serves (#171). The once
  // queue (mockResponseOnce and friends) still takes precedence because a
  // queued implementation replaces the whole call.
  const routes = []

  const findRoute = (request) => {
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].predicate(request)) {
        const route = routes[i]
        if (route.once) {
          routes.splice(i, 1)
        }
        return route
      }
    }
  }

  function requestMatches(urlOrPredicate) {
    const predicate = toPredicate(urlOrPredicate)
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
  const toPromise = (val) =>
    val instanceof Promise ? val : Promise.resolve(val)

  const isMocking = jestLike.fn(staticMatches(true))

  const abortAsync = () => Promise.reject(abortError())

  const respondWith = (bodyOrFunction, init, request) =>
    isFn(bodyOrFunction)
      ? toPromise(bodyOrFunction(request)).then((resp) => {
          if (request.signal && request.signal.aborted) {
            throw abortError(request.signal)
          }
          if (resp instanceof ActualResponse) {
            return resp
          }
          return typeof resp === 'string'
            ? responseWrapper(resp, withDefaults(init))
            : responseWrapper(resp.body, responseInit(resp, init))
        })
      : Promise.resolve(responseWrapper(bodyOrFunction, withDefaults(init)))

  const normalizeResponse =
    (bodyOrFunction, init, consultRoutes) => (input, reqInit) => {
      // fetch() never throws synchronously: an already-aborted signal or
      // unparseable input must surface as a rejected promise
      let request
      try {
        request = normalizeRequest(input, reqInit)
      } catch (error) {
        return Promise.reject(error)
      }
      // a matching route serves regardless of the conditional gate, so
      // routes stay useful when the default is dontMock'd
      if (consultRoutes) {
        const route = findRoute(request)
        if (route) {
          return respondWith(route.bodyOrFunction, route.init, request)
        }
      }
      let mockResult
      try {
        mockResult = isMocking(input, reqInit)
      } catch (error) {
        return Promise.reject(error)
      }
      const [mocked, mockedRequest] = mockResult
      return mocked
        ? respondWith(bodyOrFunction, init, mockedRequest)
        : fetch.realFetch(input, reqInit)
    }

  const defaultImplementation = normalizeResponse('', undefined, true)

  const fetch = jestLike.fn(defaultImplementation)
  fetch.mockImplementation(defaultImplementation)
  fetch.Headers = primitives.Headers
  fetch.Response = responseWrapper
  fetch.Request = ActualRequest
  // expose the backing class's statics through the wrapper; json only
  // exists on native Response, not node-fetch 2 (#191)
  for (const staticMethod of ['error', 'redirect', 'json']) {
    if (typeof ActualResponse[staticMethod] === 'function') {
      responseWrapper[staticMethod] =
        ActualResponse[staticMethod].bind(ActualResponse)
    }
  }
  // the implementation unmatched requests pass through to; reassignable in
  // tests that want to stub the real network
  fetch.realFetch = primitives.fetch
  // optional init merged under every mocked response's own init (#166)
  fetch.defaultResponseInit = undefined
  fetch.usingNativeFetch = !primitives.usingFallback

  fetch.mockResponse = (bodyOrFunction, init) =>
    fetch.mockImplementation(normalizeResponse(bodyOrFunction, init, true))

  fetch.mockReject = (errorOrFunction) =>
    fetch.mockImplementation(
      isFn(errorOrFunction)
        ? errorOrFunction
        : () => Promise.reject(errorOrFunction)
    )

  fetch.mockAbort = () => fetch.mockImplementation(abortAsync)
  fetch.mockAbortOnce = () => fetch.mockImplementationOnce(abortAsync)

  // once implementations skip the route scan: an explicitly queued
  // next-call response outranks any registered route
  const mockResponseOnce = (bodyOrFunction, init) =>
    fetch.mockImplementationOnce(normalizeResponse(bodyOrFunction, init, false))

  fetch.mockResponseOnce = mockResponseOnce
  fetch.once = mockResponseOnce

  fetch.mockRejectOnce = (errorOrFunction) =>
    fetch.mockImplementationOnce(
      isFn(errorOrFunction)
        ? errorOrFunction
        : () => Promise.reject(errorOrFunction)
    )

  fetch.mockResponses = (...responses) => {
    responses.forEach((response) => {
      if (Array.isArray(response)) {
        const [body, init] = response
        fetch.mockImplementationOnce(normalizeResponse(body, init, false))
      } else {
        fetch.mockImplementationOnce(normalizeResponse(response, undefined, false))
      }
    })
    return fetch
  }

  fetch.route = (urlOrPredicate, bodyOrFunction, init) => {
    routes.push({
      predicate: toPredicate(urlOrPredicate),
      bodyOrFunction: bodyOrFunction === undefined ? '' : bodyOrFunction,
      init,
      once: false,
    })
    return fetch
  }

  fetch.routeOnce = (urlOrPredicate, bodyOrFunction, init) => {
    routes.push({
      predicate: toPredicate(urlOrPredicate),
      bodyOrFunction: bodyOrFunction === undefined ? '' : bodyOrFunction,
      init,
      once: true,
    })
    return fetch
  }

  fetch.clearRoutes = () => {
    routes.length = 0
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
    routes.length = 0

    // reset to default implementation with each reset
    fetch.mockImplementation(defaultImplementation)
    fetch.doMock()
  }

  // Jest's resetMocks: true config wipes mock implementations before every
  // test, after setup files ran - historically the library's most-reported
  // problem. When a beforeEach is available (setupFilesAfterEnv or a test
  // file), re-arm the defaults automatically after Jest resets them.
  let reArmInstalled = false
  // hooks may not be registered while a test is executing - jest-circus
  // records the violation against the running test even if the throw is
  // caught, so detect that state and skip instead
  const inRunningTest = () => {
    try {
      return (
        typeof globalThis.expect === 'function' &&
        typeof globalThis.expect.getState === 'function' &&
        Boolean(globalThis.expect.getState().currentTestName)
      )
    } catch (error) {
      return false
    }
  }

  const installReArmHook = () => {
    if (
      reArmInstalled ||
      typeof globalThis.beforeEach !== 'function' ||
      inRunningTest()
    ) {
      return
    }
    try {
      globalThis.beforeEach(() => {
        if (typeof fetch.getMockImplementation() === 'undefined') {
          fetch.mockImplementation(defaultImplementation)
        }
        if (typeof isMocking.getMockImplementation() === 'undefined') {
          isMocking.mockImplementation(staticMatches(true))
        }
      })
      reArmInstalled = true
    } catch (error) {
      // a later setup-phase enableMocks() call can still install it
    }
  }

  fetch.enableMocks = fetch.enableFetchMocks = () => {
    globalThis.fetchMock = globalThis.fetch = fetch
    if (primitives.usingFallback) {
      // fill only the gaps; anything the environment provides is left alone
      if (typeof globalThis.Response === 'undefined') {
        globalThis.Response = primitives.Response
      }
      if (typeof globalThis.Request === 'undefined') {
        globalThis.Request = primitives.Request
      }
      if (typeof globalThis.Headers === 'undefined') {
        globalThis.Headers = primitives.Headers
      }
    }
    if (typeof jestLike.setMock === 'function') {
      try {
        jestLike.setMock('node-fetch', fetch)
      } catch (error) {
        // node-fetch not installed - nothing to redirect
      }
    }
    installReArmHook()
    return fetch
  }

  fetch.disableMocks = fetch.disableFetchMocks = () => {
    globalThis.fetch = fetch.realFetch
    if (typeof jestLike.dontMock === 'function') {
      try {
        jestLike.dontMock('node-fetch')
      } catch (error) {
        // ignore
      }
    }
    return fetch
  }

  return fetch
}

module.exports = createFetchMock
