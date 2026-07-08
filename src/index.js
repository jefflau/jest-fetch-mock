const createFetchMock = require('./createFetchMock')

// the default instance is bound to the global jest object, exactly like 3.x;
// for injectGlobals: false setups use createFetchMock (jest-fetch-mock/factory)
const fetchMock = createFetchMock(jest)

Object.defineProperty(exports, '__esModule', { value: true })
module.exports = fetchMock.default = fetchMock
module.exports.createFetchMock = createFetchMock
