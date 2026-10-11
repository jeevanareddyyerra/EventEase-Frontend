import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: { message: 'You have been successfully logged out.' },
    })
  }

  return (
    <header className="site-header">
      <Link to={isAuthenticated ? '/home' : '/'} className="header-brand-link">
        <div className="header-brand">
          <span className="brand-logo" aria-hidden="true">🎪</span>
          <div className="brand-titles">
            <span className="brand-name">EventEase</span>
            <span className="brand-tagline">Event &amp; Volunteer Coordination</span>
          </div>
        </div>
      </Link>

      <nav className="header-nav">
        {isAuthenticated ? (
          <>
            <Link
              to="/home"
              className={`nav-link ${location.pathname === '/home' ? 'nav-link-active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/events"
              className={`nav-link ${location.pathname.startsWith('/events') ? 'nav-link-active' : ''}`}
            >
              Explore Events
            </Link>
            <Link
              to="/assistant"
              className={`nav-link ${location.pathname.startsWith('/assistant') ? 'nav-link-active' : ''}`}
            >
              AI Assistant
            </Link>
            {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
              <Link
                to="/organizer/dashboard"
                className={`nav-link ${location.pathname.startsWith('/organizer') ? 'nav-link-active' : ''}`}
              >
                Organizer
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                className={`nav-link ${location.pathname.startsWith('/admin') ? 'nav-link-active' : ''}`}
              >
                Admin
              </Link>
            )}
            <Link
              to="/my-registrations"
              className={`nav-link ${location.pathname.startsWith('/my-registrations') ? 'nav-link-active' : ''}`}
            >
              My Registrations
            </Link>
            <Link
              to="/profile"
              className={`nav-link ${location.pathname === '/profile' ? 'nav-link-active' : ''}`}
            >
              Profile
            </Link>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}
            >
              Public Site
            </Link>
            <Link
              to="/profile"
              className="nav-user"
              title={`View Profile (${user?.email || ''})`}
              style={{ textDecoration: 'none' }}
            >
              <span className="nav-user-greeting">Hi, {user?.name || 'User'}</span>
              {user?.role && (
                <span className="badge badge-role">{user.role}</span>
              )}
            </Link>
            <button
              type="button"
              className="btn-logout"
              onClick={handleLogout}
              aria-label="Log Out"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/events"
              className={`nav-link ${location.pathname.startsWith('/events') ? 'nav-link-active' : ''}`}
            >
              Explore Events
            </Link>
            <Link
              to="/assistant"
              className={`nav-link ${location.pathname.startsWith('/assistant') ? 'nav-link-active' : ''}`}
            >
              AI Assistant
            </Link>
            <Link
              to="/login"
              className={`nav-link ${location.pathname === '/login' ? 'nav-link-active' : ''}`}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className={`nav-btn ${location.pathname === '/signup' ? 'nav-btn-active' : ''}`}
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
