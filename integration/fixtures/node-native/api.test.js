describe('node environment consumer (native fetch host)', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('mocks fetch in the node env', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ env: 'node' }))
    const res = await fetch('https://example.com/api')
    expect(await res.json()).toEqual({ env: 'node' })
  })

  it('mockAbort works (DOMException present)', async () => {
    fetchMock.mockAbortOnce()
    await expect(fetch('https://example.com')).rejects.toThrow(
      'The operation was aborted'
    )
  })

  it('rejects on an already-aborted signal', async () => {
    const c = new AbortController()
    c.abort()
    await expect(
      fetch('https://example.com', { signal: c.signal })
    ).rejects.toThrow()
  })

  it('accepts a Response object with a Buffer body', async () => {
    fetchMock.mockResponseOnce(new Response(Buffer.from('binary')))
    const buf = await (await fetch('https://example.com')).arrayBuffer()
    expect(Buffer.from(buf).toString('utf8')).toBe('binary')
  })

  it('disableMocks leaves a callable non-mock fetch', () => {
    fetchMock.disableMocks()
    expect(typeof fetch).toBe('function')
    expect(jest.isMockFunction(fetch)).toBe(false)
    fetchMock.enableMocks()
    expect(jest.isMockFunction(fetch)).toBe(true)
  })
})
