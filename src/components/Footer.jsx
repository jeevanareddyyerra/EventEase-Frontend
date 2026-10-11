import { Link } from 'react-router-dom'
import { useAuth } from '../context'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  const { isAuthenticated, user } = useAuth()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-columns">
          {/* Brand Column */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand">
              <span className="brand-logo" aria-hidden="true">🎪</span>
              <span className="brand-name">EventEase</span>
            </div>
            <p className="footer-tagline">
              Smart campus and corporate event management platform. Discover events, streamline registrations, empower organizers, and celebrate experiences.
            </p>
            <div className="footer-badges">
              <span className="badge badge-accent">Production Ready</span>
              <span className="badge badge-success">JWT Secured</span>
            </div>
          </div>

          {/* Navigation Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links">
              <li>
                <Link to="/" className="footer-link">Home</Link>
              </li>
              <li>
                <Link to="/events" className="footer-link">Explore Events</Link>
              </li>
              <li>
                <Link to="/assistant" className="footer-link">AI Assistant</Link>
              </li>
              {!isAuthenticated ? (
                <>
                  <li>
                    <Link to="/login" className="footer-link">Sign In</Link>
                  </li>
                  <li>
                    <Link to="/signup" className="footer-link">Create Account</Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/profile" className="footer-link">My Profile</Link>
                  </li>
                  <li>
                    <Link to="/home" className="footer-link">Dashboard</Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Workspaces Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Workspaces</h4>
            <ul className="footer-links">
              <li>
                <Link to="/home" className="footer-link">Participant Workspace</Link>
              </li>
              <li>
                <Link to="/my-registrations" className="footer-link">My Registrations</Link>
              </li>
              {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                <li>
                  <Link to="/organizer/dashboard" className="footer-link">Organizer Portal</Link>
                </li>
              )}
              {user?.role === 'ADMIN' && (
                <li>
                  <Link to="/admin/dashboard" className="footer-link">Admin Center</Link>
                </li>
              )}
              {!isAuthenticated && (
                <>
                  <li>
                    <Link to="/login" className="footer-link">Organizer Portal</Link>
                  </li>
                  <li>
                    <Link to="/login" className="footer-link">Admin Center</Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Platform & Technology Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-static-item">Role-Based Access Control</span>
              </li>
              <li>
                <span className="footer-static-item">384d Semantic AI Embeddings</span>
              </li>
              <li>
                <span className="footer-static-item">Automated Certificate Issuance</span>
              </li>
              <li>
                <span className="footer-static-item">Stateless RESTful Architecture</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {CURRENT_YEAR} EventEase Platform. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <Link to="/events" className="footer-sublink">Event Catalog</Link>
            <span className="footer-bullet" aria-hidden="true">&bull;</span>
            <Link to="/assistant" className="footer-sublink">AI Assistant</Link>
            <span className="footer-bullet" aria-hidden="true">&bull;</span>
            <span className="footer-sublink-muted">System Active</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
