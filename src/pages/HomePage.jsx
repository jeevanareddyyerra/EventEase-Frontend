import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  Bot,
  Award,
  UsersRound,
  CheckCircle2,
  HeartHandshake,
  BarChart3,
  ShieldCheck,
  UserCheck,
  Clock3,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import { formatFriendlyRole } from '../utils/formatters'

const CARD_ICONS = {
  'browse-events': CalendarDays,
  'my-registrations': ClipboardList,
  'ai-assistant': Bot,
  'my-certificates': Award,
  'manage-events': CalendarDays,
  'registrations': UsersRound,
  'attendance': CheckCircle2,
  'volunteer-applications': HeartHandshake,
  'platform-overview': BarChart3,
  'user-management': UserCheck,
  'event-approvals': ShieldCheck,
}

const CARD_LINKS = {
  'browse-events': '/events',
  'my-registrations': '/my-registrations',
  'ai-assistant': '/assistant',
  'my-certificates': '/my-registrations',
  'manage-events': '/organizer/dashboard',
  'registrations': '/organizer/dashboard',
  'attendance': '/organizer/dashboard',
  'volunteer-applications': '/organizer/dashboard',
  'platform-overview': '/admin/dashboard',
  'user-management': '/admin/dashboard',
  'event-approvals': '/admin/dashboard',
}

/**
 * Role-specific preview card definitions.
 * Serves as the starting point for authenticated users with role-aware previews.
 */
