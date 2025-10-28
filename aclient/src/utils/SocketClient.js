import io from 'socket.io-client'

class SocketClient {
  constructor(url, token, useProxy = false) {
    this.socket = null
    this.url = useProxy ? 'http://localhost:3001' : url
    this.token = token
  }

  connect() {
    this.socket = io(this.url, { transports: ['websocket'] })
    return new Promise((resolve) => {
      this.socket.on('connect', () => resolve())
    })
  }

  authenticate() {
    this.socket.emit('authenticate', this.token)
    return new Promise((resolve) => {
      this.socket.on('authenticated', (data) => resolve(data))
    })
  }

  emit(event, payload) {
    this.socket.emit(event, payload)
  }

  on(event, handler) {
    this.socket.on(event, handler)
  }

  disconnect() {
    if (this.socket) this.socket.disconnect()
  }
}

export default SocketClient