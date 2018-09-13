import 'isomorphic-fetch'

export function APIRequest(who) {
  if (who === 'facebook') {
    const call1 = fetch('https://facebook.com/someOtherResource')
    const call2 = fetch('https://facebook.com')
    return Promise.all([call1, call2])
  } else if (who === 'twitter') {
    return fetch('https://twitter.com')
  } else {
    return fetch('https://google.com')
  }
}

export function APIRequest2(who) {
  if (who === 'google') {
    return fetch('https://google.com').then(res => res.json())
  } else {
    return 'no argument provided'
  }
}
