import apiClient from './client.js'

/**
 * EventEase Admin API module.
 * Provides functions for platform governance, metrics summary,
 * event approvals/rejections, and user account administration.
 *
 * NOTE: All endpoints used by this module require `ROLE_ADMIN` authorization.
 */

/**
 * Fetch platform-level aggregation metrics (ADMIN only).
 * Endpoint: GET /api/admin/summary
 *
 * @returns {Promise<import('axios').AxiosResponse<{
 *   totalUsers: number,
 *   totalOrganizers: number,
 *   totalParticipants: number,
 *   totalAdmins: number,
 *   totalEvents: number,
 *   publishedEvents: number,
 *   pendingEvents: number,
 *   approvedEvents: number,
 *   completedEvents: number,
 *   cancelledEvents: number,
 *   totalRegistrations: number
 * }>>}
 */
export const getPlatformSummary = () => {
  return apiClient.get('/admin/summary')
}

/**
 * Fetch events awaiting admin review/approval (PENDING status).
 * Endpoint: GET /api/events?status=PENDING
 *
 * @param {Object} [params={}]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getPendingEvents = (params = {}) => {
  const cleanParams = { status: 'PENDING' }
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v
      }
    })
  }
  return apiClient.get('/events', { params: cleanParams })
}

/**
 * Approve a pending event proposal (transitions PENDING -> APPROVED).
 * Endpoint: PATCH /api/events/{id}/status
 *
 * @param {number|string} id - Event ID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const approveEvent = (id) => {
  return apiClient.patch(`/events/${id}/status`, { status: 'APPROVED' })
}

/**
 * Reject / cancel an event proposal (transitions to CANCELLED).
 * Endpoint: PATCH /api/events/{id}/status
 *
 * @param {number|string} id - Event ID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const rejectEvent = (id) => {
  return apiClient.patch(`/events/${id}/status`, { status: 'CANCELLED' })
}

/**
 * Fetch all platform users (ADMIN only).
 * Endpoint: GET /api/users
 *
 * @returns {Promise<import('axios').AxiosResponse<Array<{
 *   id: number,
 *   name: string,
 *   email: string,
 *   phone: string,
 *   role: 'USER' | 'ORGANIZER' | 'ADMIN',
 *   createdAt: string
 * }>>>}
 */
export const getAllUsers = () => {
  return apiClient.get('/users')
}

/**
 * Delete a user by ID (ADMIN only).
 * Endpoint: DELETE /api/users/{id}
 *
 * @param {number|string} id - User ID
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteUser = (id) => {
  return apiClient.delete(`/users/${id}`)
}

/**
 * Update user details by ID (ADMIN only).
 * Endpoint: PUT /api/users/{id}
 *
 * @param {number|string} id - User ID
 * @param {Object} userData - User request payload
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateUser = (id, userData) => {
  return apiClient.put(`/users/${id}`, userData)
}

export const adminApi = {
  getPlatformSummary,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getAllUsers,
  deleteUser,
  updateUser,
}

export default adminApi
