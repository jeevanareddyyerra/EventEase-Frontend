import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { signup } from '../api'

export default function SignupPage() {
  const navigate = useNavigate()
  const redirectTimeoutRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [submittedStatus, setSubmittedStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

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

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.'
    }

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

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
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

    // Clear field-specific error on change
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }

    // Clear top error alert on edit
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
      await signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      })

      // On successful signup, display success notification and redirect to /login
      setSubmittedStatus({
        type: 'success',
        message: 'Account created successfully! Redirecting to login...',
      })

      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Registration successful! Please sign in with your email and password.',
          },
        })
      }, 1400)
    } catch (err) {
      // Map backend validation errors to fields
      if (err?.validationErrors) {
        setErrors((prev) => ({
          ...prev,
          ...err.validationErrors,
        }))
      }

      // Handle duplicate email conflict (HTTP 409)
      if (err?.status === 409) {
        setErrors((prev) => ({
          ...prev,
          email: err.message || 'This email address is already registered.',
        }))
      }

      setSubmittedStatus({
        type: 'error',
        message: err?.message || 'Failed to create account. Please check your information.',
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
            <h1 className="auth-title">Create an Account</h1>
            <p className="auth-subtitle">Join EventEase to discover and coordinate events</p>
          </div>

          {submittedStatus && (
            <div
              className={`auth-alert ${
                submittedStatus.type === 'success' ? 'alert-success' : 'alert-error'
              }`}
              role="alert"
            >
              <span className="alert-icon" aria-hidden="true">
                {submittedStatus.type === 'success' ? '✓' : '⚠'}
              </span>
              <span>{submittedStatus.message}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="signup-name" className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-phone" className="form-label">
                Phone Number <span className="optional">(optional)</span>
              </label>
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="form-input"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirm-password" className="form-label">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-switch-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Log In
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
