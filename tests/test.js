import { APIRequest, APIRequest2 } from './api'

describe('testing chaining', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocking multiple responses', () => {
    const mock = fetch
      .once(JSON.stringify({ name: 'naruto', average_score: 79 }))
      .once(JSON.stringify({ name: 'bleach', average_score: 68 }))
    // .mockResponseOnce(
    //   JSON.stringify({ secret_data: '12345' }, { status: 200 })
    // )
    // .mockResponseOnce(
    //   JSON.stringify({ secret_data: '67891' }, { status: 200 })
    // );

    APIRequest('facebook').then(res => {
      console.log(res)
    })

    console.log(mock)
  })
})

describe('testing response', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('mocking multiple responses', () => {
    const mock = fetch.mockResponses(
      [JSON.stringify({ name: 'naruto', average_score: 79 })],
      [JSON.stringify({ name: 'bleach', average_score: 68 })]
    )
    // .mockResponseOnce(
    //   JSON.stringify({ secret_data: '12345' }, { status: 200 })
    // )
    // .mockResponseOnce(
    //   JSON.stringify({ secret_data: '67891' }, { status: 200 })
    // );

    APIRequest('facebook').then(res => {
      console.log(res)
    })
  })
})

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google by default', () => {
    const mock = fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest()

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('calls facebook', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('facebook')

    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://facebook.com/someOtherResource'
    )
    expect(fetch.mock.calls[1][0]).toEqual('https://facebook.com')
  })

  it('calls twitter', () => {
    fetch.mockResponse(JSON.stringify({ secret_data: '12345' }))
    APIRequest('twitter')

    expect(fetch).toBeCalled() // alias for expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch).toBeCalledWith('https://twitter.com') // alias for expect(fetch.mock.calls[0][0]).toEqual();
  })
})

describe('testing api', () => {
  beforeEach(() => {
    fetch.resetMocks()
  })

  it('calls google and returns data to me', () => {
    fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))

    //assert on the response
    APIRequest2('google').then(res => {
      expect(res.data).toEqual('12345')
    })

    //assert on the times called and arguments given to fetch
    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual('https://google.com')
  })

  it('mocking multiple responses', () => {
    const mock = fetch.mockRejectOnce(new Error({ message: 'fake error' }))
    return APIRequest('facebook')
      .then(res => {
        console.log(res)
        console.log('not in error')
      })
      .catch(err => {
        console.dir(err)
        expect(err.message).toEqual('fake error')
        console.log(err)
      })
  })
})
