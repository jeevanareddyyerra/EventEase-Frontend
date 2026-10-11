import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context'

/**
 * Reusable route guard requiring both authentication and specific role permissions.
 * - Waits for authentication initialization before checking roles or redirecting.
 * - Redirects unauthenticated users to `/login` with `state: { from: location }`.
 * - Redirects authenticated users lacking the required role to `redirectTo` (default `/`).
 *
 * @param {Object} props
 * @param {string[]|string} props.allowedRoles - Allowed role name or array of role names
 * @param {string} [props.redirectTo='/'] - Safe redirection path for unauthorized users
 * @param {React.ReactNode} [props.children] - Child elements to render when authorized
 */
export default function RoleBasedRoute({
  allowedRoles = [],
  redirectTo = '/',
  children,
}) {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  // Wait for authentication initialization rather than prematurely treating session as unauthenticated
  if (isLoading || !isInitialized) {
    return (
      <div className="auth-loading-screen" role="status">
        <span className="auth-spinner" aria-hidden="true"></span>
        <p>Loading session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Avoid redirect loops by never saving /login or /signup as 'from'
    const safeFrom = (location.pathname === '/login' || location.pathname === '/signup')
      ? '/home'
      : location

    return <Navigate to="/login" state={{ from: safeFrom }} replace />
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  const userRole = user?.role ? String(user.role).toUpperCase() : ''
  const hasPermission = roles.length === 0 || roles.some((r) => String(r).toUpperCase() === userRole)

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

  return children ? children : <Outlet />
}
