import fetchMockDefault, {
  enableFetchMocks,
  FetchMock,
  MockResponseInit,
} from 'jest-fetch-mock';

enableFetchMocks();

describe('TypeScript strict consumer', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('global fetchMock is typed', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ n: 1 }));
    const res = await fetch('https://example.com');
    const data: { n: number } = await res.json();
    expect(data.n).toBe(1);
  });

  it('function mocks are typed', async () => {
    fetchMock.mockResponseOnce(
      async (req: Request): Promise<MockResponseInit> => ({
        body: `ok:${req.url}`,
        status: 201,
      })
    );
    const res = await fetch('https://example.com/');
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('ok:https://example.com/');
  });

  it('Response overload compiles and runs', async () => {
    fetchMock.mockResponseOnce(new Response('hi'));
    expect(await (await fetch('https://x.test')).text()).toBe('hi');
  });

  it('default export is the same mock', () => {
    const fm: FetchMock = fetchMockDefault;
    expect(fm).toBe(fetchMock);
  });

  it('rejects on an already-aborted signal', async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      fetch('https://example.com', { signal: c.signal })
    ).rejects.toThrow();
  });
});
