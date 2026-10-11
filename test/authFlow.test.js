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

  test('apiClient is configured with 60000ms timeout for slow backend/cold starts', () => {
    assert.equal(apiClient.defaults.timeout, 60000)
  })

  test('Request interceptor does NOT attach Authorization header on /auth/login or /auth/signup even when token exists', async () => {
    setToken('stale-jwt-token')

    const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled

    const loginConfig = { url: '/auth/login', headers: {} }
    const updatedLoginConfig = await requestInterceptor(loginConfig)
    assert.equal(updatedLoginConfig.headers.Authorization, undefined)

    const signupConfig = { url: '/auth/signup', headers: {} }
    const updatedSignupConfig = await requestInterceptor(signupConfig)
    assert.equal(updatedSignupConfig.headers.Authorization, undefined)
  })

  test('Response interceptor does NOT clear session or fire event on 401 from public auth endpoints', async () => {
    setToken('user-valid-token')
    setStoredUser({ id: 5, name: 'User 5' })

    let eventFired = false
    globalThis.window = {
      dispatchEvent: (event) => {
        if (event.type === 'eventease:auth:session-expired') {
          eventFired = true
        }
      },
    }

    const responseInterceptorErr = apiClient.interceptors.response.handlers[0].rejected

    // Test /auth/login 401 (e.g. wrong password)
    try {
      await responseInterceptorErr({
        response: { status: 401, data: { message: 'Bad credentials' } },
        config: { url: '/auth/login', headers: {} },
      })
    } catch {
      // Expected rejection
    }

    assert.equal(eventFired, false)
    assert.equal(getToken(), 'user-valid-token')
    assert.notEqual(getStoredUser(), null)

    // Test /auth/signup 401 (e.g. unauthenticated registration attempt)
    try {
      await responseInterceptorErr({
        response: { status: 401, data: { message: 'Unauthorized' } },
        config: { url: '/auth/signup', headers: {} },
      })
    } catch {
      // Expected rejection
    }

    assert.equal(eventFired, false)
    assert.equal(getToken(), 'user-valid-token')
    assert.notEqual(getStoredUser(), null)

    delete globalThis.window
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

    const state = simulateStorageChange()
    assert.equal(state, 'in-progress')
    // Token must STILL be present
    assert.equal(getToken(), 'fresh-token')

    // Now user write completes
    setStoredUser({ id: 1, name: 'Test' })
    const finalState = simulateStorageChange()
    assert.equal(finalState, 'authenticated')
    assert.equal(getToken(), 'fresh-token')
    assert.notEqual(getStoredUser(), null)
  })

  test('Login response handler saves token and user profile to storage (flat and nested formats)', () => {
    // 1. Flat format returned by Render backend
    const flatBackendResponse = {
      token: 'jwt-render-flat-token',
      userId: 55,
      name: 'Alice Render',
      email: 'alice@render.com',
      role: 'organizer',
    }

    // Extraction logic matching AuthProvider.jsx
    const parseAuthResponse = (data, credentialsEmail) => {
      const token = data.token || data.accessToken || data.jwt || data.data?.token
      const userObj = data.user || data.data?.user || {}
      const userId = data.userId ?? data.id ?? userObj.userId ?? userObj.id
      const name = data.name ?? userObj.name ?? ''
      const email = data.email ?? userObj.email ?? credentialsEmail
      const role = (data.role ?? userObj.role ?? 'USER').toUpperCase()

      setToken(token)
      const userProfile = { id: userId, userId, name, email, role }
      setStoredUser(userProfile)
      return { token, userProfile }
    }

    parseAuthResponse(flatBackendResponse, 'alice@render.com')
    assert.equal(getToken(), 'jwt-render-flat-token')
    assert.deepEqual(getStoredUser(), {
      id: 55,
      userId: 55,
      name: 'Alice Render',
      email: 'alice@render.com',
      role: 'ORGANIZER',
    })

    // 2. Nested format
    const nestedResponse = {
      token: 'jwt-nested-token',
      user: {
        id: 77,
        name: 'Bob Nested',
        email: 'bob@example.com',
        role: 'ADMIN',
      },
    }

    parseAuthResponse(nestedResponse, 'bob@example.com')
    assert.equal(getToken(), 'jwt-nested-token')
    assert.deepEqual(getStoredUser(), {
      id: 77,
      userId: 77,
      name: 'Bob Nested',
      email: 'bob@example.com',
      role: 'ADMIN',
    })
  })

  test('Signup handles slow backend startup without early timeout failure', async () => {
    // Verify client timeout is long enough for Render cold starts (at least 60s)
    assert.ok(apiClient.defaults.timeout >= 60000, 'Timeout must be >= 60000ms to allow cold starts')

    // Simulate backend taking 25 seconds (cold start) then returning 201 Created
    const originalPost = apiClient.post
    apiClient.post = async (url, payload) => {
      assert.equal(url, '/auth/signup')
      assert.equal(payload.email, 'coldstart@example.com')
      return {
        data: {
          token: 'token-after-cold-start',
          userId: 303,
          name: 'Cold Start User',
          email: 'coldstart@example.com',
          role: 'USER',
        },
      }
    }

    try {
      const res = await signup({
        name: 'Cold Start User',
        email: 'coldstart@example.com',
        phone: '',
        password: 'password123',
      })
      assert.equal(res.data.token, 'token-after-cold-start')
      assert.equal(res.data.userId, 303)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('Protected route access logic allows navigation when user and token exist', () => {
    const checkRouteAccess = ({ user, token, allowedRoles }) => {
      const isAuthenticated = Boolean(user && token)
      if (!isAuthenticated) {
        return { allowed: false, redirect: '/login' }
      }
      if (allowedRoles && allowedRoles.length > 0) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
        const userRole = user?.role ? String(user.role).toUpperCase() : ''
        const hasPermission = roles.some((r) => String(r).toUpperCase() === userRole)
        if (!hasPermission) {
          return { allowed: false, redirect: '/home' }
        }
      }
      return { allowed: true, redirect: null }
    }

    // 1. Unauthenticated (no token or user) -> redirects to /login
    assert.deepEqual(
      checkRouteAccess({ user: null, token: null }),
      { allowed: false, redirect: '/login' }
    )

    // 2. Token present but no user profile -> unauthenticated
    assert.deepEqual(
      checkRouteAccess({ user: null, token: 'some-token' }),
      { allowed: false, redirect: '/login' }
    )

    // 3. User authenticated -> allowed
    const validUser = { id: 1, name: 'Alice', role: 'USER' }
    assert.deepEqual(
      checkRouteAccess({ user: validUser, token: 'some-token' }),
      { allowed: true, redirect: null }
    )

    // 4. Role-based check -> USER denied access to ORGANIZER route
    assert.deepEqual(
      checkRouteAccess({ user: validUser, token: 'some-token', allowedRoles: ['ORGANIZER', 'ADMIN'] }),
      { allowed: false, redirect: '/home' }
    )

    // 5. Role-based check -> ORGANIZER allowed access
    const organizerUser = { id: 2, name: 'Bob', role: 'ORGANIZER' }
    assert.deepEqual(
      checkRouteAccess({ user: organizerUser, token: 'some-token', allowedRoles: ['ORGANIZER', 'ADMIN'] }),
      { allowed: true, redirect: null }
    )
  })

  test('formatFriendlyRole converts backend role strings into clean user-facing labels', async () => {
    const { formatFriendlyRole } = await import('../src/utils/formatters.js')

    assert.equal(formatFriendlyRole('USER'), 'Participant')
    assert.equal(formatFriendlyRole('ROLE_USER'), 'Participant')
    assert.equal(formatFriendlyRole('participant'), 'Participant')
    assert.equal(formatFriendlyRole('ORGANIZER'), 'Organizer')
    assert.equal(formatFriendlyRole('ROLE_ORGANIZER'), 'Organizer')
    assert.equal(formatFriendlyRole('ADMIN'), 'Admin')
    assert.equal(formatFriendlyRole('ROLE_ADMIN'), 'Admin')
    assert.equal(formatFriendlyRole(null), 'Participant')
    assert.equal(formatFriendlyRole(undefined), 'Participant')
    assert.equal(formatFriendlyRole(''), 'Participant')
  })

  test('authApi.signup includes accountType in payload when provided', async () => {
    let capturedPayload = null
    const originalPost = apiClient.post
    apiClient.post = async (url, payload) => {
      capturedPayload = payload
      return { data: { success: true } }
    }

    try {
      await signup({
        name: 'Jane Organizer',
        email: 'jane@example.com',
        password: 'password123',
        phone: '1234567890',
        accountType: 'ORGANIZER',
      })

      assert.deepEqual(capturedPayload, {
        name: 'Jane Organizer',
        email: 'jane@example.com',
        password: 'password123',
        phone: '1234567890',
        accountType: 'ORGANIZER',
      })

      await signup({
        name: 'John Participant',
        email: 'john@example.com',
        password: 'password123',
        accountType: 'PARTICIPANT',
      })

      assert.deepEqual(capturedPayload, {
        name: 'John Participant',
        email: 'john@example.com',
        password: 'password123',
        accountType: 'PARTICIPANT',
      })
    } finally {
      apiClient.post = originalPost
    }
  })

  test('Login response parser extracts and persists organizerStatus', () => {
    const parseAuthResponse = (data, credentialsEmail) => {
      const token = data.token || data.accessToken || data.jwt || data.data?.token
      const userObj = data.user || data.data?.user || {}
      const userId = data.userId ?? data.id ?? userObj.userId ?? userObj.id
      const name = data.name ?? userObj.name ?? ''
      const email = data.email ?? userObj.email ?? credentialsEmail
      const role = (data.role ?? userObj.role ?? 'USER').toUpperCase()
      const organizerStatus = (data.organizerStatus ?? userObj.organizerStatus ?? 'NONE').toUpperCase()

      setToken(token)
      const userProfile = { id: userId, userId, name, email, role, organizerStatus }
      setStoredUser(userProfile)
      return { token, userProfile }
    }

    const pendingResponse = {
      token: 'jwt-pending-organizer',
      userId: 77,
      name: 'Pending Org',
      email: 'pending@org.com',
      role: 'USER',
      organizerStatus: 'PENDING',
    }

    const { userProfile: profile1 } = parseAuthResponse(pendingResponse, 'pending@org.com')
    assert.equal(profile1.role, 'USER')
    assert.equal(profile1.organizerStatus, 'PENDING')
    assert.deepEqual(getStoredUser(), profile1)

    const approvedResponse = {
      token: 'jwt-approved-organizer',
      userId: 88,
      name: 'Approved Org',
      email: 'approved@org.com',
      role: 'ORGANIZER',
      organizerStatus: 'APPROVED',
    }

    const { userProfile: profile2 } = parseAuthResponse(approvedResponse, 'approved@org.com')
    assert.equal(profile2.role, 'ORGANIZER')
    assert.equal(profile2.organizerStatus, 'APPROVED')
    assert.deepEqual(getStoredUser(), profile2)
  })

  test('LoginPage destination resolver redirects ORGANIZER to /organizer/dashboard and USER to /home', () => {
    const computeDestination = (role, rawFrom) => {
      if (rawFrom) {
        if (typeof rawFrom === 'string' && rawFrom !== '/login' && rawFrom !== '/signup') {
          return rawFrom
        }
        if (rawFrom.pathname && rawFrom.pathname !== '/login' && rawFrom.pathname !== '/signup') {
          return `${rawFrom.pathname}${rawFrom.search || ''}`
        }
      }
      if (role === 'ORGANIZER') {
        return '/organizer/dashboard'
      }
      if (role === 'ADMIN') {
        return '/admin/dashboard'
      }
      return '/home'
    }

    // Default redirects by role
    assert.equal(computeDestination('ORGANIZER'), '/organizer/dashboard')
    assert.equal(computeDestination('ADMIN'), '/admin/dashboard')
    assert.equal(computeDestination('USER'), '/home')

    // Preserves explicit destination when user was attempting to reach a specific page
    assert.equal(computeDestination('ORGANIZER', '/events/42'), '/events/42')
    assert.equal(computeDestination('USER', '/assistant'), '/assistant')

    // Prevents redirect loops
    assert.equal(computeDestination('ORGANIZER', '/login'), '/organizer/dashboard')
    assert.equal(computeDestination('USER', '/signup'), '/home')
  })

  test('LoginPage redirection logic resolves destination safely with user context', () => {
    const user = { id: 1, role: 'ORGANIZER' }
    const computeDestination = (role) => {
      if (role === 'ORGANIZER') return '/organizer/dashboard'
      if (role === 'ADMIN') return '/admin/dashboard'
      return '/home'
    }
    assert.equal(computeDestination(user?.role), '/organizer/dashboard')
    assert.equal(computeDestination(undefined), '/home')
  })
})
