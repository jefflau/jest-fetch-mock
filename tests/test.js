const { APIRequest, APIRequest2, defaultRequestUri, request } = require('./api')

describe('testing mockResponse and alias once', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })
  it('mocks a response', async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ secret_data: 'abcde' }, { status: 200 })
    )

    const response = await APIRequest('google')

    expect(response).toEqual({ secret_data: 'abcde' })
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('mocks a response with chaining', async () => {
    fetch
      .mockResponseOnce(
        JSON.stringify({ secret_data: '12345' }, { status: 200 })
      )
      .mockResponseOnce(
        JSON.stringify({ secret_data: '67891' }, { status: 200 })
      )

    const response = await APIRequest('facebook')

    expect(response).toEqual([
      { secret_data: '12345' },
      { secret_data: '67891' }
    ])

    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })

  it('mocks a response with alias .once', async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ secret_data: 'abcde' }, { status: 200 })
    )

    const response = await APIRequest('google')

    expect(response).toEqual({ secret_data: 'abcde' })
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('mocks a response with chaining with alias .once', async () => {
    fetch
      .once(JSON.stringify({ secret_data: '12345' }), { status: 200 })
      .once(JSON.stringify({ secret_data: '67891' }), { status: 200 })

    const response = await APIRequest('facebook')

    expect(response).toEqual([
      { secret_data: '12345' },
      { secret_data: '67891' }
    ])

    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })
})

describe('testing mockResponses', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })
  it('mocks multiple responses', async () => {
    fetch.mockResponses(
      [JSON.stringify({ name: 'naruto', average_score: 79 })],
      [JSON.stringify({ name: 'bleach', average_score: 68 })]
    )

    const response = await APIRequest('facebook')
    expect(response).toEqual([
      { name: 'naruto', average_score: 79 },
      { name: 'bleach', average_score: 68 }
    ])
    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })
})

describe('Mocking aborts', () => {
  beforeEach(() => {
    fetch.resetMocks()
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects with a dom exception', () => {
    fetch.mockAbort()
    expect(fetch('/')).rejects.toThrow(expect.any(DOMException))
  })
  it('rejects once then mocks with empty response', async () => {
    fetch.mockAbortOnce()
    await expect(fetch('/')).rejects.toThrow(expect.any(DOMException))
    await expect(request()).resolves.toEqual('')
  })

  it('throws when passed an already aborted abort signal in the request init', () => {
    const c = new AbortController()
    c.abort()
    expect(() => fetch('/', { signal: c.signal })).toThrow(
      expect.any(DOMException)
    )
  })

  it('rejects when aborted before resolved', async () => {
    const c = new AbortController()
    fetch.mockResponse(async () => {
      jest.advanceTimersByTime(60)
      return ''
    })
    setTimeout(() => c.abort(), 50)
    await expect(fetch('/', { signal: c.signal })).rejects.toThrow(
      expect.any(DOMException)
    )
  })
})

describe('Mocking rejects', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocking rejects', async () => {
    fetch.mockRejectOnce('fake error')
    try {
      await APIRequest2('google')
    } catch (e) {
      expect(e).toEqual('fake error')
    }
  })
})

