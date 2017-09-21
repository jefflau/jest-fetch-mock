const fetch = require('../index.js')

test('mockReject throws custom error', () => {
  let myError = new Error('myerror')
  fetch.mockReject(myError)

  fetch('something').catch(error => {
    expect(error).toBe(myError)
    
  })
})
