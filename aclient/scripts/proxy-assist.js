import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())

// Proxy for API
app.use('/api', createProxyMiddleware({
  target: process.env.TARGET_URL || 'https://target.example.com',
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    // Add custom headers
    proxyReq.setHeader('X-Forwarded-For', '203.0.113.9')
    proxyReq.setHeader('X-Custom-Origin', req.headers.origin || 'http://localhost:5174')
  }
}))

// Proxy for Socket.IO
app.use('/socket.io', createProxyMiddleware({
  target: process.env.TARGET_URL || 'https://target.example.com',
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-Forwarded-For', '203.0.113.9')
  }
}))

app.listen(PORT, () => {
  console.log(`Proxy Assist running on http://localhost:${PORT}`)
})