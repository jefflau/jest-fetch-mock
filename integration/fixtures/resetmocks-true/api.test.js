// The historical footgun: "resetMocks": true wipes mock implementations
// before every test. With enableMocks() in setupFilesAfterEnv, the library
// re-arms itself automatically.

describe('resetMocks: true consumer', () => {
  it('fetch still resolves with the default mock in the first test', async () => {
    const response = await fetch('https://example.com/')
    await expect(response.text()).resolves.toBe('')
  })

  it('and still resolves in the second test after a config reset', async () => {
    const response = await fetch('https://example.com/')
    await expect(response.text()).resolves.toBe('')
  })

  it('per-test mocks work as usual', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ armed: true }))
    const response = await fetch('https://example.com/api')
    await expect(response.json()).resolves.toEqual({ armed: true })
  })

  it('conditional gate is re-armed too', () => {
    expect(fetchMock.isMocking('https://example.com/')).toBe(true)
  })
})
