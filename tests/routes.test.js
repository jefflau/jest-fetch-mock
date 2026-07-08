describe('route registry', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  const text = (uri, init) => fetch(uri, init).then((r) => r.text())

  it('serves multiple coexisting routes plus the default for the rest', async () => {
    fetch
      .route('https://api.test/users', JSON.stringify([{ id: 1 }]))
      .route('https://api.test/teams', JSON.stringify([{ id: 42 }]))
    await expect(text('https://api.test/users')).resolves.toBe('[{"id":1}]')
    await expect(text('https://api.test/teams')).resolves.toBe('[{"id":42}]')
    await expect(text('https://api.test/other')).resolves.toBe('')
  })

  it('first registered match wins on overlap', async () => {
    fetch
      .route(/api\.test/, 'general')
      .route('https://api.test/specific', 'specific')
    await expect(text('https://api.test/specific')).resolves.toBe('general')
  })

  it('matches with regexes and predicates', async () => {
    fetch
      .route(/\/teams$/, 'by-regex')
      .route((req) => req.method === 'POST', 'by-method')
    await expect(text('https://x.test/teams')).resolves.toBe('by-regex')
    await expect(
      text('https://x.test/anything', { method: 'POST' })
    ).resolves.toBe('by-method')
    await expect(text('https://x.test/anything')).resolves.toBe('')
  })

  it('supports function responses and Response objects', async () => {
    fetch
      .route('https://fn.test/', (req) => ({
        body: `fn:${req.url}`,
        status: 201,
      }))
      .route('https://resp.test/', new Response('direct', { status: 418 }))
    const fnResponse = await fetch('https://fn.test/')
    expect(fnResponse.status).toBe(201)
    await expect(fnResponse.text()).resolves.toBe('fn:https://fn.test/')
    const direct = await fetch('https://resp.test/')
    expect(direct.status).toBe(418)
  })

  it('routeOnce is consumed by its first match', async () => {
    fetch
      .routeOnce('https://api.test/', 'first-only')
      .route('https://api.test/', 'base')
    await expect(text('https://api.test/')).resolves.toBe('first-only')
    await expect(text('https://api.test/')).resolves.toBe('base')
  })

  it('the once-queue outranks a matching route', async () => {
    fetch.route('https://api.test/', 'routed')
    fetch.mockResponseOnce('queued')
    await expect(text('https://api.test/')).resolves.toBe('queued')
    await expect(text('https://api.test/')).resolves.toBe('routed')
  })

  it('routes outrank the ambient mockResponse body', async () => {
    fetch.mockResponse('ambient')
    fetch.route('https://api.test/', 'routed')
    await expect(text('https://api.test/')).resolves.toBe('routed')
    await expect(text('https://elsewhere.test/')).resolves.toBe('ambient')
  })

  it('routes fire even when the default is dontMock', async () => {
    const realFetchBackup = fetch.realFetch
    fetch.realFetch = jest.fn(async () => new Response('real'))
    try {
      fetch.dontMock()
      fetch.route('https://api.test/', 'routed')
      await expect(text('https://api.test/')).resolves.toBe('routed')
      await expect(text('https://elsewhere.test/')).resolves.toBe('real')
      expect(fetch.realFetch).toHaveBeenCalledTimes(1)
    } finally {
      fetch.realFetch = realFetchBackup
    }
  })

  it('clearRoutes removes routes without touching the once-queue', async () => {
    fetch.route('https://api.test/', 'routed')
    fetch.mockResponseOnce('queued')
    fetch.clearRoutes()
    await expect(text('https://api.test/')).resolves.toBe('queued')
    await expect(text('https://api.test/')).resolves.toBe('')
  })

  it('resetMocks clears routes', async () => {
    fetch.route('https://api.test/', 'routed')
    fetch.resetMocks()
    await expect(text('https://api.test/')).resolves.toBe('')
  })

  it('rejects on an aborted signal for a routed call', () => {
    fetch.route('https://api.test/', 'routed')
    const c = new AbortController()
    c.abort()
    return expect(
      fetch('https://api.test/', { signal: c.signal })
    ).rejects.toThrow('The operation was aborted')
  })

  it('applies defaultResponseInit to route responses', async () => {
    try {
      fetch.defaultResponseInit = {
        headers: { 'Content-Type': 'application/json' },
      }
      fetch.route('https://api.test/', '{"ok":true}')
      const response = await fetch('https://api.test/')
      expect(response.headers.get('content-type')).toBe('application/json')
    } finally {
      fetch.defaultResponseInit = undefined
    }
  })

  it('a route with no body serves the empty default', async () => {
    fetch.route('https://api.test/')
    const response = await fetch('https://api.test/')
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('')
  })

  it('mockReject overrides routes', async () => {
    fetch.route('https://api.test/', 'routed')
    fetch.mockReject(new Error('network down'))
    await expect(fetch('https://api.test/')).rejects.toThrow('network down')
  })

  it('composes: base routes plus per-test routes coexist', async () => {
    // the beforeEach-composition pattern that motivated #171
    fetch.route('https://api.test/session', '{"user":"jeff"}')
    fetch.route('https://api.test/flags', '{"beta":true}')
    await expect(text('https://api.test/session')).resolves.toBe(
      '{"user":"jeff"}'
    )
    await expect(text('https://api.test/flags')).resolves.toBe('{"beta":true}')
  })
})
