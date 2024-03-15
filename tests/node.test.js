/**
 * @jest-environment node
 */
if (typeof DOMException === 'undefined') {
  DOMException = require('domexception')
}

it('rejects with a dom exception', () => {
  fetch.mockAbort()
  expect(fetch('/')).rejects.toThrow(expect.any(DOMException))
})
