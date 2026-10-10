import apiClient from './client.js'

/**
 * EventEase User API module.
 *
 * NOTE ON BACKEND CAPABILITIES & SECURITY CONSTRAINTS:
 * In the Spring Boot backend (`SecurityConfig.java`), all `/api/users/**` endpoints
 * are strictly restricted to `ROLE_ADMIN` (`.requestMatchers("/api/users/**").hasRole("ADMIN")`).
 *
 * The backend does NOT currently offer a self-service `/api/users/me` or self-profile
 * update endpoint for standard `ROLE_USER` or `ROLE_ORGANIZER` accounts.
 * Attempting to call `/api/users/{id}` as a non-admin results in HTTP 403 Forbidden.
 *
 * For non-admin accounts, the authenticated user profile is provided at login
 * and maintained in client session state. For `ROLE_ADMIN` accounts, the admin
 * endpoints below are fully functional.
 */

/**
 * Fetch user details by ID (ADMIN only).
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getUserById = (id) => {
  return apiClient.get(`/users/${id}`)
}

/**
 * Fetch all users (ADMIN only).
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getAllUsers = () => {
  return apiClient.get('/users')
}

export const updateUser = (id, userData) => {
  return apiClient.put(`/users/${id}`, userData)
}

/**
 * Delete user by ID (ADMIN only).
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteUser = (id) => {
  return apiClient.delete(`/users/${id}`)
}

export const userApi = {
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
}

export default userApi
