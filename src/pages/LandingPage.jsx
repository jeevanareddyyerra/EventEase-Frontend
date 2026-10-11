import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { getAllEvents } from '../api'
import { useAuth } from '../context'
import { formatDate, formatTimeRange } from '../utils/formatters'

export default function LandingPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [flashMessage] = useState(() => location.state?.message || null)

  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(() => Boolean(isAuthenticated))
  const [eventsError, setEventsError] = useState(null)

  // Derived state: unauthenticated visitors are shown the sign-in preview prompt
  const isUnauthorized = !isAuthenticated

  useEffect(() => {
    let isMounted = true

    if (!isAuthenticated) {
      return
    }

    getAllEvents({ size: 6, status: 'PUBLISHED' })
      .then((response) => {
        if (!isMounted) return
        const data = Array.isArray(response.data?.content)
          ? response.data.content
          : (Array.isArray(response.data) ? response.data : [])
        setEvents(data.slice(0, 6))
      })
      .catch((err) => {
        if (!isMounted) return
        setEventsError(err.message || 'Unable to load events')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingEvents(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

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

  const handleRetryEvents = () => {
    if (!isAuthenticated) return
    setIsLoadingEvents(true)
    setEventsError(null)
    getAllEvents({ size: 6, status: 'PUBLISHED' })
      .then((response) => {
        const data = Array.isArray(response.data?.content)
          ? response.data.content
          : (Array.isArray(response.data) ? response.data : [])
        setEvents(data.slice(0, 6))
      })
      .catch((err) => {
        setEventsError(err.message || 'Unable to load events')
      })
      .finally(() => {
        setIsLoadingEvents(false)
      })
  }

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

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="badge badge-accent">Enterprise &amp; Campus Event Management</span>
          </div>
          <h1 className="hero-title">Discover Events. Create Experiences.</h1>
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
                  Explore Events &rarr;
                </Link>
                <Link to="/home" className="btn btn-secondary btn-large">
                  Workspace Home
                </Link>
              </>
            ) : (
              <>
                <Link to="/events" className="btn btn-primary btn-large">
                  Explore Events &rarr;
                </Link>
                <Link to="/signup" className="btn btn-primary btn-large">
                  Sign Up
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="hero-highlights">
            <div className="hero-highlight-item">
              <span className="highlight-icon" aria-hidden="true">⚡</span>
              <span>Instant Registration</span>
            </div>
            <div className="hero-highlight-item">
              <span className="highlight-icon" aria-hidden="true">🤖</span>
              <span>Grounded AI Assistant</span>
            </div>
            <div className="hero-highlight-item">
              <span className="highlight-icon" aria-hidden="true">📜</span>
              <span>Digital Certificates</span>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        <section className="featured-section">
          <div className="section-title-wrap">
            <h2 className="section-heading">Featured Events</h2>
            <p className="section-subheading">
              Explore upcoming gatherings, workshops, hackathons, and cultural festivals.
            </p>
          </div>

          {isLoadingEvents && (
            <div className="auth-loading-screen" role="status">
              <span className="auth-spinner" aria-hidden="true"></span>
              <p>Loading featured events...</p>
            </div>
          )}

          {!isLoadingEvents && isUnauthorized && (
            <div className="featured-auth-cta">
              <div className="featured-auth-icon" aria-hidden="true">🎪</div>
              <div className="featured-auth-content">
                <h3 className="featured-auth-title">Explore Live Campus &amp; Corporate Events</h3>
                <p className="featured-auth-desc">
                  Sign in to view published schedules, reserve your tickets, track real-time venue
                  capacity, and coordinate with organizers.
                </p>
                <div className="featured-auth-buttons">
                  <Link to="/login" className="btn btn-primary">
                    Sign In to Browse Events
                  </Link>
                  <Link to="/signup" className="btn btn-secondary">
                    Create an Account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!isLoadingEvents && !isUnauthorized && eventsError && (
            <div className="auth-alert alert-error" role="alert">
              <span className="alert-icon" aria-hidden="true">⚠</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Error loading events</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{eventsError}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetryEvents}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Retry
              </button>
            </div>
          )}

          {!isLoadingEvents && !isUnauthorized && !eventsError && events.length === 0 && (
            <div className="empty-events-card">
              <span style={{ fontSize: '2.5rem' }} aria-hidden="true">📅</span>
              <h3 style={{ margin: '0.75rem 0 0.25rem' }}>No Upcoming Events Right Now</h3>
              <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '480px' }}>
                There are currently no published events in the catalog. Check back soon for new schedules or browse our full events page.
              </p>
              <Link to="/events" className="btn btn-secondary">
                View Events Catalog
              </Link>
            </div>
          )}

          {!isLoadingEvents && !isUnauthorized && !eventsError && events.length > 0 && (
            <>
              <div className="cards-grid">
                {events.map((event) => (
                  <article key={event.id} className="preview-card event-card">
                    <div className="event-card-content">
                      <div className="preview-card-header">
                        <span className="badge badge-accent">
                          {event.category || 'General'}
                        </span>
                        <span className={`badge ${getStatusBadgeClass(event.status)}`}>
                          {event.status || 'UNKNOWN'}
                        </span>
                      </div>

                      <h3 className="preview-card-title event-title-heading">
                        <Link to={`/events/${event.id}`} className="event-title-link">
                          {event.title}
                        </Link>
                      </h3>

                      <p className="preview-card-desc event-desc-snippet">
                        {event.description
                          ? event.description.length > 120
                            ? `${event.description.substring(0, 120)}...`
                            : event.description
                          : 'No description provided.'}
                      </p>

                      <div className="event-metadata-list">
                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">📅</span>
                          <span>{formatDate(event.date)}</span>
                          {(event.startTime || event.endTime) && (
                            <span className="event-meta-time">
                              • {formatTimeRange(event.startTime, event.endTime)}
                            </span>
                          )}
                        </div>

                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">📍</span>
                          <span>{event.venue || 'Venue to be announced'}</span>
                        </div>

                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">👥</span>
                          <span>
                            {event.capacity != null ? `${event.capacity} Max Capacity` : 'Open Capacity'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="event-card-footer">
                      <Link
                        to={`/events/${event.id}`}
                        className="btn btn-primary btn-event-action"
                      >
                        View Event Details &rarr;
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <div className="featured-footer-action">
                <Link to="/events" className="btn btn-secondary btn-large">
                  Explore All Events &rarr;
                </Link>
              </div>
            </>
          )}
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="section-title-wrap">
            <h2 className="section-heading">How It Works</h2>
            <p className="section-subheading">
              A simplified three-step experience from discovery to verified participation.
            </p>
          </div>

          <div className="cards-grid">
            <div className="step-card status-card">
              <div className="step-number">01</div>
              <div className="step-icon" aria-hidden="true">🔍</div>
              <h3 className="step-title">Discover</h3>
              <p className="step-desc">
                Browse diverse events, from technical hackathons and academic workshops to cultural
                festivals and sports tournaments with real-time venue and schedule details.
              </p>
            </div>

            <div className="step-card status-card">
              <div className="step-number">02</div>
              <div className="step-icon" aria-hidden="true">🎟️</div>
              <h3 className="step-title">Register</h3>
              <p className="step-desc">
                Secure your spot in seconds with one-click registration, instant ticket confirmation,
                and real-time capacity tracking across all campus activities.
              </p>
            </div>

            <div className="step-card status-card">
              <div className="step-number">03</div>
              <div className="step-icon" aria-hidden="true">🎓</div>
              <h3 className="step-title">Participate</h3>
              <p className="step-desc">
                Check in seamlessly on event day, ask questions with the AI Assistant, and earn
                verifiable digital completion certificates for attended sessions.
              </p>
            </div>
          </div>
        </section>

        {/* AI Assistant Showcase Section */}
        <section className="ai-showcase-section">
          <div className="ai-showcase-card">
            <div className="ai-showcase-badge">
              <span className="badge badge-accent">Intelligent Retrieval-Augmented Generation</span>
            </div>
            <h2 className="ai-showcase-heading">Meet the EventEase AI Assistant</h2>
            <p className="ai-showcase-text">
              Have questions about schedules, speaker bios, dress codes, or registration prerequisites?
              Our AI Assistant answers instantly using semantic embeddings computed over official event documents.
            </p>

            <div className="ai-features-grid">
              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">🧠</span>
                <div>
                  <strong>384-Dimensional ONNX Embeddings</strong>
                  <p>Local MiniLM vector model produces grounded semantic search without sending document context externally.</p>
                </div>
              </div>

              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">📌</span>
                <div>
                  <strong>Direct Evidence Citations</strong>
                  <p>Every answer includes verifiable citations linking to specific official documents and agendas.</p>
                </div>
              </div>

              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">🛡️</span>
                <div>
                  <strong>Anti-Hallucination Guardrails</strong>
                  <p>Strict similarity thresholding guarantees that only verified event information is presented.</p>
                </div>
              </div>
            </div>

            <div className="ai-showcase-action">
              <Link to="/assistant" className="btn btn-primary btn-large">
                Ask AI Assistant &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
