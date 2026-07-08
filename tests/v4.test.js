describe('abort reasons', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('keeps the historical message for a plain abort', () => {
    const c = new AbortController()
    c.abort()
    return expect(fetch('https://x.test', { signal: c.signal })).rejects.toThrow(
      'The operation was aborted'
    )
  })

  it('surfaces AbortSignal.timeout as a TimeoutError', async () => {
    const signal = AbortSignal.timeout(5)
    await new Promise((resolve) => setTimeout(resolve, 25))
    await expect(
      fetch('https://x.test', { signal })
    ).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('surfaces a custom abort reason as-is', () => {
    const c = new AbortController()
    c.abort(new Error('custom reason'))
    return expect(
      fetch('https://x.test', { signal: c.signal })
    ).rejects.toThrow('custom reason')
  })
})

describe('default response init', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  afterEach(() => {
    fetch.defaultResponseInit = undefined
  })

  it('merges default headers under every mocked response', async () => {
    fetch.defaultResponseInit = {
      headers: { 'Content-Type': 'application/json' },
    }
    fetch.mockResponseOnce('{"ok":true}')
    const response = await fetch('https://api.test/')
    expect(response.headers.get('content-type')).toBe('application/json')
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('per-mock init wins over the default', async () => {
    fetch.defaultResponseInit = { status: 201 }
    fetch.mockResponseOnce('body', { status: 418 })
    const response = await fetch('https://api.test/')
    expect(response.status).toBe(418)
  })

  it('applies to function results with MockResponseInit shapes', async () => {
    fetch.defaultResponseInit = {
      headers: { 'X-Default': 'yes' },
    }
    fetch.mockResponseOnce(() => ({ body: 'fn', status: 202 }))
    const response = await fetch('https://api.test/')
    expect(response.status).toBe(202)
    expect(response.headers.get('x-default')).toBe('yes')
  })
})

describe('nonstandard response init on native classes', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('patches url and redirected onto the response', async () => {
    fetch.mockResponseOnce('<main></main>', {
      url: 'http://foo/',
      counter: 1,
      status: 200,
    })
    const response = await fetch('https://elsewhere.test/')
    expect(response.url).toBe('http://foo/')
    expect(response.redirected).toBe(true)
  })
})

describe('relative URLs in native mode', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('resolves relative inputs against a synthetic base', async () => {
    let seenUrl
    fetch.mockResponseOnce((req) => {
      seenUrl = req.url
      return 'ok'
    })
    await fetch('/api/items')
    expect(seenUrl).toBe('http://localhost/api/items')
  })
})

describe('createFetchMock factory', () => {
  it('builds an isolated instance from an injected jest object', async () => {
    const createFetchMock = require('jest-fetch-mock/factory')
    const fm = createFetchMock(jest)
    expect(fm).not.toBe(fetchMock)
    const globalCallsBefore = fetchMock.mock.calls.length
    fm.mockResponseOnce('isolated')
    await expect(fm('https://x.test').then((r) => r.text())).resolves.toBe(
      'isolated'
    )
    // the global mock is untouched by the local instance
    expect(fetchMock.mock.calls.length).toBe(globalCallsBefore)
  })

  it('is exported from the main entry too', () => {
    const { createFetchMock } = require('jest-fetch-mock')
    expect(typeof createFetchMock).toBe('function')
  })

  it('works with a minimal mock-function factory', async () => {
    const createFetchMock = require('jest-fetch-mock/factory')
    const fm = createFetchMock({ fn: (impl) => jest.fn(impl) })
    fm.mockResponseOnce('minimal')
    await expect(fm('https://x.test').then((r) => r.text())).resolves.toBe(
      'minimal'
    )
  })

  it('rejects non-jest-like arguments', () => {
    const createFetchMock = require('jest-fetch-mock/factory')
    expect(() => createFetchMock()).toThrow(TypeError)
    expect(() => createFetchMock({})).toThrow(TypeError)
  })
})

describe('primitive resolution', () => {
  const createFetchMock = require('jest-fetch-mock/factory')

  it.each(['Response', 'Request', 'Headers'])(
    'falls back when %s is missing from the environment',
    (name) => {
      const saved = globalThis[name]
      delete globalThis[name]
      try {
        const fm = createFetchMock(jest)
        expect(fm.usingNativeFetch).toBe(false)
      } finally {
        globalThis[name] = saved
      }
    }
  )
})

describe('enableMocks with minimal jest-likes', () => {
  it('handles factories without setMock/dontMock, and throwing ones', () => {
    const createFetchMock = require('jest-fetch-mock/factory')
    const savedFetch = globalThis.fetch
    const savedFetchMock = globalThis.fetchMock
    try {
      const bare = createFetchMock({ fn: (impl) => jest.fn(impl) })
      expect(bare.enableMocks()).toBe(bare)
      expect(globalThis.fetch).toBe(bare)
      expect(bare.disableMocks()).toBe(bare)

      const throwing = createFetchMock({
        fn: (impl) => jest.fn(impl),
        setMock: () => {
          throw new Error('no module registry')
        },
        dontMock: () => {
          throw new Error('no module registry')
        },
      })
      expect(throwing.enableMocks()).toBe(throwing)
      expect(throwing.disableMocks()).toBe(throwing)
    } finally {
      globalThis.fetch = savedFetch
      globalThis.fetchMock = savedFetchMock
    }
  })
})

describe('resetMocks: true hardening', () => {
  // registered BEFORE enableMocks so it runs first, simulating Jest's
  // config-driven reset (which happens before any beforeEach hook)
  beforeEach(() => {
    fetch.mockReset()
  })

  fetchMock.enableMocks()

  it('re-arms the default implementation after a config reset', async () => {
    const response = await fetch('https://x.test/')
    await expect(response.text()).resolves.toBe('')
  })

  it('re-arms the conditional gate too', () => {
    expect(fetch.isMocking('https://x.test/')).toBe(true)
  })
})
