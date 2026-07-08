const http = require('http')

// True end-to-end: unmatched requests travel through the real fetch
// implementation over actual sockets to this local server.
let server
let baseUrl

beforeAll((done) => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('REAL:' + req.url)
  })
  server.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`
    done()
  })
})

afterAll((done) => {
  server.close(done)
})

beforeEach(() => {
  fetchMock.resetMocks()
})

test('dontMockIf lets matching requests hit the real server', async () => {
  fetchMock.dontMockIf((req) => req.url.startsWith(baseUrl), 'mocked')
  await expect(
    fetch(`${baseUrl}/hello`).then((r) => r.text())
  ).resolves.toBe('REAL:/hello')
  await expect(
    fetch('https://api.example.com/x').then((r) => r.text())
  ).resolves.toBe('mocked')
})

test('doMockIf scopes mocking to one URL, everything else is real', async () => {
  fetchMock.doMockIf('https://api.example.com/only', 'scoped-mock')
  await expect(
    fetch('https://api.example.com/only').then((r) => r.text())
  ).resolves.toBe('scoped-mock')
  await expect(
    fetch(`${baseUrl}/other`).then((r) => r.text())
  ).resolves.toBe('REAL:/other')
})

test('dontMockOnce passes exactly one request through', async () => {
  fetchMock.mockResponse('mocked')
  fetchMock.dontMockOnce()
  await expect(
    fetch(`${baseUrl}/once`).then((r) => r.text())
  ).resolves.toBe('REAL:/once')
  await expect(
    fetch(`${baseUrl}/again`).then((r) => r.text())
  ).resolves.toBe('mocked')
})

test('disableMocks restores fully real fetch', async () => {
  fetchMock.disableMocks()
  try {
    await expect(
      fetch(`${baseUrl}/direct`).then((r) => r.text())
    ).resolves.toBe('REAL:/direct')
  } finally {
    fetchMock.enableMocks()
  }
})