describe('request', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('passes input and init to response function', () => {
    const url = 'http://foo.bar/'
    const requestInit = {
      headers: {
        foo: 'bar'
      }
    }
    const responseInit = {
      headers: {
        bing: 'dang'
      }
    }
    const response = 'foobarbang'
    fetch.mockResponse(input => {
      expect(input).toHaveProperty('url', url)
      expect(input.headers.get('foo')).toEqual('bar')
      return Promise.resolve(response)
    }, responseInit)
    return fetch(url, requestInit).then(resp => {
      expect(resp.headers.get('bing')).toEqual(responseInit.headers.bing)
      return expect(resp.text()).resolves.toEqual(response)
    })
  })

  it('returns object when response is json', done => {
    const mockResponse = {
      results: [{ gender: 'neutral' }],
      info: { seed: '0123456789123456', results: 1, page: 1, version: '1.2' }
    }
    fetch.mockResponseOnce(JSON.stringify(mockResponse), {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    request()
      .then(response => {
        expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
        expect(response).toEqual(mockResponse)
        done()
      })
      .catch(done.fail)
  })

  it('returns text when response is text', done => {
    fetch.mockResponseOnce('ok')

    request()
      .then(response => {
        expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
        expect(response).toEqual('ok')
        done()
      })
      .catch(done.fail)
  })

  it('returns blob when response is text/csv', async () => {
    const contentType = 'text/csv; charset=utf-8'
    fetch.mockResponseOnce('csv data', {
      headers: {
        'Content-Type': contentType
      }
    })

    try {
      const response = await request()
      expect(response.type).toBe(contentType)
    } catch (e) {
      console.log(e)
    }

    expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
  })

  it('rejects with error data', done => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(JSON.stringify(errorData))

    request()
      .then(done.fail)
      .catch(error => {
        expect(error.message).toBe(errorData.error)
        done()
      })
  })

  it('resolves with function', async () => {
    fetch.mockResponseOnce(() => Promise.resolve({ body: 'ok' }))

    try {
      const response = await request()
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    }
  })

  it('resolves with function and timeout', async () => {
    jest.useFakeTimers()
    fetch.mockResponseOnce(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }), 5000))
    )
    try {
      const req = request()
      jest.runAllTimers()
      const response = await req
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    } finally {
      jest.useRealTimers()
    }
  })

  it('rejects with function', async () => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(() => Promise.reject(JSON.stringify(errorData)))
    try {
      await request()
    } catch (error) {
      expect(error.message).toBe(errorData.error)
    }
  })

  it('rejects with function and timeout', async () => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(JSON.stringify(errorData)))
        ),
      100
    )
    try {
      await request()
    } catch (error) {
      expect(error.message).toBe(errorData.error)
    }
  })

  it('resolves with function returning object body and init headers', async () => {
    fetch.mockResponseOnce(
      () =>
        Promise.resolve({ body: 'ok', init: { headers: { ding: 'dang' } } }),
      { headers: { bash: 'bang' } }
    )

    try {
      const response = await fetch('https://test.url', {})
      expect(response.headers.get('ding')).toEqual('dang')
      expect(response.headers.get('bash')).toBeNull()
      await expect(response.text()).resolves.toEqual('ok')
    } catch (e) {
      throw e
    }
  })

  it('resolves with function returning object body and extends mock params', async () => {
    fetch.mockResponseOnce(
      () =>
        Promise.resolve({
          body: 'ok',
          headers: { ding: 'dang' },
          status: 201,
          statusText: 'text',
          url: 'http://foo'
        }),
      { headers: { bash: 'bang' } }
    )

    try {
      const response = await fetch('https://bar', {})
      expect(response.headers.get('ding')).toEqual('dang')
      expect(response.headers.get('bash')).toBeNull()
      expect(response.status).toBe(201)
      expect(response.statusText).toEqual('text')
      expect(response.url).toEqual('http://foo')
      await expect(response.text()).resolves.toEqual('ok')
    } catch (e) {
      throw e
    }
  })

  it('resolves with mock response headers and function returning string', async () => {
    fetch.mockResponseOnce(() => Promise.resolve('ok'), {
      headers: { ding: 'dang' }
    })

    try {
      const response = await fetch('https://bar', {})
      expect(response.headers.get('ding')).toEqual('dang')
      await expect(response.text()).resolves.toEqual('ok')
    } catch (e) {
      throw e
    }
  })
})

