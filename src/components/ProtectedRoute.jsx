import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context'

/**
 * Reusable route guard requiring user authentication.
 * - Redirects unauthenticated users to `/login` with `state: { from: location }`
 *   to preserve the requested URL for post-login return.
 * - Optionally checks `allowedRoles` if specified, redirecting unauthorized users.
 * - Supports nested route outlets (<Outlet />) or wrapper children (<ProtectedRoute><Component /></ProtectedRoute>).
 *
 * @param {Object} props
 * @param {string[]|string} [props.allowedRoles] - Optional roles required to access route
 * @param {string} [props.redirectTo='/'] - Safe redirection target if role check fails
 * @param {React.ReactNode} [props.children] - Child elements to render when authorized
 */
export default function ProtectedRoute({
  allowedRoles,
  redirectTo = '/',
  children,
}) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="auth-loading-screen" role="status">
        <span className="auth-spinner" aria-hidden="true"></span>
        <p>Loading session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve requested location for seamless redirection after authentication
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    const userRole = user?.role ? String(user.role).toUpperCase() : ''
    const hasPermission = roles.some((r) => String(r).toUpperCase() === userRole)

    if (!hasPermission) {
      return (
        <Navigate
          to={redirectTo}
          replace
          state={{
            unauthorized: true,
            message: 'You do not have permission to access that page.',
          }}
        />
      )
    }
  }

  return children ? children : <Outlet />
}
