/**
 * @jest-environment jsdom
 */

it('falls back to bundled primitives where the environment has none', async () => {
  expect(fetchMock.usingNativeFetch).toBe(false)
  expect(jest.isMockFunction(fetch)).toBe(true)
  expect(typeof Response).toBe('function')
  expect(typeof Request).toBe('function')
  expect(typeof Headers).toBe('function')

  fetchMock.mockResponseOnce(JSON.stringify({ jsdom: true }))
  const response = await fetch('https://example.com/api')
  await expect(response.json()).resolves.toEqual({ jsdom: true })
})

it('accepts Response objects built from the installed class', async () => {
  fetchMock.resetMocks()
  fetchMock.mockResponseOnce(new Response('raw'))
  const response = await fetch('https://example.com/')
  await expect(response.text()).resolves.toBe('raw')
})

it('passes unmocked requests through to the fallback fetch', async () => {
  fetchMock.resetMocks()
  const backup = fetchMock.realFetch
  fetchMock.realFetch = jest.fn(async () => new Response('real'))
  try {
    fetchMock.dontMockOnce()
    await expect(
      fetch('https://real.test/').then((r) => r.text())
    ).resolves.toBe('real')
    expect(fetchMock.realFetch).toHaveBeenCalled()
  } finally {
    fetchMock.realFetch = backup
  }
})

it('rejects on an already-aborted signal', () => {
  fetchMock.resetMocks()
  const c = new AbortController()
  c.abort()
  return expect(
    fetch('https://example.com/', { signal: c.signal })
  ).rejects.toThrow('The operation was aborted')
})

it('leaves already-installed globals alone on a second enableMocks', () => {
  const createFetchMock = require('jest-fetch-mock/factory')
  const savedFetch = globalThis.fetch
  const savedFetchMock = globalThis.fetchMock
  const ResponseBefore = globalThis.Response
  const RequestBefore = globalThis.Request
  const HeadersBefore = globalThis.Headers
  try {
    const fm2 = createFetchMock(jest)
    fm2.enableMocks()
    expect(globalThis.fetch).toBe(fm2)
    expect(globalThis.Response).toBe(ResponseBefore)
    expect(globalThis.Request).toBe(RequestBefore)
    expect(globalThis.Headers).toBe(HeadersBefore)
  } finally {
    globalThis.fetch = savedFetch
    globalThis.fetchMock = savedFetchMock
  }
})
