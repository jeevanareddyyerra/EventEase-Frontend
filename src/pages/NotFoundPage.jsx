import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="connection-card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem', maxWidth: '520px', width: '100%' }}>
          <FileQuestion size={48} className="empty-icon-svg" aria-hidden="true" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <span className="badge badge-error" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            404 Error
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--text-h)' }}>
            Page Not Found
          </h1>
          <p className="hero-description" style={{ margin: '0 auto 1.75rem', fontSize: '0.95rem' }}>
            The page you are looking for doesn&apos;t exist, was removed, or the link may be broken.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={isAuthenticated ? '/home' : '/'} className="btn btn-primary">
              Return Home &rarr;
            </Link>
            <Link to="/events" className="btn btn-secondary">
              Discover Events
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
