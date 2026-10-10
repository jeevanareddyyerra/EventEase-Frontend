import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import { getUserRegistrations, cancelRegistration, getCertificateByRegistration } from '../api'
import { formatDate, formatTime, formatDateTime, getTodayDateString } from '../utils/formatters'

const isUpcoming = (reg) => {
  if (!reg.eventDate) return false
  return reg.eventDate >= getTodayDateString()
}

const isPast = (reg) => {
  if (!reg.eventDate) return false
  return reg.eventDate < getTodayDateString()
}

export default function MyRegistrationsPage() {
  const { user } = useAuth()
  const userId = user?.id || user?.userId

  const [registrations, setRegistrations] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [errorMessage, setErrorMessage] = useState(null)
  const [filterTab, setFilterTab] = useState('ALL')
  const [timelineFilter, setTimelineFilter] = useState('ALL')
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Cancellation state
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Participant certificates mapping: { [regId]: CertificateResponse }
  const [certificatesMap, setCertificatesMap] = useState({})

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setCertificatesMap({})
    setFetchTrigger((prev) => prev + 1)
  }

  useEffect(() => {
    if (!userId) {
      return
    }

    let isMounted = true

    getUserRegistrations(userId)
      .then((response) => {
        if (!isMounted) return
        if (Array.isArray(response.data)) {
          // Sort newest first by registeredAt
          const sorted = [...response.data].sort((a, b) => {
            return new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0)
          })
          setRegistrations(sorted)

          // Fetch certificate status for completed events
          const completedRegs = sorted.filter(
            (r) => r.eventStatus === 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'REJECTED'
          )
          if (completedRegs.length > 0) {
            Promise.allSettled(
              completedRegs.map(async (reg) => {
                try {
                  const res = await getCertificateByRegistration(reg.id)
                  if (isMounted && res.data) {
                    setCertificatesMap((prev) => ({
                      ...prev,
                      [reg.id]: res.data,
                    }))
                  }
                } catch {
                  // Not issued (404) or failed fetch
                  if (isMounted) {
                    setCertificatesMap((prev) => ({
                      ...prev,
                      [reg.id]: { id: null, status: 'NOT_ISSUED' },
                    }))
                  }
                }
              })
            )
          }
        } else {
          setRegistrations([])
        }
        setErrorMessage(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setErrorMessage(err?.message || 'Failed to load your registrations.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [userId, fetchTrigger])

  const handlePromptCancel = (regId) => {
    setActionError(null)
    setActionSuccess(null)
    setConfirmCancelId(regId)
  }

  const handleDismissCancelPrompt = () => {
    setConfirmCancelId(null)
  }

  const handleConfirmCancel = async (regId) => {
    setCancellingId(regId)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await cancelRegistration(regId)
      const updated = response.data

      // Update in state
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: updated.status || 'CANCELLED' } : r))
      )
      setConfirmCancelId(null)
      setActionSuccess(`Registration #${regId} has been successfully cancelled.`)
    } catch (err) {
      setActionError(err?.message || 'Failed to cancel registration. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  // Filter registrations by tab and timeline
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // 1. Status / Type match
      let matchesStatus = true
      if (filterTab === 'ACTIVE') {
        matchesStatus = reg.status === 'REGISTERED' || reg.status === 'ACCEPTED'
      } else if (filterTab === 'CANCELLED') {
        matchesStatus = reg.status === 'CANCELLED'
      } else if (filterTab === 'VOLUNTEER') {
        matchesStatus = reg.type === 'VOLUNTEER'
      }

      // 2. Timeline match
      let matchesTimeline = true
      if (timelineFilter === 'UPCOMING') {
        matchesTimeline = isUpcoming(reg)
      } else if (timelineFilter === 'PAST') {
        matchesTimeline = isPast(reg)
      }

      return matchesStatus && matchesTimeline
    })
  }, [registrations, filterTab, timelineFilter])

  const counts = useMemo(
    () => ({
      all: registrations.length,
      active: registrations.filter(
        (r) => r.status === 'REGISTERED' || r.status === 'ACCEPTED'
      ).length,
      cancelled: registrations.filter((r) => r.status === 'CANCELLED').length,
      volunteer: registrations.filter((r) => r.type === 'VOLUNTEER').length,
      upcoming: registrations.filter(isUpcoming).length,
      past: registrations.filter(isPast).length,
    }),
    [registrations]
  )

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
        {/* Breadcrumb & Navigation */}
        <div className="event-breadcrumb">
          <Link to="/home" className="back-link">
            &larr; Back to Home
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link to="/events" className="back-link">
            Browse Events
          </Link>
        </div>

        {/* Page Header */}
        <div className="events-header">
          <div>
            <h1 className="events-page-title">My Event Registrations</h1>
            <p className="events-page-subtitle">
              Manage your event ticket admissions, volunteer roles, and track registration status.
            </p>
          </div>
          <Link to="/events" className="btn btn-primary">
            + Discover More Events
          </Link>
        </div>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div
            className="alert alert-success"
            role="status"
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setActionSuccess(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="alert-icon" aria-hidden="true">⚠</span>
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setActionError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="auth-loading-screen" role="status">
            <span className="auth-spinner" aria-hidden="true"></span>
            <p>Loading your event registrations...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <span style={{ fontSize: '2.5rem' }} aria-hidden="true">⚠</span>
            <h2 style={{ margin: '0.75rem 0 0.25rem' }}>Unable to Load Registrations</h2>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '440px' }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={handleRetry}>
                Retry Loading
              </button>
              <Link to="/events" className="btn btn-secondary">
                Browse Events
              </Link>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {!isLoading && !errorMessage && (
          <>
            {/* Filter Tabs */}
            <div className="my-reg-tabs-bar">
              <div className="my-reg-tabs">
                <button
                  type="button"
                  className={`tab-btn ${filterTab === 'ALL' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFilterTab('ALL')}
                >
                  All ({counts.all})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterTab === 'ACTIVE' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFilterTab('ACTIVE')}
                >
                  Active ({counts.active})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterTab === 'CANCELLED' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFilterTab('CANCELLED')}
                >
                  Cancelled ({counts.cancelled})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterTab === 'VOLUNTEER' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFilterTab('VOLUNTEER')}
                >
                  Volunteer Roles ({counts.volunteer})
                </button>
              </div>

              {/* Timeline Filter Pills */}
              <div className="my-reg-timeline-filter" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                  Timeline:
                </span>
                <button
                  type="button"
                  className={`btn ${timelineFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: '20px' }}
                  onClick={() => setTimelineFilter('ALL')}
                >
                  All Time ({counts.all})
                </button>
                <button
                  type="button"
                  className={`btn ${timelineFilter === 'UPCOMING' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: '20px' }}
                  onClick={() => setTimelineFilter('UPCOMING')}
                >
                  Upcoming ({counts.upcoming})
                </button>
                <button
                  type="button"
                  className={`btn ${timelineFilter === 'PAST' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: '20px' }}
                  onClick={() => setTimelineFilter('PAST')}
                >
                  Past ({counts.past})
                </button>
              </div>
            </div>

            {/* Empty States */}
            {registrations.length === 0 ? (
              <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <span style={{ fontSize: '2.5rem' }} aria-hidden="true">📋</span>
                <h2 style={{ margin: '0.75rem 0 0.25rem' }}>No Registrations Yet</h2>
                <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '460px' }}>
                  You have not registered for any events yet. Explore upcoming hackathons,
                  workshops, and conferences to reserve your ticket or apply as a volunteer!
                </p>
                <Link to="/events" className="btn btn-primary">
                  Browse Available Events &rarr;
                </Link>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="connection-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
                <span style={{ fontSize: '2rem' }} aria-hidden="true">🔍</span>
                <h3 style={{ margin: '0.5rem 0 0.25rem' }}>
                  No matching registrations found
                </h3>
                <p className="hero-description" style={{ margin: '0 auto 1rem', maxWidth: '400px' }}>
                  There are no records matching your selected filter criteria
                  {filterTab !== 'ALL' ? ` (${filterTab.toLowerCase()} status)` : ''}
                  {timelineFilter !== 'ALL' ? ` in ${timelineFilter.toLowerCase()} events` : ''}.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterTab('ALL')
                    setTimelineFilter('ALL')
                  }}
                >
                  Show All Registrations
                </button>
              </div>
            ) : (
              /* Registrations Grid */
              <div className="my-reg-list">
                {filteredRegistrations.map((reg) => {
                  const canCancel =
                    reg.status === 'REGISTERED' || reg.status === 'ACCEPTED'
                  const isConfirming = confirmCancelId === reg.id
                  const isProcessing = cancellingId === reg.id

                  return (
                    <article key={reg.id} className="my-reg-card">
                      <div className="my-reg-header">
                        <div>
                          <div className="my-reg-badges">
                            <span
                              className={`badge ${
                                reg.type === 'VOLUNTEER' ? 'badge-role' : 'badge-accent'
                              }`}
                            >
                              {reg.type === 'VOLUNTEER' ? '🤝 Volunteer' : '🎟️ Participant'}
                            </span>
                            <span className={`badge ${getStatusBadgeClass(reg.status)}`}>
                              {reg.status}
                            </span>
                            {reg.eventStatus && (
                              <span className="badge badge-secondary">
                                Event: {reg.eventStatus}
                              </span>
                            )}
                            <span className="badge badge-secondary">
                              ID: #{reg.id}
                            </span>
                            {reg.eventStatus === 'COMPLETED' && (
                              certificatesMap[reg.id]?.status === 'ISSUED' ? (
                                <span className="badge badge-success">
                                  🎓 Certificate #{certificatesMap[reg.id].id}
                                </span>
                              ) : (
                                <span className="badge badge-secondary">
                                  Certificate: Not Issued
                                </span>
                              )
                            )}
                          </div>

                          <h2 className="my-reg-event-title">
                            {reg.eventId ? (
                              <Link
                                to={`/events/${reg.eventId}`}
                                className="my-reg-title-link"
                              >
                                {reg.eventTitle || `Event #${reg.eventId}`}
                              </Link>
                            ) : (
                              reg.eventTitle || 'Event'
                            )}
                          </h2>

                          {/* Enriched Event Details: Date, Time, Venue */}
                          {(reg.eventDate || reg.eventVenue) && (
                            <div
                              className="my-reg-event-meta"
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                marginTop: '0.5rem',
                                fontSize: '0.88rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {reg.eventDate && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span aria-hidden="true">📅</span>
                                  <span>
                                    {formatDate(reg.eventDate)}
                                    {reg.eventStartTime ? ` • ${formatTime(reg.eventStartTime)}` : ''}
                                  </span>
                                </span>
                              )}
                              {reg.eventVenue && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span aria-hidden="true">📍</span>
                                  <span>{reg.eventVenue}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Certificate Details for Completed Event */}
                          {certificatesMap[reg.id]?.status === 'ISSUED' && (
                            <div
                              className="my-reg-certificate-box"
                              style={{
                                marginTop: '0.85rem',
                                padding: '0.65rem 0.9rem',
                                background: 'var(--code-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }} aria-hidden="true">🎓</span>
                                <div>
                                  <strong style={{ color: 'var(--text-h)', fontSize: '0.88rem' }}>
                                    Certificate of Attendance
                                  </strong>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Certificate ID: #{certificatesMap[reg.id].id}
                                    {certificatesMap[reg.id].issuedAt
                                      ? ` • Issued on ${formatDate(certificatesMap[reg.id].issuedAt)}`
                                      : ''}
                                  </div>
                                </div>
                              </div>
                              {certificatesMap[reg.id].certificateUrl ? (
                                <a
                                  href={certificatesMap[reg.id].certificateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-small"
                                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Open Certificate &rarr;
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  (Verified on platform)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="my-reg-timestamp">
                          <span className="info-label">Registered on</span>
                          <span className="info-value">
                            {reg.registeredAt ? formatDateTime(reg.registeredAt) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Cancellation Prompt / Confirmation Box */}
                      {isConfirming && (
                        <div className="my-reg-confirm-box" role="alert">
                          <div className="confirm-box-content">
                            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">⚠</span>
                            <div>
                              <strong>Cancel Registration Confirmation</strong>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                                Are you sure you want to cancel your registration for{' '}
                                <strong>{reg.eventTitle}</strong>? Once cancelled, platform policy
                                prohibits re-registering for this event.
                              </p>
                            </div>
                          </div>
                          <div className="confirm-box-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={handleDismissCancelPrompt}
                              disabled={isProcessing}
                            >
                              Keep Registration
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleConfirmCancel(reg.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? 'Cancelling...' : 'Yes, Cancel Registration'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card Actions Footer */}
                      <div className="my-reg-footer">
                        <div className="my-reg-footer-links">
                          {reg.eventId && (
                            <Link
                              to={`/events/${reg.eventId}`}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              View Event Details &rarr;
                            </Link>
                          )}
                        </div>

                        <div className="my-reg-footer-actions">
                          {canCancel && !isConfirming && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-cancel-reg"
                              onClick={() => handlePromptCancel(reg.id)}
                              disabled={isProcessing}
                            >
                              Cancel Registration
                            </button>
                          )}

                          {reg.status === 'CANCELLED' && (
                            <span className="status-note status-note-cancelled">
                              Cancelled • Registration cannot be reactivated
                            </span>
                          )}

                          {reg.status === 'REJECTED' && (
                            <span className="status-note status-note-rejected">
                              Application Not Accepted
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
