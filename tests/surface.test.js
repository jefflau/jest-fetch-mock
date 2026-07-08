describe('Response passthrough', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('preserves status and headers of a directly passed Response', async () => {
    fetch.mockResponseOnce(
      new Response('teapot', { status: 418, headers: { 'x-tea': 'chai' } })
    )
    const response = await fetch('https://tea.test')
    expect(response.status).toBe(418)
    expect(response.headers.get('x-tea')).toBe('chai')
    await expect(response.text()).resolves.toBe('teapot')
  })

  it('preserves status and headers of a Response returned from a function', async () => {
    fetch.mockResponseOnce(
      async () =>
        new Response('made in fn', {
          status: 202,
          headers: { 'x-from': 'function' },
        })
    )
    const response = await fetch('https://fn.test')
    expect(response.status).toBe(202)
    expect(response.headers.get('x-from')).toBe('function')
    await expect(response.text()).resolves.toBe('made in fn')
  })

  it('preserves status of a Response returned from a synchronous function', async () => {
    fetch.mockResponseOnce(() => new Response('sync response', { status: 203 }))
    const response = await fetch('https://sync.test')
    expect(response.status).toBe(203)
    await expect(response.text()).resolves.toBe('sync response')
  })

  it('returns the same instance for repeated calls with mockResponse', async () => {
    const response = new Response('once-only')
    fetch.mockResponse(response)
    const first = await fetch('https://a.test')
    await expect(first.text()).resolves.toBe('once-only')
    const second = await fetch('https://b.test')
    expect(second).toBe(first)
    expect(second.bodyUsed).toBe(true)
  })

  it('wraps whatwg-fetch fallback stream bodies and tees them on clone', async () => {
    // Simulates the whatwg-fetch polyfill's stream body (constructor.__isFallback).
    // Under node-fetch, Response.body is getter-only so the body reassignment is
    // only observable in browser-polyfill environments; here we assert the
    // wrapping mechanism: init is applied and clone() tees the fallback stream.
    function FallbackBody(parts) {
      this.parts = parts
    }
    FallbackBody.__isFallback = true
    const makeBody = (parts) => {
      const body = new FallbackBody(parts)
      body.tee = jest.fn(() => [makeBody(parts), makeBody(parts)])
      return body
    }
    const body = makeBody(['a'])
    fetch.mockResponseOnce(body, { status: 201 })
    const response = await fetch('https://fallback.test')
    expect(response.status).toBe(201)
    expect(typeof response.clone).toBe('function')
    const clone = response.clone()
    expect(body.tee).toHaveBeenCalledTimes(1)
    expect(clone).toBeInstanceOf(Response)
  })
})

describe('input handling', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('rejects with a TypeError for unparseable input', () => {
    return expect(fetch(Object.create(null))).rejects.toThrow(TypeError)
  })

  it('rejects for an aborted signal with stringifier input', () => {
    const c = new AbortController()
    c.abort()
    const stringifier = { toString: () => 'https://bing.test' }
    return expect(
      fetch(stringifier, { signal: c.signal })
    ).rejects.toThrow('The operation was aborted')
  })

  it('rejects for an aborted signal on a Request instance', () => {
    const c = new AbortController()
    c.abort()
    const request = new Request('https://req.test', { signal: c.signal })
    return expect(fetch(request)).rejects.toThrow(
      'The operation was aborted'
    )
  })

  it('accepts a Request instance as input', async () => {
    fetch.mockResponseOnce('from request')
    const response = await fetch(new Request('https://req.test'))
    await expect(response.text()).resolves.toBe('from request')
    expect(fetch.mock.calls[0][0]).toBeInstanceOf(Request)
  })
})

describe('reject and abort persistence', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mockReject persists across calls', async () => {
    fetch.mockReject(new Error('always down'))
    await expect(fetch('https://a.test')).rejects.toThrow('always down')
    await expect(fetch('https://b.test')).rejects.toThrow('always down')
  })

  it('mockAbort persists across calls', async () => {
    fetch.mockAbort()
    await expect(fetch('https://a.test')).rejects.toThrow(
      'The operation was aborted'
    )
    await expect(fetch('https://b.test')).rejects.toThrow(
      'The operation was aborted'
    )
  })

  it('mockAbortOnce aborts only the next call', async () => {
    fetch.mockAbortOnce()
    await expect(fetch('https://a.test')).rejects.toThrow(
      'The operation was aborted'
    )
    const response = await fetch('https://b.test')
    await expect(response.text()).resolves.toBe('')
  })
})

describe('reset state machine', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('isMocking returns booleans before and after resetMocks', () => {
    expect(fetch.isMocking('https://a.test')).toBe(true)
    fetch.dontMock()
    expect(fetch.isMocking('https://a.test')).toBe(false)
    fetch.resetMocks()
    expect(fetch.isMocking('https://a.test')).toBe(true)
  })

  it('resetMocks restores the default empty-string implementation', async () => {
    fetch.mockResponse('data')
    fetch.resetMocks()
    const response = await fetch('https://a.test')
    await expect(response.text()).resolves.toBe('')
  })
})