const ROLE_CARDS = {
  USER: [
    {
      id: 'browse-events',
      title: 'Browse Events',
      description: 'Explore upcoming campus and corporate events, hackathons, and workshops.',
      actionLabel: 'Browse Events',
      badge: 'Participant',
    },
    {
      id: 'my-registrations',
      title: 'My Registrations',
      description: 'View active registrations, track admission status, and manage ticket reservations.',
      actionLabel: 'My Registrations',
      badge: 'Participant',
    },
    {
      id: 'ai-assistant',
      title: 'AI Event Assistant',
      description: 'Ask questions about event rules, eligibility, venue, and schedules grounded in event documents.',
      actionLabel: 'Ask AI Assistant',
      badge: 'Assistant',
    },
    {
      id: 'my-certificates',
      title: 'My Certificates',
      description: 'Access verified certificates of attendance and event completion credentials.',
      actionLabel: 'My Certificates',
      badge: 'Participant',
    },
  ],
  ORGANIZER: [
    {
      id: 'manage-events',
      title: 'Manage Events',
      description: 'Create, edit, publish, and monitor your organized events and schedules.',
      actionLabel: 'Manage Events',
      badge: 'Organizer',
    },
    {
      id: 'registrations',
      title: 'Registrations',
      description: 'Track attendee enrollment, review participant details, and release capacities.',
      actionLabel: 'Review Registrations',
      badge: 'Organizer',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Manage real-time check-ins and verify attended participants for certificate issue.',
      actionLabel: 'Mark Attendance',
      badge: 'Organizer',
    },
    {
      id: 'volunteer-applications',
      title: 'Volunteer Applications',
      description: 'Review applicant submissions, assign volunteer roles, and accept/reject candidates.',
      actionLabel: 'Review Volunteers',
      badge: 'Organizer',
    },
  ],
  ADMIN: [
    {
      id: 'platform-overview',
      title: 'Platform Overview',
      description: 'Monitor platform health, event throughput, active attendees, and global statistics.',
      actionLabel: 'Platform Metrics',
      badge: 'Admin Only',
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Oversee registered accounts, audit user permissions, and adjust role assignments.',
      actionLabel: 'Manage Users',
      badge: 'Admin Only',
    },
    {
      id: 'event-approvals',
      title: 'Event Approvals',
      description: 'Audit organizer-submitted event proposals and approve or decline public listing.',
      actionLabel: 'Review Approvals',
      badge: 'Admin Only',
    },
  ],
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: { message: 'You have been successfully logged out.' },
    })
  }

  // Normalize user role, fallback to USER
  const userRole = (user?.role ? String(user.role) : 'USER').toUpperCase()
  const previewCards = ROLE_CARDS[userRole] || ROLE_CARDS.USER

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {/* Organizer Application Status Banner */}
        {user?.organizerStatus === 'PENDING' && (
          <div
            className="alert alert-warning"
            role="status"
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Clock3 size={20} className="inline-icon" aria-hidden="true" style={{ marginTop: '0.15rem', color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Organizer Application Under Review
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'inherit' }}>
                  Your request for an Event Organizer account has been submitted and is currently awaiting administrator review. In the meantime, you have full access to explore events, register, and participate.
                </span>
              </div>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
              Pending Review
            </span>
          </div>
        )}

        {user?.organizerStatus === 'REJECTED' && (
          <div
            className="alert alert-error"
            role="status"
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }} aria-hidden="true">
                ℹ️
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  Organizer Request Status
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'inherit' }}>
                  Your organizer application was not approved at this time. Your account remains active with standard participant access.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Welcome Card */}
        <section className="home-welcome-card">
          <div className="home-welcome-info">
            <h1 className="home-welcome-title">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <div className="home-welcome-meta">
              <span>
                <strong>Email:</strong> {user?.email || 'N/A'}
              </span>
              <span>•</span>
              <span>
                <strong>Role:</strong>{' '}
                <span className="badge badge-role">{formatFriendlyRole(user?.role)}</span>
              </span>
              {user?.organizerStatus === 'PENDING' && (
                <>
                  <span>•</span>
                  <span className="badge badge-warning">Organizer Pending</span>
                </>
              )}
            </div>
          </div>

          <div className="home-welcome-actions">
            {userRole === 'ORGANIZER' && (
              <Link to="/organizer/dashboard" className="btn btn-primary">
                Organizer Dashboard
              </Link>
            )}
            {userRole === 'ADMIN' && (
              <Link to="/admin/dashboard" className="btn btn-primary">
                Admin Dashboard
              </Link>
            )}
            <Link to="/events" className={userRole === 'USER' ? 'btn btn-primary' : 'btn btn-secondary'}>
              Explore Events
            </Link>
            <Link to="/profile" className="btn btn-secondary">
              View Profile
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
        </section>

        {/* Role-Specific Dashboard Previews */}
        <section className="preview-cards-section">
          <div className="section-header">
            <h2 className="section-title">
              {userRole === 'ADMIN'
                ? 'Administrator Controls'
                : userRole === 'ORGANIZER'
                ? 'Organizer Workspace'
                : 'Participant Workspace'}
            </h2>
            <p className="section-subtitle">
              Workspace features and tools for <strong>{formatFriendlyRole(user?.role)}s</strong>
            </p>
          </div>

          <div className="cards-grid">
            {previewCards.map((card) => {
              const IconComponent = CARD_ICONS[card.id] || CalendarDays
              const targetUrl = CARD_LINKS[card.id] || '/home'

              return (
                <div key={card.id} className="preview-card">
                  <div>
                    <div className="preview-card-header">
                      <span className="preview-card-icon" aria-hidden="true">
                        <IconComponent size={24} />
                      </span>
                      <span className="badge badge-accent">{card.badge}</span>
                    </div>
                    <h3 className="preview-card-title">{card.title}</h3>
                    <p className="preview-card-desc">{card.description}</p>
                  </div>

                  <Link
                    to={targetUrl}
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%', marginTop: 'auto' }}
                  >
                    {card.actionLabel} &rarr;
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        {/* Welcome & Discovery Callout */}
        <section className="connection-card">
          <div className="connection-header">
            <div>
              <span className="connection-title">Welcome to EventEase</span>
              <p className="hero-description" style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
                Discover upcoming hackathons, tech symposiums, workshops, and student community meetups.
              </p>
            </div>
            <Link to="/events" className="btn btn-primary">
              Explore Upcoming Events &rarr;
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
