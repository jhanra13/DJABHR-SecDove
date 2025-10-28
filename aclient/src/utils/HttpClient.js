import axios from 'axios'

class HttpClient {
  constructor(baseURL, token, useProxy = false) {
    const url = useProxy ? 'http://localhost:3001' : baseURL
    this.client = axios.create({
      baseURL: url,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    this.useProxy = useProxy
  }

  async get(path, opts = {}) {
    try {
      const response = await this.client.get(path, opts)
      return response
    } catch (error) {
      return error.response || error
    }
  }

  async post(path, body, opts = {}) {
    try {
      const response = await this.client.post(path, body, opts)
      return response
    } catch (error) {
      return error.response || error
    }
  }
}

export default HttpClient