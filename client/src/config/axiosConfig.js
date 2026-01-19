import axios from 'axios'

// In production (Vercel), use relative /api path
// In development, use the VITE_API_BASE_URL env variable
const baseURL = import.meta.env.PROD 
  ? '/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000')

const instance = axios.create({
  baseURL,
  withCredentials: true // if you're using cookies/JWT
})

export default instance
