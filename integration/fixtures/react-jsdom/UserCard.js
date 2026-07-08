const React = require('react')

// Fetch-on-mount component, written without JSX so the fixture needs no babel.
function UserCard() {
  const [state, setState] = React.useState({ status: 'loading' })

  React.useEffect(() => {
    let alive = true
    fetch('https://api.example.com/user')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then((user) => alive && setState({ status: 'done', user }))
      .catch(
        (err) => alive && setState({ status: 'error', message: err.message })
      )
    return () => {
      alive = false
    }
  }, [])

  if (state.status === 'loading') {
    return React.createElement('p', null, 'Loading…')
  }
  if (state.status === 'error') {
    return React.createElement('p', null, 'Error: ' + state.message)
  }
  return React.createElement('h1', null, state.user.name)
}

module.exports = UserCard
