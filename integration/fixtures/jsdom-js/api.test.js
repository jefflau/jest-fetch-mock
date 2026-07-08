describe('jsdom consumer', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocks a JSON response', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ ok: true }))
    const res = await fetch('https://example.com/api')
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/api')
  })

  it('accepts a Response object', async () => {
    fetchMock.mockResponseOnce(new Response('raw body'))
    const res = await fetch('https://example.com')
    expect(await res.text()).toBe('raw body')
  })

  it('rejects on an already-aborted signal', async () => {
    const c = new AbortController()
    c.abort()
    await expect(
      fetch('https://example.com', { signal: c.signal })
    ).rejects.toThrow()
  })

  it('supports conditional mocking', async () => {
    fetchMock.doMockIf(/example\.com/, 'mocked')
    const res = await fetch('https://example.com/x')
    expect(await res.text()).toBe('mocked')
  })

  it('mocks rejections', async () => {
    fetchMock.mockRejectOnce(new Error('boom'))
    await expect(fetch('https://example.com')).rejects.toThrow('boom')
  })

  it('chains once()', async () => {
    fetchMock.once('first').once('second')
    expect(await (await fetch('https://a.test')).text()).toBe('first')
    expect(await (await fetch('https://b.test')).text()).toBe('second')
  })
})
