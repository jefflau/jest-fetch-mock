import 'cross-fetch/polyfill'

export async function APIRequest(who) {
  if (who === 'facebook') {
    const call1 = fetch('https://facebook.com/someOtherResource').then(res =>
      res.json()
    )
    const call2 = fetch('https://facebook.com').then(res => res.json())
    return Promise.all([call1, call2])
  } else if (who === 'twitter') {
    return fetch('https://twitter.com').then(res => res.json())
  } else {
    return fetch('https://google.com').then(res => res.json())
  }
}

export function APIRequest2(who) {
  if (who === 'google') {
    return fetch('https://google.com').then(res => res.json())
  } else {
    return 'no argument provided'
  }
}

export const defaultRequestUri = 'https://randomuser.me/api'

export function request(uri = defaultRequestUri) {
  return fetch(uri, {})
    .then(response => {
      const contentType = response.headers.get('content-type')

      if (/application\/json/.test(contentType)) {
        return response.json()
      }

      if (/text\/csv/.test(contentType)) {
        return response.blob()
      }

      if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
        return response.text()
      }

      return response
    })
    .catch(error => {
      const errorData = JSON.parse(error)
      throw new Error(errorData.error)
    })
}
