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
    const authVal = error?.config?.headers?.Authorization
      ? error.config.headers.Authorization
      : (typeof error?.config?.headers?.get === 'function' ? error.config.headers.get('Authorization') : null)
    const hadAuthHeader = Boolean(authVal)
    const isAuthEndpoint = Boolean(
      error?.config?.url &&
      (error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup'))
    )

    if (formattedError.status === 401 && hadAuthHeader && !isAuthEndpoint) {
      removeToken()
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('eventease:auth:session-expired'))
      }
    }

    return Promise.reject(formattedError)
  }
)

export default apiClient
