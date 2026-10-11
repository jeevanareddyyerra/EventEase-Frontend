import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import {
  getEventById,
  getVolunteerRequirements,
  createRegistration,
  cancelRegistration,
  getUserRegistrations,
  getParticipantCount,
  getVolunteerCount,
  getTeamsByEvent,
  createTeam,
} from '../api'
import { formatDate, formatTimeRange, formatDateTime } from '../utils/formatters'

export default function EventDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const currentUserId = user?.id || user?.userId

  const numericId = Number(id)
  const isInvalidId = !id || isNaN(numericId) || numericId <= 0

  // Event & Requirements Data
  const [event, setEvent] = useState(null)
  const [volunteerReq, setVolunteerReq] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [volunteerCount, setVolunteerCount] = useState(0)
  const [userRegistration, setUserRegistration] = useState(null)
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false)

  // Page States
  const [isLoading, setIsLoading] = useState(!isInvalidId)
  const [errorMessage, setErrorMessage] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Action States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Team Formation States
  const [eventTeams, setEventTeams] = useState([])
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [teamActionError, setTeamActionError] = useState(null)
  const [teamActionSuccess, setTeamActionSuccess] = useState(null)

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setActionError(null)
    setFetchTrigger((prev) => prev + 1)
  }

  // Load event details, capacity counts, requirements, and user registration
  useEffect(() => {
    if (isInvalidId) return

    let isMounted = true

    // Fetch Event
    getEventById(id)
      .then(async (eventRes) => {
        if (!isMounted) return
        const ev = eventRes.data
        setEvent(ev)
        setIsDeadlinePassed(
          Boolean(ev.registrationDeadline && Date.parse(ev.registrationDeadline) < Date.now())
        )

        // Fetch Volunteer Requirements (non-blocking)
        try {
          const volRes = await getVolunteerRequirements()
          if (isMounted && Array.isArray(volRes.data)) {
            const req = volRes.data.find((r) => String(r.eventId) === String(id))
            setVolunteerReq(req || null)
          }
        } catch {
          // Non-blocking
        }

        // Fetch Participant & Volunteer counts (non-blocking)
        try {
          const [pCountRes, vCountRes] = await Promise.all([
            getParticipantCount(id),
            getVolunteerCount(id),
          ])
          if (isMounted) {
            setParticipantCount(Number(pCountRes.data) || 0)
            setVolunteerCount(Number(vCountRes.data) || 0)
          }
        } catch {
          // Non-blocking
        }

        // Check if current user is registered for this event (non-blocking)
        if (currentUserId) {
          try {
            const userRegsRes = await getUserRegistrations(currentUserId)
            if (isMounted && Array.isArray(userRegsRes.data)) {
              const existing = userRegsRes.data.find(
                (r) => String(r.eventId) === String(id)
              )
              setUserRegistration(existing || null)
            }
          } catch {
            // Non-blocking
          }
        }

        // 4. Fetch Event Teams
        try {
          const teamsRes = await getTeamsByEvent(id)
          if (isMounted && Array.isArray(teamsRes.data)) {
            setEventTeams(teamsRes.data)
          }
        } catch {
          // Non-blocking
        }
      })
      .catch((err) => {
        if (!isMounted) return
        if (err?.status === 404) {
          setErrorMessage('Event not found. The requested event does not exist or has been removed.')
        } else {
          setErrorMessage(err?.message || 'Failed to load event details from the server.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id, isInvalidId, currentUserId, fetchTrigger])

  // Derived Business Rule Properties (computed directly during render)
  const isParticipantCapacityFull =
    event?.capacity != null && participantCount >= event.capacity

  const isVolunteerCapacityFull =
    volunteerReq?.requiredCount != null && volunteerCount >= volunteerReq.requiredCount

  const isEventOpenForRegistration =
    event?.status === 'PUBLISHED' || event?.status === 'APPROVED'

  // Participant Registration Submission
  const handleRegister = async (type) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: location, message: 'Please log in to register for this event.' },
      })
      return
    }

    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await createRegistration({
        userId: currentUserId,
        eventId: Number(id),
        type,
      })

      const created = response.data
      setUserRegistration(created)

      if (type === 'PARTICIPANT') {
        setParticipantCount((prev) => prev + 1)
      } else if (type === 'VOLUNTEER') {
        setVolunteerCount((prev) => prev + 1)
      }

      setActionSuccess({
        message: `Successfully registered as ${
          type === 'PARTICIPANT' ? 'a Participant' : 'a Volunteer'
        }! Ticket / Reference ID: #${created.id}`,
        type,
      })
    } catch (err) {
      setActionError(err?.message || 'Registration request failed. Please check event requirements.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cancellation Submission
  const handleCancelRegistration = async () => {
    if (!userRegistration) return

    setIsCancelling(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await cancelRegistration(userRegistration.id)
      const cancelled = response.data

      setUserRegistration(cancelled)
      setShowCancelConfirm(false)

      if (userRegistration.type === 'PARTICIPANT') {
        setParticipantCount((prev) => Math.max(0, prev - 1))
      } else if (userRegistration.type === 'VOLUNTEER') {
        setVolunteerCount((prev) => Math.max(0, prev - 1))
      }

      setActionSuccess({
        message: 'Your registration has been cancelled successfully.',
        type: 'CANCELLED',
      })
    } catch (err) {
      setActionError(err?.message || 'Failed to cancel registration. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Team Creation
  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setIsCreatingTeam(true)
    setTeamActionError(null)
    setTeamActionSuccess(null)

    try {
      const res = await createTeam({
        name: newTeamName.trim(),
        eventId: Number(id),
        leaderId: currentUserId,
      })
      const created = res.data
      setEventTeams((prev) => [...prev, created])
      setTeamActionSuccess(`Team "${created.name}" created successfully!`)
      setNewTeamName('')
      setShowCreateTeamModal(false)
    } catch (err) {
      setTeamActionError(err?.message || 'Failed to create team.')
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return 'badge-success'
      case 'APPROVED':
        return 'badge-accent'
      case 'COMPLETED':
        return 'badge-secondary'
      case 'CANCELLED':
        return 'badge-error'
      case 'PENDING':
      default:
        return 'badge-warning'
    }
  }

  const getRegStatusBadgeClass = (status) => {
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
        {/* Navigation Breadcrumbs */}
        <div className="event-breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/events" className="back-link">
              &larr; Back to Events Discovery
            </Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link to="/my-registrations" className="back-link">
              My Registrations
            </Link>
          </div>
          {event && (
            <Link
              to={`/assistant?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}`}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span aria-hidden="true">✨</span> Ask AI About This Event
            </Link>
          )}
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div
            className="alert alert-success"
            role="status"
            style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              <div>
                <span>{actionSuccess.message}</span>
                <div style={{ marginTop: '0.2rem' }}>
                  <Link
                    to="/my-registrations"
                    className="auth-link"
                    style={{ fontSize: '0.85rem' }}
                  >
                    View in My Registrations &rarr;
                  </Link>
                </div>
              </div>
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
            style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
            <p>Loading event information and registration availability...</p>
          </div>
        )}

        {/* Invalid ID State */}
        {!isLoading && isInvalidId && (
          <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <span style={{ fontSize: '2.5rem' }} aria-hidden="true">⚠</span>
            <h2 style={{ margin: '0.75rem 0 0.25rem' }}>Invalid Event Identifier</h2>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '440px' }}>
              The event ID specified in the URL is not valid. Please return to the events catalog.
            </p>
            <Link to="/events" className="btn btn-primary">
              Return to Events Catalog
            </Link>
          </div>
        )}

        {/* Error State */}
        {!isLoading && !isInvalidId && errorMessage && (
          <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <span style={{ fontSize: '2.5rem' }} aria-hidden="true">🔍</span>
            <h2 style={{ margin: '0.75rem 0 0.25rem' }}>Event Unavailable</h2>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '460px' }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={handleRetry}>
                Retry Loading
              </button>
              <Link to="/events" className="btn btn-secondary">
                Browse Other Events
              </Link>
            </div>
          </div>
        )}

        {/* Event Details Content */}
        {!isLoading && !isInvalidId && !errorMessage && event && (
          <article className="event-details-container">
            {/* Main Event Information Card */}
            <div className="event-details-card">
              {event.imageUrl && (
                <div
                  className="event-hero-poster-wrapper"
                  style={{
                    width: '100%',
                    maxHeight: '380px',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    style={{ width: '100%', height: '100%', maxHeight: '380px', objectFit: 'cover' }}
                  />
                </div>
              )}
              <div className="event-details-hero">
                <div className="event-hero-badges">
                  <span className="badge badge-accent">
                    {event.category || 'General Event'}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(event.status)}`}>
                    {event.status || 'UNKNOWN'}
                  </span>
                </div>

                <h1 className="event-details-title">{event.title}</h1>

                <div className="event-organizer-meta">
                  <span>
                    Organized by: <strong>{event.organizerName || 'Event Coordinator'}</strong>
                  </span>
                  {event.createdAt && (
                    <span className="meta-timestamp">
                      • Created on {formatDate(event.createdAt.substring(0, 10))}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="event-info-grid">
                <div className="event-info-item">
                  <span className="info-icon" aria-hidden="true">📅</span>
                  <div className="info-text">
                    <span className="info-label">Date</span>
                    <span className="info-value">{formatDate(event.date)}</span>
                  </div>
                </div>

                <div className="event-info-item">
                  <span className="info-icon" aria-hidden="true">⏰</span>
                  <div className="info-text">
                    <span className="info-label">Time</span>
                    <span className="info-value">
                      {formatTimeRange(event.startTime, event.endTime)}
                    </span>
                  </div>
                </div>

                <div className="event-info-item">
                  <span className="info-icon" aria-hidden="true">📍</span>
                  <div className="info-text">
                    <span className="info-label">Venue</span>
                    <span className="info-value">{event.venue || 'Venue to be announced'}</span>
                  </div>
                </div>

                <div className="event-info-item">
                  <span className="info-icon" aria-hidden="true">👥</span>
                  <div className="info-text">
                    <span className="info-label">Capacity &amp; Attendance</span>
                    <span className="info-value">
                      {event.capacity != null
                        ? `${participantCount} / ${event.capacity} Filled`
                        : `${participantCount} Registered (Open)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="event-section">
                <h2 className="event-section-title">About this Event</h2>
                <div className="event-description-body">
                  <p>{event.description || 'No detailed description provided for this event.'}</p>
                </div>
              </div>

              {/* Eligibility & Deadlines */}
              <div className="event-section">
                <h2 className="event-section-title">Participation &amp; Eligibility</h2>
                <div className="event-meta-attributes">
                  <div className="attribute-row">
                    <span className="attribute-name">Eligibility:</span>
                    <span className="attribute-value">
                      {event.eligibility && event.eligibility.trim()
                        ? event.eligibility
                        : 'Open to all registered attendees'}
                    </span>
                  </div>

                  <div className="attribute-row">
                    <span className="attribute-name">Registration Deadline:</span>
                    <span className="attribute-value">
                      {event.registrationDeadline
                        ? formatDateTime(event.registrationDeadline)
                        : 'Until capacity is filled or event starts'}
                    </span>
                  </div>

                  <div className="attribute-row">
                    <span className="attribute-name">Deadline Status:</span>
                    <span className="attribute-value">
                      {isDeadlinePassed ? (
                        <span className="badge badge-error">Registration Closed</span>
                      ) : (
                        <span className="badge badge-success">Registration Open</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volunteer Requirements (if present) */}
              {volunteerReq && (
                <div className="event-section volunteer-section">
                  <div className="volunteer-header">
                    <span className="volunteer-icon" aria-hidden="true">🤝</span>
                    <div>
                      <h2 className="event-section-title" style={{ margin: 0 }}>
                        Volunteer Opportunities
                      </h2>
                      <p className="section-subtitle" style={{ margin: '0.2rem 0 0' }}>
                        This event is recruiting active volunteer roles
                      </p>
                    </div>
                  </div>

                  <div className="volunteer-details-box">
                    <div className="attribute-row">
                      <span className="attribute-name">Required Volunteers:</span>
                      <span className="badge badge-accent">
                        {volunteerCount} / {volunteerReq.requiredCount} Positions Assigned
                      </span>
                    </div>
                    {volunteerReq.description && (
                      <div className="attribute-row" style={{ marginTop: '0.5rem' }}>
                        <span className="attribute-name">Volunteer Duties:</span>
                        <span className="attribute-value">{volunteerReq.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Teams & Collaboration Section */}
              <div className="event-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <h2 className="event-section-title" style={{ margin: 0 }}>
                    👥 Teams &amp; Collaboration ({eventTeams.length})
                  </h2>
                  {userRegistration && userRegistration.type === 'PARTICIPANT' && userRegistration.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setShowCreateTeamModal(true)
                        setTeamActionError(null)
                      }}
                    >
                      + Form a Team
                    </button>
                  )}
                </div>

                {teamActionSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                    ✓ {teamActionSuccess}
                  </div>
                )}

                {showCreateTeamModal && (
                  <form onSubmit={handleCreateTeam} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-subtle, rgba(255,255,255,0.02))', marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Form New Team for this Event</h3>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label htmlFor="teamNameInput" className="form-label" style={{ fontSize: '0.85rem' }}>Team Name</label>
                      <input
                        id="teamNameInput"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Code Ninjas, Team Alpha"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        maxLength={100}
                        required
                      />
                    </div>
                    {teamActionError && (
                      <span className="field-error-text" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        {teamActionError}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary btn-small" disabled={isCreatingTeam}>
                        {isCreatingTeam ? 'Creating...' : 'Create Team'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowCreateTeamModal(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {eventTeams.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    No teams formed yet for this event. {userRegistration?.type === 'PARTICIPANT' ? 'Be the first to form a team!' : 'Register as a participant to form a team.'}
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {eventTeams.map((tm) => (
                      <div key={tm.id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--card-bg, rgba(255,255,255,0.02))' }}>
                        <strong style={{ display: 'block', fontSize: '0.92rem' }}>{tm.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Leader: {tm.leaderName || `User #${tm.leaderId}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Registration Call-To-Action Box */}
            <aside className="event-cta-card">
              <div className="cta-header">
                <h3 className="cta-title">Event Registration</h3>
                <span className="badge badge-role">Official Registration</span>
              </div>

              {/* Case 1: User Already Has a Registration for this Event */}
              {userRegistration ? (
                <div className="cta-action-group">
                  <div className="cta-reg-status-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cta-reg-type">
                        {userRegistration.type === 'VOLUNTEER'
                          ? '🤝 Registered as Volunteer'
                          : '🎟️ Registered as Participant'}
                      </span>
                      <span className={`badge ${getRegStatusBadgeClass(userRegistration.status)}`}>
                        {userRegistration.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.5rem' }}>
                      <div>Registration ID: <strong>#{userRegistration.id}</strong></div>
                      {userRegistration.registeredAt && (
                        <div>
                          Registered on:{' '}
                          <strong>{formatDateTime(userRegistration.registeredAt)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Registration Cancellation Flow */}
                  {(userRegistration.status === 'REGISTERED' ||
                    userRegistration.status === 'ACCEPTED') &&
                    event.status !== 'COMPLETED' &&
                    event.status !== 'CANCELLED' && (
                      <div>
                        {showCancelConfirm ? (
                          <div className="my-reg-confirm-box" style={{ marginTop: '0.5rem' }}>
                            <div className="confirm-box-content">
                              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">⚠</span>
                              <div>
                                <strong>Cancel Registration?</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
                                  Are you sure? Backend policies prevent re-registering once cancelled.
                                </p>
                              </div>
                            </div>
                            <div className="confirm-box-actions">
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={isCancelling}
                              >
                                Keep Ticket
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleCancelRegistration}
                                disabled={isCancelling}
                              >
                                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '0.5rem', borderColor: 'var(--border)' }}
                            onClick={() => setShowCancelConfirm(true)}
                          >
                            Cancel My Registration
                          </button>
                        )}
                      </div>
                    )}

                  {userRegistration.status === 'CANCELLED' && (
                    <p className="cta-notice" style={{ color: 'var(--accent-hover)' }}>
                      Your registration was cancelled. Platform policy does not allow re-registering for the same event.
                    </p>
                  )}

                  {userRegistration.status === 'REJECTED' && (
                    <p className="cta-notice" style={{ color: '#ef4444' }}>
                      Your volunteer application was not accepted for this event.
                    </p>
                  )}

                  <Link
                    to="/my-registrations"
                    className="btn btn-secondary"
                    style={{ textAlign: 'center', width: '100%', marginTop: '0.25rem' }}
                  >
                    View in My Registrations &rarr;
                  </Link>
                </div>
              ) : (
                /* Case 2: User Has NOT Registered Yet */
                <div className="cta-action-group">
                  {!isEventOpenForRegistration && (
                    <div className="alert alert-warning" style={{ margin: 0 }}>
                      <span className="alert-icon" aria-hidden="true">ℹ</span>
                      <span>
                        {event?.status === 'PENDING'
                          ? 'Registration is unavailable. This event is pending administrator approval.'
                          : event?.status === 'COMPLETED'
                          ? 'Registration is closed. This event has ended.'
                          : event?.status === 'CANCELLED'
                          ? 'Registration is unavailable. This event has been cancelled.'
                          : `Registration is unavailable. Event status is ${event?.status || 'not open'}.`}
                      </span>
                    </div>
                  )}

                  {isEventOpenForRegistration && isDeadlinePassed && (
                    <div className="alert alert-error" style={{ margin: 0 }}>
                      <span className="alert-icon" aria-hidden="true">⚠</span>
                      <span>The registration deadline for this event has passed.</span>
                    </div>
                  )}

                  {/* Participant Registration Option */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary btn-large"
                      style={{ width: '100%' }}
                      onClick={() => handleRegister('PARTICIPANT')}
                      disabled={
                        isSubmitting ||
                        !isEventOpenForRegistration ||
                        isDeadlinePassed ||
                        isParticipantCapacityFull
                      }
                    >
                      {isSubmitting
                        ? 'Submitting Registration...'
                        : isParticipantCapacityFull
                        ? 'Participant Capacity Full'
                        : 'Register as Participant'}
                    </button>
                    {isParticipantCapacityFull && (
                      <p className="cta-notice" style={{ color: '#ef4444', marginTop: '0.3rem' }}>
                        All {event.capacity} attendee tickets have been reserved.
                      </p>
                    )}
                  </div>

                  {/* Volunteer Application Option */}
                  {volunteerReq ? (
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-large"
                        style={{ width: '100%' }}
                        onClick={() => handleRegister('VOLUNTEER')}
                        disabled={
                          isSubmitting ||
                          !isEventOpenForRegistration ||
                          isDeadlinePassed ||
                          isVolunteerCapacityFull
                        }
                      >
                        {isSubmitting
                          ? 'Submitting Application...'
                          : isVolunteerCapacityFull
                          ? 'Volunteer Positions Filled'
                          : 'Apply as Volunteer 🤝'}
                      </button>
                      {isVolunteerCapacityFull && (
                        <p className="cta-notice" style={{ color: '#ef4444', marginTop: '0.3rem' }}>
                          All {volunteerReq.requiredCount} volunteer positions are currently filled.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="cta-notice">
                      Volunteer roles are not configured for this event.
                    </p>
                  )}

                  {!isAuthenticated && (
                    <p className="cta-notice">
                      You will be asked to log in before completing your registration.
                    </p>
                  )}
                </div>
              )}

              {/* AI Assistant Quick Inquiries */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <Link
                  to={`/assistant?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem' }}
                >
                  <span aria-hidden="true">✨</span> Ask AI About This Event
                </Link>
                <p className="cta-notice" style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
                  Get answers on rules, eligibility &amp; FAQs grounded in event documents.
                </p>
              </div>
            </aside>
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}
