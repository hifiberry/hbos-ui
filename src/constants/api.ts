// DEVICE_IP = 'localhost' // DEVICE_IP for localhost (NO test device) - 'npm run dev'
// DEVICE_IP = '192.168.1.135' // temporary DEVICE_IP for test device (getting from .env.test-device) - 'npm run device'
// DEVICE_IP = window.location.hostname // DEVICE_IP for prod device - 'npm run build-only' then 'npm run preview'

// PORT = window.location.port || 1080 // PORT for prod
// PORT = 1080 // PORT for dev

export const DEVICE_IP = import.meta.env.VITE_APP_DEVICE_IP || window.location.hostname
export const PORT = import.meta.env.PROD
  ? window.location.port || 1080
  : import.meta.env.VITE_APP_DEVICE_PORT || 1080

// For WebSocket connections, always use the actual API server (not proxy)
export const WS_DEVICE_IP = import.meta.env.VITE_APP_DEVICE_IP || window.location.hostname
export const WS_PORT = import.meta.env.VITE_APP_DEVICE_PORT || 1080

export const API_PREFIX = '/api'

// HTTP API calls can use proxy in development
export const API_BASE_URL = import.meta.env.PROD
  ? `http://${DEVICE_IP}:${PORT}${API_PREFIX}`
  : `http://localhost:5173${API_PREFIX}` // Use proxy in development

// WebSocket URL always points to actual API server
export const WS_BASE_URL = `ws://${WS_DEVICE_IP}:${WS_PORT}${API_PREFIX}`