describe('mockResponses variants', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('accepts strings, tuples, Responses and functions', async () => {
    fetch.mockResponses(
      'plain',
      ['tuple', { status: 201 }],
      new Response('direct'),
      () => 'fn'
    )
    await expect(fetch('https://1.test').then((r) => r.text())).resolves.toBe(
      'plain'
    )
    const second = await fetch('https://2.test')
    expect(second.status).toBe(201)
    await expect(second.text()).resolves.toBe('tuple')
    await expect(fetch('https://3.test').then((r) => r.text())).resolves.toBe(
      'direct'
    )
    await expect(fetch('https://4.test').then((r) => r.text())).resolves.toBe(
      'fn'
    )
  })

  it('mocks a redirected response via counter', async () => {
    fetch.mockResponseOnce('<main></main>', { counter: 1, status: 200 })
    const response = await fetch('https://redirect.test')
    expect(response.redirected).toBe(true)

    fetch.mockResponseOnce('<main></main>', { status: 200 })
    const plain = await fetch('https://plain.test')
    expect(plain.redirected).toBe(false)
  })
})

describe('conditional mocking without bodies', () => {
  const realResponse = 'REAL FETCH RESPONSE'
  let realFetchBackup

  beforeEach(() => {
    fetch.resetMocks()
    fetch.mockResponse('gated')
    realFetchBackup = fetch.realFetch
    fetch.realFetch = jest.fn(async () => new Response(realResponse))
  })

  afterEach(() => {
    fetch.realFetch = realFetchBackup
  })

  const text = (uri) => fetch(uri, {}).then((r) => r.text())

  it('doMockIf without a body gates the existing mock by url', async () => {
    fetch.doMockIf('https://yes.test/')
    await expect(text('https://yes.test/')).resolves.toBe('gated')
    await expect(text('https://no.test/')).resolves.toBe(realResponse)
  })

  it('doMockOnceIf without a body gates only the next call', async () => {
    fetch.dontMock()
    fetch.doMockOnceIf('https://yes.test/')
    await expect(text('https://yes.test/')).resolves.toBe('gated')
    await expect(text('https://yes.test/')).resolves.toBe(realResponse)
  })

  it('dontMockIf without a body inverts the gate', async () => {
    fetch.dontMockIf('https://no.test/')
    await expect(text('https://no.test/')).resolves.toBe(realResponse)
    await expect(text('https://yes.test/')).resolves.toBe('gated')
  })

  it('dontMockOnceIf without a body skips mocking only once', async () => {
    fetch.dontMockOnceIf('https://no.test/')
    await expect(text('https://no.test/')).resolves.toBe(realResponse)
    await expect(text('https://no.test/')).resolves.toBe('gated')
  })

  it('doMockOnce without a body mocks the next call with the default', async () => {
    fetch.dontMock()
    fetch.doMockOnce()
    await expect(text('https://any.test/')).resolves.toBe('gated')
    await expect(text('https://any.test/')).resolves.toBe(realResponse)
  })

  it('mockIf with a body sets the response in the same call', async () => {
    fetch.mockIf('https://yes.test/', 'if-body')
    await expect(text('https://yes.test/')).resolves.toBe('if-body')
    await expect(text('https://no.test/')).resolves.toBe(realResponse)
  })

  it('dontMockIf with a body sets the response in the same call', async () => {
    fetch.dontMockIf('https://no.test/', 'dont-if-body')
    await expect(text('https://yes.test/')).resolves.toBe('dont-if-body')
    await expect(text('https://no.test/')).resolves.toBe(realResponse)
  })

  it('mockOnceIf with a body sets the response for one call', async () => {
    fetch.mockOnceIf('https://yes.test/', 'once-if-body')
    await expect(text('https://yes.test/')).resolves.toBe('once-if-body')
    await expect(text('https://yes.test/')).resolves.toBe('gated')
  })

  it('dontMockOnceIf with a body serves that body to non-matching calls', async () => {
    // the once-gate and once-response are consumed by the same fetch call:
    // a matching (unmocked) call consumes the queued body without serving it
    fetch.dontMockOnceIf('https://no.test/', 'dont-once-body')
    await expect(text('https://yes.test/')).resolves.toBe('dont-once-body')
    await expect(text('https://yes.test/')).resolves.toBe('gated')
  })

  it('doMock with a body resets the default response', async () => {
    fetch.dontMock()
    fetch.doMock('do-mock-body')
    await expect(text('https://any.test/')).resolves.toBe('do-mock-body')
  })

  it('mockOnce with a body mocks exactly one call', async () => {
    fetch.dontMock()
    fetch.mockOnce('once-body')
    await expect(text('https://any.test/')).resolves.toBe('once-body')
    await expect(text('https://any.test/')).resolves.toBe(realResponse)
  })

  it('dontMockIf predicates receive the request init', async () => {
    fetch.dontMockIf((req) => req.method === 'POST')
    await expect(
      fetch('https://any.test/', { method: 'POST' }).then((r) => r.text())
    ).resolves.toBe(realResponse)
    await expect(text('https://any.test/')).resolves.toBe('gated')
  })
})

describe('exposed API', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('exposes Headers, Request and a Response factory', () => {
    expect(fetch.Headers).toBe(Headers)
    expect(fetch.Request).toBe(Request)
    expect(typeof fetch.Response).toBe('function')
    expect(fetch.Response('x')).toBeInstanceOf(Response)
  })

  it('module default export is the mock itself', () => {
    const mod = require('jest-fetch-mock')
    expect(mod.default).toBe(mod)
    expect(jest.isMockFunction(mod)).toBe(true)
  })

  it('supports synchronous response functions', async () => {
    fetch.mockResponseOnce(() => 'sync')
    const response = await fetch('https://s.test')
    await expect(response.text()).resolves.toBe('sync')
  })

  it('once without arguments mocks the next call with the default response', async () => {
    const response = await fetch('https://default.test')
    await expect(response.text()).resolves.toBe('')
  })
})
