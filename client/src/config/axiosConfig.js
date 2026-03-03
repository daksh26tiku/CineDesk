import axios from 'axios'

// Use the external Render URL if provided, otherwise fallback to relative routing or localhost
const backendUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080'
const isExternalBackend = !!import.meta.env.VITE_SERVER_URL;
const baseURL = import.meta.env.PROD && !isExternalBackend ? '/api' : `${backendUrl.replace(/\/$/, '')}/api`

const instance = axios.create({
  baseURL,
  withCredentials: true // if you're using cookies/JWT
})

export default instance
