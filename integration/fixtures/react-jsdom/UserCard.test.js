const React = require('react')
const { render, screen } = require('@testing-library/react')
const UserCard = require('./UserCard')

beforeEach(() => {
  fetchMock.resetMocks()
})

test('renders the fetched user', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ name: 'Ada Lovelace' }), {
    headers: { 'Content-Type': 'application/json' },
  })
  render(React.createElement(UserCard))
  expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/user')
})

test('renders the error state on a 500', async () => {
  fetchMock.mockResponseOnce('oops', { status: 500 })
  render(React.createElement(UserCard))
  expect(await screen.findByText('Error: HTTP 500')).toBeTruthy()
})

test('renders the error state on a network failure', async () => {
  fetchMock.mockRejectOnce(new Error('offline'))
  render(React.createElement(UserCard))
  expect(await screen.findByText('Error: offline')).toBeTruthy()
})
