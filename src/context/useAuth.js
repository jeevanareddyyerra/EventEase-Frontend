import { useContext } from 'react'
import { AuthContext } from './auth-context.js'

/**
 * Custom hook to access authentication context.
 * Throws an error if used outside an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
