import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../context'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  const { isAuthenticated } = useAuth()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-columns">
          {/* Brand Column */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand">
              <span className="brand-logo" aria-hidden="true">
                <CalendarDays size={20} className="brand-icon-svg" />
              </span>
              <span className="brand-name">EventEase</span>
            </div>
            <p className="footer-tagline">
              Campus and corporate event management platform. Discover upcoming events,
              streamline registrations, empower organizers, and celebrate experiences.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <Link to={isAuthenticated ? '/home' : '/'} className="footer-link">Home</Link>
              </li>
              <li>
                <Link to="/events" className="footer-link">Explore Events</Link>
              </li>
              <li>
                <Link to="/assistant" className="footer-link">AI Assistant</Link>
              </li>
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/my-registrations" className="footer-link">My Registrations</Link>
                  </li>
                  <li>
                    <Link to="/profile" className="footer-link">My Profile</Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="footer-link">Sign In</Link>
                  </li>
                  <li>
                    <Link to="/signup" className="footer-link">Create Account</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {CURRENT_YEAR} EventEase. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <Link to="/events" className="footer-sublink">Explore Events</Link>
            <span className="footer-bullet" aria-hidden="true">&bull;</span>
            <Link to="/assistant" className="footer-sublink">AI Assistant</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

