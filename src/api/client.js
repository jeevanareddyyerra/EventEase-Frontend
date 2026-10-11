import axios from 'axios'
import { getToken, removeToken } from '../utils/token.js'
import { formatApiError } from '../utils/errorHandler.js'

export const DEFAULT_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.PROD)
  ? '/api'
  : 'http://localhost:8080/api'

export const API_BASE_URL = (() => {
  if (typeof import.meta !== 'undefined') {
    if (import.meta.env?.VITE_API_BASE_URL) {
      if (import.meta.env.PROD && import.meta.env.VITE_API_BASE_URL === 'http://localhost:8080/api') {
        return '/api'
      }
      return import.meta.env.VITE_API_BASE_URL
    }
    if (import.meta.env?.PROD) {
      return '/api'
    }
  }
  return DEFAULT_BASE_URL
})()

/**
 * Centralized Axios API client configured for the EventEase backend.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Synchronize default common Authorization header for instant synchronous availability
export const setAuthHeader = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

// Initialize default Authorization header from storage on module startup
const initialToken = getToken()
if (initialToken) {
  setAuthHeader(initialToken)
}

// Request interceptor: attach stored JWT as Bearer token when available
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`)
      } else {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(formatApiError(error))
  }
)

// Response interceptor: centralized error handling without exposing sensitive backend details
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const formattedError = formatApiError(error)

    // Clear stale session on 401 Unauthorized ONLY if:
    // 1. The request was an authenticated request (carried an Authorization header)
    // 2. The request was NOT an unauthenticated authentication endpoint (e.g. login/signup failure)
    const headers = error?.config?.headers
    const authVal = headers && (
      typeof headers.get === 'function'
        ? headers.get('Authorization') || headers.get('authorization')
        : headers.Authorization || headers.authorization || headers['Authorization'] || headers['authorization']
    )
    const hadAuthHeader = Boolean(authVal)
    const isAuthEndpoint = Boolean(
      error?.config?.url &&
      (error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup'))
    )

    if (formattedError.status === 401 && hadAuthHeader && !isAuthEndpoint) {
      removeToken()
      setAuthHeader(null)
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('eventease:auth:session-expired'))
      }
    }

    return Promise.reject(formattedError)
  }
)

export default apiClient