describe('conditional mocking', () => {
  const realResponse = 'REAL FETCH RESPONSE'
  const mockedDefaultResponse = 'MOCKED DEFAULT RESPONSE'
  const testUrl = defaultRequestUri
  let crossFetchSpy

  beforeEach(() => {
    fetch.resetMocks()
    fetch.mockResponse(mockedDefaultResponse)
    crossFetchSpy = jest
      .spyOn(require('cross-fetch'), 'fetch')
      .mockImplementation(async () =>
        Promise.resolve(new Response(realResponse))
      )
  })

  afterEach(() => {
    crossFetchSpy.mockRestore()
  })

  const expectMocked = async (uri, response = mockedDefaultResponse) => {
    return expect(request(uri)).resolves.toEqual(response)
  }
  const expectUnmocked = async uri => {
    return expect(request(uri)).resolves.toEqual(realResponse)
  }

  describe('once', () => {
    it('default', async () => {
      const otherResponse = 'other response'
      fetch.once(otherResponse)
      await expectMocked(defaultRequestUri, otherResponse)
      await expectMocked()
    })
    it('dont mock once then mock twice', async () => {
      const otherResponse = 'other response'
      fetch
        .dontMockOnce()
        .once(otherResponse)
        .once(otherResponse)

      await expectUnmocked()
      await expectMocked(defaultRequestUri, otherResponse)
      await expectMocked()
    })
  })

  describe('mockIf', () => {
    it("doesn't mock normally", async () => {
      fetch.mockIf('http://foo')
      await expectUnmocked()
      await expectUnmocked()
    })
    it('mocks when matches string', async () => {
      fetch.mockIf(testUrl)
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches regex', async () => {
      fetch.mockIf(new RegExp(testUrl))
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.mockIf(input => input === testUrl)
      await expectMocked()
      await expectMocked()
    })
  })

  describe('dontMockIf', () => {
    it('mocks normally', async () => {
      fetch.dontMockIf('http://foo')
      await expectMocked()
      await expectMocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockIf(testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockIf(input => input === testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
  })

  describe('mockOnceIf (default mocked)', () => {
    it("doesn't mock normally", async () => {
      fetch.mockOnceIf('http://foo')
      await expectUnmocked()
      await expectMocked()
    })
    it('mocks when matches string', async () => {
      const response = 'blah'
      const response2 = 'blah2'
      fetch
        .mockOnceIf('http://foo', response)
        .mockOnceIf('http://foo2', response2)
      await expectMocked('http://foo', response)
      await expectMocked('http://foo2', response2)
      //await expectMocked('http://foo3', mockedDefaultResponse)
    })
    it('mocks when matches regex', async () => {
      fetch.mockOnceIf(new RegExp(testUrl))
      await expectMocked()
      await expectMocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.mockOnceIf(input => input === testUrl)
      await expectMocked()
      await expectMocked()
    })
  })

  describe('dontMockOnceIf (default mocked)', () => {
    it('mocks normally', async () => {
      fetch.dontMockOnceIf('http://foo')
      await expectMocked()
      await expectMocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockOnceIf(testUrl)
      await expectUnmocked()
      await expectMocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockOnceIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectMocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockOnceIf(input => input === testUrl)
      await expectUnmocked()
      await expectMocked()
    })
  })

  describe('mockOnceIf (default unmocked)', () => {
    beforeEach(() => {
      fetch.dontMock()
    })
    it("doesn't mock normally", async () => {
      fetch.mockOnceIf('http://foo')
      await expectUnmocked()
      await expectUnmocked()
    })
    it('mocks when matches string', async () => {
      fetch.mockOnceIf(testUrl)
      await expectMocked()
      await expectUnmocked()
    })
    it('mocks when matches regex', async () => {
      fetch.mockOnceIf(new RegExp(testUrl))
      await expectMocked()
      await expectUnmocked()
    })
    it('mocks when matches predicate', async () => {
      fetch.mockOnceIf(input => input === testUrl)
      await expectMocked()
      await expectUnmocked()
    })
  })

  describe('dontMockOnceIf (default unmocked)', () => {
    beforeEach(() => {
      fetch.dontMock()
    })
    it('mocks normally', async () => {
      fetch.dontMockOnceIf('http://foo')
      await expectMocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches string', async () => {
      fetch.dontMockOnceIf(testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches regex', async () => {
      fetch.dontMockOnceIf(new RegExp(testUrl))
      await expectUnmocked()
      await expectUnmocked()
    })
    it('doesnt mock when matches predicate', async () => {
      fetch.dontMockOnceIf(input => input === testUrl)
      await expectUnmocked()
      await expectUnmocked()
    })
  })

  describe('dont/do mock', () => {
    test('dontMock', async () => {
      fetch.dontMock()
      await expectUnmocked()
      await expectUnmocked()
    })
    test('dontMockOnce', async () => {
      fetch.dontMockOnce()
      await expectUnmocked()
      await expectMocked()
    })
    test('doMock', async () => {
      fetch.dontMock()
      fetch.doMock()
      await expectMocked()
      await expectMocked()
    })
    test('doMockOnce', async () => {
      fetch.dontMock()
      fetch.doMockOnce()
      await expectMocked()
      await expectUnmocked()
    })
  })

  describe('complex example', () => {
    const alternativeUrl = 'http://bar/'
    const alternativeBody = 'ALTERNATIVE RESPONSE'
    beforeEach(() => {
      fetch
        // .mockResponse(mockedDefaultResponse) // set above - here for clarity
        .mockResponseOnce('1') // 1
        .mockResponseOnce('2') // 2
        .mockResponseOnce(async request =>
          request.url === alternativeUrl ? alternativeBody : '3'
        ) // 3
        .mockResponseOnce('4') // 4
        .mockResponseOnce('5') // 5
        .mockResponseOnce(async request =>
          request.url === alternativeUrl
            ? alternativeBody
            : mockedDefaultResponse
        ) // 6
    })

    describe('default (`doMock`)', () => {
      beforeEach(() => {
        fetch
          // .doMock()    // the default - here for clarify
          .dontMockOnceIf(alternativeUrl)
          .mockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectMocked(defaultRequestUri, '5') // 5
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectMocked(alternativeUrl, '5') // 5
        await expectMocked(alternativeUrl, alternativeBody) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(alternativeUrl, mockedDefaultResponse) // 7
      })
    })

    describe('dontMock', () => {
      beforeEach(() => {
        fetch
          .dontMock()
          .dontMockOnceIf(alternativeUrl)
          .mockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectUnmocked(defaultRequestUri) // 5
        await expectUnmocked(defaultRequestUri) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(defaultRequestUri) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectUnmocked(alternativeUrl) // 5
        await expectUnmocked(alternativeUrl) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(alternativeUrl) // 7
      })
    })

    describe('mockIf(alternativeUrl)', () => {
      beforeEach(() => {
        fetch
          .mockIf(alternativeUrl)
          .dontMockOnceIf(alternativeUrl)
          .mockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectUnmocked(defaultRequestUri) // 5
        await expectUnmocked(defaultRequestUri) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(defaultRequestUri) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectMocked(alternativeUrl, '5') // 5
        await expectMocked(alternativeUrl, alternativeBody) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(alternativeUrl, mockedDefaultResponse) // 7
      })
    })

    describe('dontMockIf(alternativeUrl)', () => {
      beforeEach(() => {
        fetch
          .dontMockIf(alternativeUrl)
          .dontMockOnceIf(alternativeUrl)
          .mockOnceIf(alternativeUrl)
          .doMockOnce()
          .dontMockOnce()
      })

      test('defaultRequestUri', async () => {
        await expectMocked(defaultRequestUri, '1') // 1
        await expectUnmocked(defaultRequestUri) // 2
        await expectMocked(defaultRequestUri, '3') // 3
        await expectUnmocked(defaultRequestUri) // 4
        // after .once('..')
        await expectMocked(defaultRequestUri, '5') // 5
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 6
        // default 'isMocked' (not 'Once')
        await expectMocked(defaultRequestUri, mockedDefaultResponse) // 7
      })

      test('alternativeUrl', async () => {
        await expectUnmocked(alternativeUrl) // 1
        await expectMocked(alternativeUrl, '2') // 2
        await expectMocked(alternativeUrl, alternativeBody) // 3
        await expectUnmocked(alternativeUrl) // 4
        // after .once('..')
        await expectUnmocked(alternativeUrl) // 5
        await expectUnmocked(alternativeUrl) // 6
        // default 'isMocked' (not 'Once')
        await expectUnmocked(alternativeUrl) // 7
      })
    })
  })
})

it('enable/disable', () => {
  const jestFetchMock = require('jest-fetch-mock')
  jestFetchMock.disableMocks()
  expect(jest.isMockFunction(fetch)).toBe(false)
  jestFetchMock.enableMocks()
  expect(jest.isMockFunction(fetch)).toBe(true)
  jestFetchMock.disableMocks()
  global.fetch = jestFetchMock
})
