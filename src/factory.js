// Dependency-free entry: nothing here touches the global jest object, so it
// is importable under injectGlobals: false and outside test files.
const createFetchMock = require('./createFetchMock')

Object.defineProperty(exports, '__esModule', { value: true })
module.exports = createFetchMock
module.exports.createFetchMock = createFetchMock
module.exports.default = createFetchMock
