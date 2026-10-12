import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTimeoutRef = useRef(null)
  const { login, isAuthenticated, user, isInitialized } = useAuth()

  // Safely compute destination preventing loops back to /login or /signup
  const rawFrom = location.state?.from
  const computeDestination = (role) => {
    const normalizedRole = role ? String(role).toUpperCase() : ''

    // If authenticated user is an ADMIN, always route to /admin/dashboard
    // unless rawFrom is specifically an /admin sub-route
    if (normalizedRole === 'ADMIN') {
      if (rawFrom) {
        const fromPath = typeof rawFrom === 'string' ? rawFrom : rawFrom.pathname
        if (fromPath && fromPath.startsWith('/admin') && fromPath !== '/login' && fromPath !== '/signup') {
          return typeof rawFrom === 'string' ? rawFrom : `${rawFrom.pathname}${rawFrom.search || ''}`
        }
      }
      return '/admin/dashboard'
    }

    // If authenticated user is an ORGANIZER, route to /organizer/dashboard
    // unless rawFrom is specifically an /organizer sub-route
    if (normalizedRole === 'ORGANIZER') {
      if (rawFrom) {
        const fromPath = typeof rawFrom === 'string' ? rawFrom : rawFrom.pathname
        if (fromPath && fromPath.startsWith('/organizer') && fromPath !== '/login' && fromPath !== '/signup') {
          return typeof rawFrom === 'string' ? rawFrom : `${rawFrom.pathname}${rawFrom.search || ''}`
        }
      }
      return '/organizer/dashboard'
    }

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

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [submittedStatus, setSubmittedStatus] = useState(() => {
    // Show flash message passed from signup, logout, or protected route redirect
    if (location.state?.message) {
      return {
        type: 'success',
        message: location.state.message,
      }
    }
    if (location.state?.from) {
      return {
        type: 'error',
        message: 'Please sign in to access that page.',
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)

  // Reactive redirect when session is authenticated and initialized
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const destination = computeDestination(user?.role)
      navigate(destination, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isAuthenticated, user?.role])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const validate = () => {
    const newErrors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error for this field on edit
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }

    // Clear top error message once user begins editing again
    if (submittedStatus?.type === 'error') {
      setSubmittedStatus(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent duplicate submissions while in-flight
    if (isLoading) {
      return
    }

    setSubmittedStatus(null)

    const isValid = validate()
    if (!isValid) {
      return
    }

    setIsLoading(true)

    try {
      // Delegate authentication and token/user storage to centralized AuthContext
      const authData = await login({
        email: formData.email,
        password: formData.password,
      })

      setSubmittedStatus({
        type: 'success',
        message: `Welcome back, ${authData?.name || 'User'}! Redirecting...`,
      })

      // Brief delay so user sees confirmation feedback before redirection
      const targetDestination = computeDestination(authData?.role)
      redirectTimeoutRef.current = setTimeout(() => {
        navigate(targetDestination, { replace: true })
      }, 200)
    } catch (err) {
      // Map field-level backend validation errors if provided
      if (err?.validationErrors) {
        setErrors((prev) => ({
          ...prev,
          ...err.validationErrors,
        }))
      }

      setSubmittedStatus({
        type: 'error',
        message: err?.message || 'Invalid email or password. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="landing-container">
      <Header />

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your EventEase account</p>
          </div>

          {submittedStatus && (
            <div
              className={`auth-alert ${
                submittedStatus.type === 'success' ? 'alert-success' : 'alert-error'
              }`}
              role="alert"
            >
              {submittedStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="inline-icon" aria-hidden="true" />
              ) : (
                <AlertCircle size={16} className="inline-icon" aria-hidden="true" />
              )}
              <span>{submittedStatus.message}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-switch-text">
              Don&apos;t have an account?{' '}
              <Link
                to="/signup"
                state={rawFrom ? { from: rawFrom } : undefined}
                className="auth-link"
              >
                Sign Up
              </Link>
            </p>
            <div className="auth-back-link">
              <Link to="/" className="back-link">
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
