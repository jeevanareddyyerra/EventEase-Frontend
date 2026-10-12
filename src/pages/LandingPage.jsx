import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  Zap,
  Bot,
  Award,
  AlertCircle,
  CheckCircle2,
  MapPin,
  UsersRound,
  Search,
  Ticket,
  FileText,
  ShieldCheck,
} from 'lucide-react'
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
              {location.state?.unauthorized ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            </span>
            <span>{flashMessage}</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="badge badge-accent">Enterprise &amp; Campus Event Platform</span>
          </div>
          <h1 className="hero-title">Discover Events. Seamless Experiences.</h1>
          <p className="hero-description">
            Plan, register, and coordinate campus and corporate events with automated registration,
            volunteer management, and verifiable completion certificates.
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
              <span className="highlight-icon" aria-hidden="true">
                <Zap size={16} />
              </span>
              <span>Instant Registration</span>
            </div>
            <div className="hero-highlight-item">
              <span className="highlight-icon" aria-hidden="true">
                <Bot size={16} />
              </span>
              <span>Grounded AI Assistant</span>
            </div>
            <div className="hero-highlight-item">
              <span className="highlight-icon" aria-hidden="true">
                <Award size={16} />
              </span>
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
              <div className="featured-auth-icon" aria-hidden="true">
                <CalendarDays size={28} className="featured-auth-icon-svg" />
              </div>
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
              <span className="alert-icon" aria-hidden="true">
                <AlertCircle size={16} />
              </span>
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
              <CalendarDays size={36} className="empty-icon-svg" aria-hidden="true" />
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
                          <span className="event-meta-icon" aria-hidden="true">
                            <CalendarDays size={14} className="inline-icon" />
                          </span>
                          <span>{formatDate(event.date)}</span>
                          {(event.startTime || event.endTime) && (
                            <span className="event-meta-time">
                              • {formatTimeRange(event.startTime, event.endTime)}
                            </span>
                          )}
                        </div>

                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">
                            <MapPin size={14} className="inline-icon" />
                          </span>
                          <span>{event.venue || 'Venue to be announced'}</span>
                        </div>

                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">
                            <UsersRound size={14} className="inline-icon" />
                          </span>
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
              <div className="step-icon" aria-hidden="true">
                <Search size={22} className="step-icon-svg" />
              </div>
              <h3 className="step-title">Discover</h3>
              <p className="step-desc">
                Browse diverse events, from technical hackathons and academic workshops to cultural
                festivals and sports tournaments with real-time venue and schedule details.
              </p>
            </div>

            <div className="step-card status-card">
              <div className="step-number">02</div>
              <div className="step-icon" aria-hidden="true">
                <Ticket size={22} className="step-icon-svg" />
              </div>
              <h3 className="step-title">Register</h3>
              <p className="step-desc">
                Secure your spot in seconds with one-click registration, instant ticket confirmation,
                and real-time capacity tracking across all campus activities.
              </p>
            </div>

            <div className="step-card status-card">
              <div className="step-number">03</div>
              <div className="step-icon" aria-hidden="true">
                <Award size={22} className="step-icon-svg" />
              </div>
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
              <span className="badge badge-accent">AI-Powered Event Assistant</span>
            </div>
            <h2 className="ai-showcase-heading">Meet the EventEase AI Assistant</h2>
            <p className="ai-showcase-text">
              Have questions about schedules, speaker bios, dress codes, or registration prerequisites?
              Our AI Assistant answers instantly based on official event schedules and guidelines.
            </p>

            <div className="ai-features-grid">
              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">
                  <FileText size={18} className="ai-feature-icon-svg" />
                </span>
                <div>
                  <strong>Contextual Document Search</strong>
                  <p>Smart search understands your questions and finds relevant details across event guides.</p>
                </div>
              </div>

              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">
                  <CheckCircle2 size={18} className="ai-feature-icon-svg" />
                </span>
                <div>
                  <strong>Direct Evidence Citations</strong>
                  <p>Every answer includes verifiable citations linking to specific official documents and agendas.</p>
                </div>
              </div>

              <div className="ai-feature-pill">
                <span className="ai-feature-icon" aria-hidden="true">
                  <ShieldCheck size={18} className="ai-feature-icon-svg" />
                </span>
                <div>
                  <strong>Verified Accuracy</strong>
                  <p>Answers are grounded exclusively in official event materials so you receive dependable information.</p>
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
