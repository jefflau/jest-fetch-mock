/**
 * @jest-environment node
 */

it('uses the environment fetch primitives when they exist', () => {
  expect(fetchMock.usingNativeFetch).toBe(true)
  expect(fetchMock.Request).toBe(Request)
  expect(fetchMock.Headers).toBe(Headers)
  expect(jest.isMockFunction(fetch)).toBe(true)
  expect(fetchMock.realFetch).not.toBe(fetch)
  expect(jest.isMockFunction(fetchMock.realFetch)).toBe(false)
})

it('constructs mock responses with the native Response class', async () => {
  fetchMock.mockResponseOnce('native')
  const response = await fetch('https://example.com/')
  expect(response).toBeInstanceOf(Response)
  expect(response.constructor).toBe(Response)
  await expect(response.text()).resolves.toBe('native')
})

it('rejects with a dom exception', () => {
  fetchMock.mockAbort()
  return expect(fetch('/')).rejects.toThrow(expect.any(DOMException))
})
