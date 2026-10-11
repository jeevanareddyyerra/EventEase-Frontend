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
  timeout: 60000,
})

/**
 * Safely update or remove default Authorization header on apiClient.
 * @param {string | null | undefined} token
 */
export const setAuthHeader = (token) => {
  const authVal = token ? `Bearer ${token}` : null
  if (!apiClient.defaults.headers) {
    apiClient.defaults.headers = {}
  }

  if (typeof apiClient.defaults.headers.set === 'function') {
    if (authVal) {
      apiClient.defaults.headers.set('Authorization', authVal)
    } else {
      apiClient.defaults.headers.delete('Authorization')
      apiClient.defaults.headers.delete('authorization')
    }
  }

  if (!apiClient.defaults.headers.common) {
    apiClient.defaults.headers.common = {}
  }

  if (authVal) {
    apiClient.defaults.headers.common['Authorization'] = authVal
    apiClient.defaults.headers['Authorization'] = authVal
  } else {
    delete apiClient.defaults.headers.common['Authorization']
    delete apiClient.defaults.headers['Authorization']
  }
}

// Initialize default Authorization header if token already exists in localStorage
const initialStoredToken = getToken()
if (initialStoredToken) {
  setAuthHeader(initialStoredToken)
}

// Request interceptor: attach stored JWT as Bearer token on protected endpoints
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    const isAuthEndpoint = Boolean(
      config.url && (config.url.includes('/auth/login') || config.url.includes('/auth/signup'))
    )

    if (token && !isAuthEndpoint) {
      const authHeader = `Bearer ${token}`
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', authHeader)
      }
      config.headers = config.headers || {}
      config.headers.Authorization = authHeader
      config.headers['authorization'] = authHeader
      setAuthHeader(token)
    } else if (isAuthEndpoint) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Authorization')
        config.headers.delete('authorization')
      }
      if (config.headers) {
        delete config.headers.Authorization
        delete config.headers.authorization
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
