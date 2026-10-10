import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusCard from '../components/StatusCard'
import { API_BASE_URL, apiClient } from '../api'
import { useAuth } from '../context'

export default function LandingPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [flashMessage] = useState(() => location.state?.message || null)

  const [apiCheckState, setApiCheckState] = useState({
    loading: false,
    checked: false,
    statusText: '',
    isSuccess: false,
  })

  const handleTestConnection = async () => {
    setApiCheckState({
      loading: true,
      checked: false,
      statusText: 'Connecting to backend...',
      isSuccess: false,
    })

    try {
      // Testing connection against events endpoint
      await apiClient.get('/events')
      setApiCheckState({
        loading: false,
        checked: true,
        statusText: 'Backend API connection verified (200 OK)',
        isSuccess: true,
      })
    } catch (err) {
      // Expected 401 Unauthorized for protected endpoints or connection status
      if (err.status === 401) {
        setApiCheckState({
          loading: false,
          checked: true,
          statusText: 'Backend reachable! Protected endpoint returned 401 as expected (Security active).',
          isSuccess: true,
        })
      } else if (err.isNetworkError) {
        setApiCheckState({
          loading: false,
          checked: true,
          statusText: 'Backend server not currently running on port 8080 (Network offline).',
          isSuccess: false,
        })
      } else {
        setApiCheckState({
          loading: false,
          checked: true,
          statusText: `Backend response: ${err.message}`,
          isSuccess: false,
        })
      }
    }
  }

  const frontendConfig = [
    { label: 'Framework', value: 'React 19.2 + Vite', badge: 'Active' },
    { label: 'Event Discovery', value: 'Events Catalog & Details', badge: 'Phase 11D' },
    { label: 'Origin URL', value: 'http://localhost:5173', badge: 'CORS Aligned' },
  ]

  const apiConfig = [
    { label: 'HTTP Client', value: 'Axios Centralized Client', badge: 'Configured' },
    { label: 'Base URL', value: API_BASE_URL, badge: 'Target' },
    { label: 'Request Interceptor', value: 'Bearer JWT Auto-injection', badge: 'Ready' },
    { label: 'Error Interceptor', value: 'Centralized Sanitized Handler', badge: 'Ready' },
  ]

  const backendConfig = [
    { label: 'Backend Phase', value: 'Phases 1 – 10H Complete', badge: 'Verified' },
    { label: 'Authentication', value: 'JWT Stateless + RBAC', badge: 'Enforced' },
    { label: 'Database', value: 'MySQL (eventease)', badge: 'Connected' },
  ]

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {flashMessage && (
          <div
            className={`auth-alert ${
              location.state?.unauthorized ? 'alert-error' : 'alert-success'
            }`}
            role="alert"
          >
            <span className="alert-icon" aria-hidden="true">
              {location.state?.unauthorized ? '⚠' : '✓'}
            </span>
            <span>{flashMessage}</span>
          </div>
        )}

        <section className="hero-section">
          <h1 className="hero-title">EventEase</h1>
          <p className="hero-subtitle">
            Smart Campus &amp; Corporate Event Management Platform
          </p>
          <p className="hero-description">
            EventEase simplifies event planning, registration workflows, volunteer
            coordination, and attendance tracking. Experience seamless event operations
            with role-based access for organizers, participants, and administrators.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <>
                <Link to="/events" className="btn btn-primary btn-large">
                  Browse Events &rarr;
                </Link>
                <Link to="/home" className="btn btn-secondary btn-large">
                  Workspace Home
                </Link>
              </>
            ) : (
              <>
                <Link to="/events" className="btn btn-primary btn-large">
                  Browse Events &rarr;
                </Link>
                <Link to="/signup" className="btn btn-secondary btn-large">
                  Sign Up
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="connection-section">
          <div className="connection-card">
            <div className="connection-header">
              <span className="connection-title">API Client Connectivity Test</span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTestConnection}
                disabled={apiCheckState.loading}
              >
                {apiCheckState.loading ? 'Testing...' : 'Test Backend Connection'}
              </button>
            </div>
            {apiCheckState.checked && (
              <div
                className={`connection-result ${
                  apiCheckState.isSuccess ? 'result-success' : 'result-notice'
                }`}
              >
                <span className="result-indicator" aria-hidden="true">
                  {apiCheckState.isSuccess ? '●' : '▲'}
                </span>
                <span>{apiCheckState.statusText}</span>
              </div>
            )}
          </div>
        </section>

        <section className="cards-grid">
          <StatusCard title="Frontend Foundation" items={frontendConfig} />
          <StatusCard title="API Configuration" items={apiConfig} />
          <StatusCard title="Backend Ecosystem" items={backendConfig} />
        </section>
      </main>

      <Footer />
    </div>
  )
}
