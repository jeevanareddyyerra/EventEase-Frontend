import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import { formatFriendlyRole } from '../utils/formatters'

/**
 * Role-specific preview card definitions.
 * Serves as the starting point for authenticated users with role-aware previews.
 */
const ROLE_CARDS = {
  USER: [
    {
      id: 'browse-events',
      title: 'Browse Events',
      icon: '🎪',
      description: 'Explore upcoming campus and corporate events, hackathons, and workshops.',
      actionLabel: 'Browse Events',
      badge: 'Participant',
    },
    {
      id: 'my-registrations',
      title: 'My Registrations',
      icon: '📋',
      description: 'View active registrations, track admission status, and manage ticket reservations.',
      actionLabel: 'My Registrations',
      badge: 'Participant',
    },
    {
      id: 'ai-assistant',
      title: 'AI Event Assistant',
      icon: '✨',
      description: 'Ask questions about event rules, eligibility, venue, and schedules grounded in event documents.',
      actionLabel: 'Ask AI Assistant',
      badge: 'Assistant',
    },
    {
      id: 'my-certificates',
      title: 'My Certificates',
      icon: '🎓',
      description: 'Access verified certificates of attendance and event completion credentials.',
      actionLabel: 'My Certificates',
      badge: 'Participant',
    },
  ],
  ORGANIZER: [
    {
      id: 'manage-events',
      title: 'Manage Events',
      icon: '📅',
      description: 'Create, edit, publish, and monitor your organized events and schedules.',
      actionLabel: 'Manage Events',
      badge: 'Organizer',
    },
    {
      id: 'registrations',
      title: 'Registrations',
      icon: '👥',
      description: 'Track attendee enrollment, review participant details, and release capacities.',
      actionLabel: 'Review Registrations',
      badge: 'Organizer',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: '✅',
      description: 'Manage real-time check-ins and verify attended participants for certificate issue.',
      actionLabel: 'Mark Attendance',
      badge: 'Organizer',
    },
    {
      id: 'volunteer-applications',
      title: 'Volunteer Applications',
      icon: '🤝',
      description: 'Review applicant submissions, assign volunteer roles, and accept/reject candidates.',
      actionLabel: 'Review Volunteers',
      badge: 'Organizer',
    },
  ],
  ADMIN: [
    {
      id: 'platform-overview',
      title: 'Platform Overview',
      icon: '📊',
      description: 'Monitor platform health, event throughput, active attendees, and global statistics.',
      actionLabel: 'Platform Metrics',
      badge: 'Admin Only',
    },
    {
      id: 'user-management',
      title: 'User Management',
      icon: '👤',
      description: 'Oversee registered accounts, audit user permissions, and adjust role assignments.',
      actionLabel: 'Manage Users',
      badge: 'Admin Only',
    },
    {
      id: 'event-approvals',
      title: 'Event Approvals',
      icon: '🛡️',
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
            </div>
          </div>

          <div className="home-welcome-actions">
            <Link to="/events" className="btn btn-primary">
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
            {previewCards.map((card) => (
              <div key={card.id} className="preview-card">
                <div>
                  <div className="preview-card-header">
                    <span className="preview-card-icon" aria-hidden="true">
                      {card.icon}
                    </span>
                    <span className="badge badge-accent">{card.badge}</span>
                  </div>
                  <h3 className="preview-card-title">{card.title}</h3>
                  <p className="preview-card-desc">{card.description}</p>
                </div>

                {card.id === 'browse-events' ? (
                  <Link
                    to="/events"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Browse Events &rarr;
                  </Link>
                ) : card.id === 'my-registrations' ? (
                  <Link
                    to="/my-registrations"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    My Registrations &rarr;
                  </Link>
                ) : card.id === 'ai-assistant' ? (
                  <Link
                    to="/assistant"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Ask AI Assistant &rarr;
                  </Link>
                ) : card.id === 'manage-events' ? (
                  <Link
                    to="/organizer/dashboard"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    Manage Events &rarr;
                  </Link>
                ) : card.id === 'my-certificates' ? (
                  <Link
                    to="/my-registrations"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', width: '100%' }}
                  >
                    My Certificates &rarr;
                  </Link>
                ) : (
                  <div className="preview-card-action">
                    <span>{card.actionLabel} (Coming Soon)</span>
                  </div>
                )}
              </div>
            ))}
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
