import axios from 'axios'

// Use the external Render URL if provided, otherwise fallback to relative routing or localhost
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
const baseURL = import.meta.env.PROD && !import.meta.env.VITE_BACKEND_URL ? '/api' : `${backendUrl.replace(/\/$/, '')}/api`

const instance = axios.create({
  baseURL,
  withCredentials: true // if you're using cookies/JWT
})

export default instance
