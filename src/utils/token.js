import { STORAGE_KEYS } from '../constants/storage.js'

// In-memory fallback if storage APIs throw or are restricted by browser environment
let inMemoryToken = null
let inMemoryUser = null

const safeGetItem = (key) => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const val = localStorage.getItem(key)
      if (val !== null && val !== undefined) return val
      return null
    }
  } catch {
    // localStorage restricted (e.g., private browsing, iframe sandbox)
  }
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.getItem === 'function') {
      const val = sessionStorage.getItem(key)
      if (val !== null && val !== undefined) return val
      return null
    }
  } catch {
    // sessionStorage restricted
  }
  return null
}

const safeSetItem = (key, value) => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value)
    }
  } catch {
    // Fallback
  }
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.setItem === 'function') {
      sessionStorage.setItem(key, value)
    }
  } catch {
    // Fallback
  }
}

const safeRemoveItem = (key) => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key)
    }
  } catch {
    // Fallback
  }
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.removeItem === 'function') {
      sessionStorage.removeItem(key)
    }
  } catch {
    // Fallback
  }
}

/**
 * Safely retrieve the stored JWT authentication token.
 * @returns {string | null}
 */
export const getToken = () => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const stored = localStorage.getItem(STORAGE_KEYS.TOKEN) || (STORAGE_KEYS.TOKEN_COMPAT ? localStorage.getItem(STORAGE_KEYS.TOKEN_COMPAT) : null)
      if (stored !== null && stored !== undefined) {
        return stored
      }
      return null
    }
  } catch {
    // Fallback to secondary storage layers
  }
  const sessionVal = safeGetItem(STORAGE_KEYS.TOKEN) || (STORAGE_KEYS.TOKEN_COMPAT ? safeGetItem(STORAGE_KEYS.TOKEN_COMPAT) : null)
  return sessionVal !== null ? sessionVal : inMemoryToken
}

/**
 * Safely store or clear the JWT authentication token across storage layers.
 * @param {string | null | undefined} token
 */
export const setToken = (token) => {
  inMemoryToken = token || null
  if (token) {
    safeSetItem(STORAGE_KEYS.TOKEN, token)
    if (STORAGE_KEYS.TOKEN_COMPAT) {
      safeSetItem(STORAGE_KEYS.TOKEN_COMPAT, token)
    }
  } else {
    safeRemoveItem(STORAGE_KEYS.TOKEN)
    if (STORAGE_KEYS.TOKEN_COMPAT) {
      safeRemoveItem(STORAGE_KEYS.TOKEN_COMPAT)
    }
  }
}

/**
 * Safely remove the stored JWT token and user info.
 */
export const removeToken = () => {
  inMemoryToken = null
  safeRemoveItem(STORAGE_KEYS.TOKEN)
  if (STORAGE_KEYS.TOKEN_COMPAT) {
    safeRemoveItem(STORAGE_KEYS.TOKEN_COMPAT)
  }
  removeStoredUser()
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
 * @returns {{ id?: number, userId?: number, name?: string, email?: string, role?: string, organizerStatus?: string } | null}
 */
export const getStoredUser = () => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const raw = localStorage.getItem(STORAGE_KEYS.USER) || (STORAGE_KEYS.USER_COMPAT ? localStorage.getItem(STORAGE_KEYS.USER_COMPAT) : null)
      if (raw !== null && raw !== undefined) {
        return JSON.parse(raw)
      }
      return null
    }
  } catch {
    // Fallback to secondary storage layers
  }
  const sessionRaw = safeGetItem(STORAGE_KEYS.USER) || (STORAGE_KEYS.USER_COMPAT ? safeGetItem(STORAGE_KEYS.USER_COMPAT) : null)
  if (sessionRaw !== null && sessionRaw !== undefined) {
    try {
      return JSON.parse(sessionRaw)
    } catch {}
  }
  return inMemoryUser
}

/**
 * Safely store or clear the authenticated user profile.
 * @param {object | null | undefined} user
 */
export const setStoredUser = (user) => {
  inMemoryUser = user || null
  if (user) {
    try {
      const json = JSON.stringify(user)
      safeSetItem(STORAGE_KEYS.USER, json)
      if (STORAGE_KEYS.USER_COMPAT) {
        safeSetItem(STORAGE_KEYS.USER_COMPAT, json)
      }
    } catch {
      // Serialization failure
    }
  } else {
    safeRemoveItem(STORAGE_KEYS.USER)
    if (STORAGE_KEYS.USER_COMPAT) {
      safeRemoveItem(STORAGE_KEYS.USER_COMPAT)
    }
  }
}

/**
 * Safely remove the stored user profile.
 */
export const removeStoredUser = () => {
  inMemoryUser = null
  safeRemoveItem(STORAGE_KEYS.USER)
  if (STORAGE_KEYS.USER_COMPAT) {
    safeRemoveItem(STORAGE_KEYS.USER_COMPAT)
  }
}

/**
 * Clear the entire authenticated session (token and user data).
 */
export const clearAuthSession = () => {
  inMemoryToken = null
  inMemoryUser = null
  removeToken()
  removeStoredUser()
}
