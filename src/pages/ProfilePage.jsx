import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import { getUserRegistrations } from '../api'
import { formatDate, formatDateTime, getTodayDateString } from '../utils/formatters'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id || user?.userId

  const [registrations, setRegistrations] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(Boolean(userId))
  const [activityError, setActivityError] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: { message: 'You have been successfully signed out.' },
    })
  }

  // Load user registrations once for activity summary
  useEffect(() => {
    if (!userId) return

    let isMounted = true

    getUserRegistrations(userId)
      .then((response) => {
        if (!isMounted) return
        if (Array.isArray(response.data)) {
          const sorted = [...response.data].sort((a, b) => {
            return new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0)
          })
          setRegistrations(sorted)
        } else {
          setRegistrations([])
        }
        setActivityError(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setActivityError(err?.message || 'Could not load personal event activity.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingActivity(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  // Compute personal activity summary metrics from backend registration data
  const activityMetrics = useMemo(() => {
    const total = registrations.length
    const active = registrations.filter(
      (r) => r.status === 'REGISTERED' || r.status === 'ACCEPTED'
    ).length
    const cancelled = registrations.filter((r) => r.status === 'CANCELLED').length
    const participant = registrations.filter((r) => r.type === 'PARTICIPANT').length
    const volunteer = registrations.filter((r) => r.type === 'VOLUNTEER').length
    const rejected = registrations.filter((r) => r.status === 'REJECTED').length

    // Upcoming and past registrations
    const today = getTodayDateString()
    const upcoming = registrations.filter((r) => r.eventDate && r.eventDate >= today).length
    const past = registrations.filter((r) => r.eventDate && r.eventDate < today).length

    return {
      total,
      active,
      cancelled,
      participant,
      volunteer,
      rejected,
      upcoming,
      past,
      recent: registrations.slice(0, 3),
    }
  }, [registrations])

  const userRole = (user?.role ? String(user.role) : 'USER').toUpperCase()

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'REGISTERED':
        return 'badge-success'
      case 'ACCEPTED':
        return 'badge-accent'
      case 'CANCELLED':
        return 'badge-error'
      case 'REJECTED':
        return 'badge-warning'
      default:
        return 'badge-secondary'
    }
  }

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {/* Navigation Breadcrumb */}
        <div className="event-breadcrumb">
          <Link to="/home" className="back-link">
            &larr; Back to Home
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link to="/events" className="back-link">
            Browse Events
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link to="/my-registrations" className="back-link">
            My Registrations
          </Link>
        </div>

        {/* Page Header */}
        <div className="events-header">
          <div>
            <h1 className="events-page-title">Personal Profile &amp; Activity</h1>
            <p className="events-page-subtitle">
              View your account credentials, security role, and personal event activity summary.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/my-registrations" className="btn btn-secondary">
              My Registrations
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLogout}
              aria-label="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="profile-grid">
          {/* User Account Details Card (Read-Only) */}
          <section className="profile-card">
            <div className="profile-card-header">
              <div className="profile-avatar">
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              </div>
              <div>
                <h2 className="profile-name">{user?.name || 'EventEase User'}</h2>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', alignItems: 'center' }}>
                  <span className="badge badge-role">{userRole}</span>
                  <span className="badge badge-success">Active Session</span>
                </div>
              </div>
            </div>

            <div className="profile-field-group">
              <div className="profile-field">
                <span className="profile-field-label">User / Account ID</span>
                <span className="profile-field-value">
                  #{user?.id || user?.userId || 'N/A'}
                </span>
              </div>

              <div className="profile-field">
                <span className="profile-field-label">Full Name</span>
                <span className="profile-field-value">{user?.name || 'N/A'}</span>
              </div>

              <div className="profile-field">
                <span className="profile-field-label">Email Address</span>
                <span className="profile-field-value">{user?.email || 'N/A'}</span>
              </div>

              <div className="profile-field">
                <span className="profile-field-label">Phone Number</span>
                <span className="profile-field-value">
                  {user?.phone ? user.phone : 'Not provided'}
                </span>
              </div>

              <div className="profile-field">
                <span className="profile-field-label">Platform Role</span>
                <span className="profile-field-value">
                  <code>{userRole}</code>
                </span>
              </div>

              <div className="profile-field">
                <span className="profile-field-label">Authentication Type</span>
                <span className="profile-field-value">JWT Bearer Token</span>
              </div>
            </div>

            {/* Backend Capabilities Note */}
            <div className="profile-notice-box">
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">ℹ</span>
              <div>
                <strong>Account Management Policy</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Profile modifications are administered centrally. In compliance with EventEase
                  backend access controls, self-service profile updates are not currently exposed
                  over public endpoints.
                </p>
              </div>
            </div>
          </section>

          {/* Personal Event Activity Section */}
          <section className="profile-card">
            <div className="profile-card-header-simple">
              <h2 className="profile-card-title">Personal Event Activity</h2>
              <span className="badge badge-accent">Live Activity</span>
            </div>

            {isLoadingActivity && (
              <div className="auth-loading-screen" role="status" style={{ padding: '2rem 1rem' }}>
                <span className="auth-spinner" aria-hidden="true"></span>
                <p>Loading activity metrics...</p>
              </div>
            )}

            {!isLoadingActivity && activityError && (
              <div className="alert alert-error" role="alert" style={{ margin: '1rem 0' }}>
                <span className="alert-icon" aria-hidden="true">⚠</span>
                <span>{activityError}</span>
              </div>
            )}

            {!isLoadingActivity && !activityError && (
              <>
                {/* Activity Metrics Grid */}
                <div className="activity-stats-grid">
                  <div className="activity-stat-card">
                    <span className="activity-stat-icon" aria-hidden="true">📋</span>
                    <span className="activity-stat-number">{activityMetrics.total}</span>
                    <span className="activity-stat-label">Total Registrations</span>
                  </div>

                  <div className="activity-stat-card">
                    <span className="activity-stat-icon" aria-hidden="true">🎟️</span>
                    <span className="activity-stat-number">{activityMetrics.active}</span>
                    <span className="activity-stat-label">Active Tickets</span>
                  </div>

                  <div className="activity-stat-card">
                    <span className="activity-stat-icon" aria-hidden="true">🤝</span>
                    <span className="activity-stat-number">{activityMetrics.volunteer}</span>
                    <span className="activity-stat-label">Volunteer Roles</span>
                  </div>

                  <div className="activity-stat-card">
                    <span className="activity-stat-icon" aria-hidden="true">🚫</span>
                    <span className="activity-stat-number">{activityMetrics.cancelled}</span>
                    <span className="activity-stat-label">Cancelled Tickets</span>
                  </div>
                </div>

                {/* Breakdown Summary */}
                <div className="activity-breakdown-box">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Participant Registrations:</span>
                    <span className="badge badge-accent">{activityMetrics.participant}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Volunteer Registrations:</span>
                    <span className="badge badge-role">{activityMetrics.volunteer}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Upcoming Events:</span>
                    <span className="badge badge-success">{activityMetrics.upcoming}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Past Events:</span>
                    <span className="badge badge-secondary">{activityMetrics.past}</span>
                  </div>
                  {activityMetrics.rejected > 0 && (
                    <div className="breakdown-item">
                      <span className="breakdown-label">Declined Applications:</span>
                      <span className="badge badge-warning">{activityMetrics.rejected}</span>
                    </div>
                  )}
                </div>

                {/* Recent Event Registrations Preview */}
                <div className="activity-recent-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-h)' }}>
                      Recent Registrations
                    </h3>
                    <Link
                      to="/my-registrations"
                      className="auth-link"
                      style={{ fontSize: '0.85rem' }}
                    >
                      View All ({activityMetrics.total}) &rarr;
                    </Link>
                  </div>

                  {activityMetrics.recent.length === 0 ? (
                    <div className="connection-card" style={{ textAlign: 'center', padding: '1.75rem 1rem' }}>
                      <p className="hero-description" style={{ margin: 0, fontSize: '0.9rem' }}>
                        You haven&apos;t registered for any events yet.
                      </p>
                      <Link
                        to="/events"
                        className="btn btn-primary"
                        style={{ marginTop: '0.75rem', display: 'inline-block' }}
                      >
                        Discover Events &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="activity-recent-list">
                      {activityMetrics.recent.map((reg) => (
                        <div key={reg.id} className="activity-recent-item">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <span className={`badge ${reg.type === 'VOLUNTEER' ? 'badge-role' : 'badge-accent'}`}>
                                {reg.type === 'VOLUNTEER' ? 'Volunteer' : 'Participant'}
                              </span>
                              <span className={`badge ${getStatusBadgeClass(reg.status)}`}>
                                {reg.status}
                              </span>
                            </div>
                            <Link
                              to={`/events/${reg.eventId}`}
                              className="activity-recent-title"
                            >
                              {reg.eventTitle || `Event #${reg.eventId}`}
                            </Link>
                            {(reg.eventDate || reg.eventVenue) && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                {reg.eventDate ? `📅 ${formatDate(reg.eventDate)}` : ''}
                                {reg.eventDate && reg.eventVenue ? ' • ' : ''}
                                {reg.eventVenue ? `📍 ${reg.eventVenue}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="activity-recent-time">
                            {reg.registeredAt ? formatDateTime(reg.registeredAt) : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
