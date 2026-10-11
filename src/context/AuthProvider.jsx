import { useState, useEffect, useCallback, useMemo } from 'react'
import { AuthContext } from './auth-context.js'
import { login as loginApi } from '../api/authApi.js'
import {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
} from '../utils/token.js'
import { STORAGE_KEYS } from '../constants/storage.js'

/**
 * Authentication Provider component that manages global user authentication state,
 * handles JWT storage, session restoration across page reloads, and cross-tab/401 sync.
 */
export function AuthProvider({ children }) {
  // Restore authenticated session from localStorage synchronously on initial load
  const [user, setUser] = useState(() => {
    try {
      const token = getToken()
      const storedUser = getStoredUser()
      if (token && storedUser) {
        return storedUser
      }
      if (!token && storedUser) {
        // If token is missing but user profile is lingering, clear stale data
        clearAuthSession()
      }
      return null
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  // Listen for 401 session expiration from Axios interceptors and storage events from other tabs
  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuthSession()
      setUser(null)
    }

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.TOKEN || e.key === STORAGE_KEYS.USER) {
        const token = getToken()
        const storedUser = getStoredUser()
        if (token && storedUser) {
          setUser(storedUser)
        } else if (!token && !storedUser) {
          // Only clear state when both credentials are removed, preventing write-order desync
          setUser(null)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('eventease:auth:session-expired', handleSessionExpired)
      window.addEventListener('storage', handleStorageChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('eventease:auth:session-expired', handleSessionExpired)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  /**
   * Authenticate user with credentials, persist JWT and user details, and update state.
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<Object>} The authenticated user data
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true)
    try {
      const response = await loginApi(credentials)
      const data = response?.data || {}

      // Defensive token extraction supporting standard backend and wrapper variations
      const token = data.token || data.accessToken || data.jwt || data.data?.token
      if (!token || typeof token !== 'string') {
        throw new Error('Authentication succeeded but no authorization token was received from the server.')
      }

      // Defensive user field extraction supporting flat response and nested user object
      const userObj = data.user || data.data?.user || {}
      const userId = data.userId ?? data.id ?? userObj.userId ?? userObj.id
      const name = data.name ?? userObj.name ?? ''
      const email = data.email ?? userObj.email ?? credentials.email
      const role = (data.role ?? userObj.role ?? 'USER').toUpperCase()
      const organizerStatus = (data.organizerStatus ?? userObj.organizerStatus ?? 'NONE').toUpperCase()

      // Save token and profile to localStorage
      setToken(token)
      const userProfile = {
        id: userId,
        userId,
        name,
        email,
        role,
        organizerStatus,
      }
      setStoredUser(userProfile)

      // Update state
      setUser(userProfile)

      return {
        ...data,
        token,
        userId,
        name,
        email,
        role,
        organizerStatus,
        user: userProfile,
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Log out the current user, clear stored credentials, and notify listeners.
   */
  const logout = useCallback(() => {
    clearAuthSession()
    setUser(null)
  }, [])

  const isAuthenticated = Boolean(user && getToken())

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
