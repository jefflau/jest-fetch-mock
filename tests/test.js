import { APIRequest, APIRequest2, request } from './api'

describe('testing mockResponse and alias once', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })
  it('mocks a response', async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ secret_data: 'abcde' }, { status: 200 })
    )

    const response = await APIRequest('google')

    expect(response).toEqual({ secret_data: 'abcde' })
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('mocks a response with chaining', async () => {
    fetch
      .mockResponseOnce(
        JSON.stringify({ secret_data: '12345' }, { status: 200 })
      )
      .mockResponseOnce(
        JSON.stringify({ secret_data: '67891' }, { status: 200 })
      )

    const response = await APIRequest('facebook')

    expect(response).toEqual([
      { secret_data: '12345' },
      { secret_data: '67891' }
    ])

    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })

  it('mocks a response with alias .once', async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ secret_data: 'abcde' }, { status: 200 })
    )

    const response = await APIRequest('google')

    expect(response).toEqual({ secret_data: 'abcde' })
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('mocks a response with chaining with alias .once', async () => {
    fetch
      .once(JSON.stringify({ secret_data: '12345' }, { status: 200 }))
      .once(JSON.stringify({ secret_data: '67891' }, { status: 200 }))

    const response = await APIRequest('facebook')

    expect(response).toEqual([
      { secret_data: '12345' },
      { secret_data: '67891' }
    ])

    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })
})

describe('testing mockResponses', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })
  it('mocks multiple responses', async () => {
    fetch.mockResponses(
      [JSON.stringify({ name: 'naruto', average_score: 79 })],
      [JSON.stringify({ name: 'bleach', average_score: 68 })]
    )

    const response = await APIRequest('facebook')
    expect(response).toEqual([
      { name: 'naruto', average_score: 79 },
      { name: 'bleach', average_score: 68 }
    ])
    expect(fetch.mock.calls.length).toEqual(2)

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })
})

describe('Mocking aborts',() => {

  beforeEach(() => {
    fetch.resetMocks()
  })

  it('throws an AbortError',() => {
    fetch.mockAbort();
    expect(() => fetch('/')).toThrow();
  })

  it('throws when passed an aborted abort signal',() => {
    const c = new AbortController();
    c.abort();
    fetch.mockResponse('',{signal:c.signal});
    expect(() => fetch('/')).toThrow();
  })

  it('throws when aborted before resolved',async () => {
    const c = new AbortController();
    fetch.mockResponse(() => {
      return new Promise(res => {
        setTimeout(() => {
          res({
            body:'some body',
            init:{signal:c.signal}
          })
        },100);
      })
    })

    const res = fetch('/');
    setTimeout(() => c.abort(),50);
    await expect(res).rejects.toBeTruthy();
  })

})

describe('Mocking rejects', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocking rejects', async () => {
    fetch.mockRejectOnce('fake error')
    try {
      await APIRequest2('google')
    } catch (e) {
      expect(e).toEqual('fake error')
    }
  })
})

describe('request', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('returns object when response is json', done => {
    const mockResponse = {
      results: [{ gender: 'neutral' }],
      info: { seed: '0123456789123456', results: 1, page: 1, version: '1.2' }
    }
    fetch.mockResponseOnce(JSON.stringify(mockResponse), {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    request()
      .then(response => {
        expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
        expect(response).toEqual(mockResponse)
        done()
      })
      .catch(done.fail)
  })

  it('returns text when response is text', done => {
    fetch.mockResponseOnce('ok')

    request()
      .then(response => {
        expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
        expect(response).toEqual('ok')
        done()
      })
      .catch(done.fail)
  })

  it('returns blob when response is text/csv', async () => {
    const contentType = 'text/csv; charset=utf-8'
    fetch.mockResponseOnce('csv data', {
      headers: {
        'Content-Type': contentType
      }
    })

    try {
      const response = await request()
      expect(response.type).toBe(contentType)
    } catch (e) {
      console.log(e)
    }

    expect(fetch).toHaveBeenCalledWith('https://randomuser.me/api', {})
  })

  it('rejects with error data', done => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(JSON.stringify(errorData))

    request()
      .then(done.fail)
      .catch(error => {
        expect(error.message).toBe(errorData.error)
        done()
      })
  })

  it('resolves with function', async () => {
    fetch.mockResponseOnce(() => Promise.resolve({ body: 'ok' }))

    try {
      const response = await request()
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    }
  })

  it('resolves with function and timeout', async () => {
    fetch.mockResponseOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ body: 'ok' }))),
      100
    )
    try {
      const response = await request()
      expect(response).toEqual('ok')
    } catch (e) {
      throw e
    }
  })

  it('rejects with function', async () => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(() => Promise.reject(JSON.stringify(errorData)))
    try {
      await request()
    } catch (error) {
      expect(error.message).toBe(errorData.error)
    }
  })

  it('rejects with function and timeout', async () => {
    const errorData = {
      error:
        'Uh oh, something has gone wrong. Please tweet us @randomapi about the issue. Thank you.'
    }
    fetch.mockRejectOnce(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(JSON.stringify(errorData)))
        ),
      100
    )
    try {
      await request()
    } catch (error) {
      expect(error.message).toBe(errorData.error)
    }
  })
})
