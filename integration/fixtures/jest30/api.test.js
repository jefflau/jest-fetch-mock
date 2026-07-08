const { describe, it, expect, beforeEach } = require('@jest/globals')

describe('jest 30 consumer', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('mocks fetch under jest 30', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ jest: 30 }))
    const res = await fetch('https://example.com/api')
    expect(await res.json()).toEqual({ jest: 30 })
  })

  it('once-queue works', async () => {
    fetchMock.once('a').once('b')
    expect(await (await fetch('https://a.test')).text()).toBe('a')
    expect(await (await fetch('https://b.test')).text()).toBe('b')
  })

  it('rejects on an already-aborted signal', async () => {
    const c = new AbortController()
    c.abort()
    await expect(
      fetch('https://example.com', { signal: c.signal })
    ).rejects.toThrow()
  })
})
