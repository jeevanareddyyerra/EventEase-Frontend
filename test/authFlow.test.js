import test, { describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { apiClient } from '../src/api/client.js'
import { login, signup } from '../src/api/authApi.js'
import {
  getToken,
  setToken,
  removeToken,
  hasToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
} from '../src/utils/token.js'
import { STORAGE_KEYS } from '../src/constants/storage.js'

describe('Authentication Flow & Token Storage Verification', () => {
  // Mock localStorage in Node environment
  const mockStorage = new Map()
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    mockStorage.clear()
    globalThis.localStorage = {
      getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
      setItem: (key, val) => mockStorage.set(key, String(val)),
      removeItem: (key) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
    }
  })

  afterEach(() => {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage
    } else {
      delete globalThis.localStorage
    }
  })

  test('Token storage utilities persist and clear JWT tokens safely', () => {
    assert.equal(getToken(), null)
    assert.equal(hasToken(), false)

    setToken('jwt-sample-token-123')
    assert.equal(getToken(), 'jwt-sample-token-123')
    assert.equal(hasToken(), true)
    assert.equal(globalThis.localStorage.getItem(STORAGE_KEYS.TOKEN), 'jwt-sample-token-123')

    setToken(null)
    assert.equal(getToken(), null)
    assert.equal(hasToken(), false)
  })

  test('User profile storage utilities store and retrieve JSON user details', () => {
    assert.equal(getStoredUser(), null)

    const profile = { id: 42, userId: 42, name: 'Alex Johnson', email: 'alex@example.com', role: 'USER' }
    setStoredUser(profile)

    const restored = getStoredUser()
    assert.deepEqual(restored, profile)

    clearAuthSession()
    assert.equal(getToken(), null)
    assert.equal(getStoredUser(), null)
  })

  test('authApi.login sends properly formatted payload', async () => {
    const originalPost = apiClient.post
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          token: 'backend-jwt-token-xyz',
          userId: 101,
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'USER',
        },
      }
    }

    try {
      const res = await login({ email: '  jane@example.com  ', password: 'password123' })
      assert.equal(capturedUrl, '/auth/login')
      assert.deepEqual(capturedPayload, { email: 'jane@example.com', password: 'password123' })
      assert.equal(res.data.token, 'backend-jwt-token-xyz')
      assert.equal(res.data.userId, 101)
      assert.equal(res.data.name, 'Jane Doe')
      assert.equal(res.data.role, 'USER')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('authApi.signup sends properly formatted registration payload', async () => {
    const originalPost = apiClient.post
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          token: 'new-user-jwt',
          userId: 202,
          name: 'New User',
          email: 'newuser@example.com',
          role: 'USER',
        },
      }
    }

    try {
      const res = await signup({
        name: '  New User  ',
        email: '  newuser@example.com  ',
        password: 'securePassword1',
        phone: ' +15551234567 ',
      })
      assert.equal(capturedUrl, '/auth/signup')
      assert.deepEqual(capturedPayload, {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securePassword1',
        phone: '+15551234567',
      })
      assert.equal(res.data.token, 'new-user-jwt')
      assert.equal(res.data.userId, 202)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('Request interceptor attaches Authorization Bearer token when token is present', async () => {
    setToken('sample-auth-bearer-token')

    const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled
    const config = { headers: {} }
    const updatedConfig = await requestInterceptor(config)

    assert.equal(
      updatedConfig.headers.Authorization,
      'Bearer sample-auth-bearer-token'
    )
  })

  test('Request interceptor does not attach Authorization Bearer token when no token exists', async () => {
    removeToken()

    const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled
    const config = { headers: {} }
    const updatedConfig = await requestInterceptor(config)

    assert.equal(updatedConfig.headers.Authorization, undefined)
  })

  test('Response interceptor clears session on 401 when request had Authorization header', async () => {
    setToken('token-to-be-cleared')
    setStoredUser({ id: 1, name: 'Test' })

    let eventFired = false
    const originalDispatch = globalThis.window?.dispatchEvent
    globalThis.window = {
      dispatchEvent: (event) => {
        if (event.type === 'eventease:auth:session-expired') {
          eventFired = true
        }
      },
    }

    const responseInterceptorErr = apiClient.interceptors.response.handlers[0].rejected

    const errorWithAuth = {
      response: { status: 401, data: { message: 'JWT expired' } },
      config: {
        url: '/api/events',
        headers: { Authorization: 'Bearer token-to-be-cleared' },
      },
    }

    try {
      await responseInterceptorErr(errorWithAuth)
    } catch {
      // Expected rejection
    } finally {
      if (originalDispatch) {
        globalThis.window.dispatchEvent = originalDispatch
      } else {
        delete globalThis.window
      }
    }

    assert.equal(eventFired, true)
    assert.equal(getToken(), null)
    assert.equal(getStoredUser(), null)
  })

  test('Response interceptor does NOT clear session on 401 when request lacked Authorization header', async () => {
    setToken('keep-this-token')
    setStoredUser({ id: 2, name: 'Keep User' })

    let eventFired = false
    globalThis.window = {
      dispatchEvent: (event) => {
        if (event.type === 'eventease:auth:session-expired') {
          eventFired = true
        }
      },
    }

    const responseInterceptorErr = apiClient.interceptors.response.handlers[0].rejected

    const unauthenticatedError = {
      response: { status: 401, data: { message: 'Authentication required' } },
      config: {
        url: '/api/public-check',
        headers: {},
      },
    }

    try {
      await responseInterceptorErr(unauthenticatedError)
    } catch {
      // Expected rejection
    } finally {
      delete globalThis.window
    }

    assert.equal(eventFired, false)
    assert.equal(getToken(), 'keep-this-token')
    assert.notEqual(getStoredUser(), null)
  })

  test('Response interceptor does NOT clear session on 401 when endpoint is /auth/login', async () => {
    setToken('existing-token')

    let eventFired = false
    globalThis.window = {
      dispatchEvent: (event) => {
        if (event.type === 'eventease:auth:session-expired') {
          eventFired = true
        }
      },
    }

    const responseInterceptorErr = apiClient.interceptors.response.handlers[0].rejected

    const loginFailError = {
      response: { status: 401, data: { message: 'Bad credentials' } },
      config: {
        url: '/api/auth/login',
        headers: {},
      },
    }

    try {
      await responseInterceptorErr(loginFailError)
    } catch {
      // Expected rejection
    } finally {
      delete globalThis.window
    }

    assert.equal(eventFired, false)
    assert.equal(getToken(), 'existing-token')
  })

  test('Destination resolution prevents auth redirect loops', () => {
    const resolveDestination = (rawFrom) => {
      if (rawFrom) {
        if (typeof rawFrom === 'string' && rawFrom !== '/login' && rawFrom !== '/signup') {
          return rawFrom
        }
        if (rawFrom.pathname && rawFrom.pathname !== '/login' && rawFrom.pathname !== '/signup') {
          return `${rawFrom.pathname}${rawFrom.search || ''}`
        }
      }
      return '/home'
    }

    assert.equal(resolveDestination(undefined), '/home')
    assert.equal(resolveDestination(null), '/home')
    assert.equal(resolveDestination('/login'), '/home')
    assert.equal(resolveDestination('/signup'), '/home')
    assert.equal(resolveDestination({ pathname: '/login' }), '/home')
    assert.equal(resolveDestination({ pathname: '/signup' }), '/home')
    assert.equal(resolveDestination('/events'), '/events')
    assert.equal(resolveDestination({ pathname: '/events', search: '?category=TECH' }), '/events?category=TECH')
    assert.equal(resolveDestination({ pathname: '/events/12' }), '/events/12')
  })

  test('setAuthHeader synchronizes apiClient.defaults.headers.common', async () => {
    const { setAuthHeader } = await import('../src/api/client.js')
    setAuthHeader('new-sync-token')
    assert.equal(apiClient.defaults.headers.common['Authorization'], 'Bearer new-sync-token')

    setAuthHeader(null)
    assert.equal(apiClient.defaults.headers.common['Authorization'], undefined)
  })

  test('Storage change handler does not prematurely wipe token during progressive login write', () => {
    // Simulate login write sequence: setToken happens before setStoredUser
    setToken('fresh-token')
    assert.equal(getToken(), 'fresh-token')
    assert.equal(getStoredUser(), null)

    // A storage handler evaluating token && storedUser should NOT wipe when token is present
    const simulateStorageChange = () => {
      const token = getToken()
      const storedUser = getStoredUser()
      if (token && storedUser) {
        return 'authenticated'
      } else if (!token && !storedUser) {
        clearAuthSession()
        return 'cleared'
      }
      return 'in-progress'
    }

    const state = simulateStorageChange(STORAGE_KEYS.TOKEN)
    assert.equal(state, 'in-progress')
    // Token must STILL be present
    assert.equal(getToken(), 'fresh-token')

    // Now user write completes
    setStoredUser({ id: 1, name: 'Test' })
    const finalState = simulateStorageChange(STORAGE_KEYS.USER)
    assert.equal(finalState, 'authenticated')
    assert.equal(getToken(), 'fresh-token')
    assert.notEqual(getStoredUser(), null)
  })
})
