import { STORAGE_KEYS } from '../constants/storage.js'

/**
 * Safely retrieve the stored JWT authentication token.
 * @returns {string | null}
 */
export const getToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN)
  } catch {
    return null
  }
}

/**
 * Safely store or clear the JWT authentication token.
 * @param {string | null | undefined} token
 */
export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
    }
  } catch {
    // Gracefully handle storage quota or private browsing restrictions
  }
}

/**
 * Safely remove the stored JWT token and user info.
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  } catch {
    // Graceful fallback
  }
}

/**
 * Check whether an authentication token is present.
 * @returns {boolean}
 */
export const hasToken = () => {
  return Boolean(getToken())
}

/**
 * Safely retrieve the stored user profile.
 * @returns {{ id?: number, userId?: number, name?: string, email?: string, role?: string } | null}
 */
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Safely store or clear the authenticated user profile.
 * @param {object | null | undefined} user
 */
export const setStoredUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER)
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Safely remove the stored user profile.
 */
export const removeStoredUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER)
  } catch {
    // Graceful fallback
  }
}

/**
 * Clear the entire authenticated session (token and user data).
 */
export const clearAuthSession = () => {
  removeToken()
  removeStoredUser()
}
