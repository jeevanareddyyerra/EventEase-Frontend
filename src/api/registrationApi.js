import apiClient from './client.js'

/**
 * EventEase Registration API module.
 * Communicates with Spring Boot RegistrationController endpoints under /api/registrations.
 */

/**
 * Register the user for an event as a PARTICIPANT or VOLUNTEER.
 *
 * @param {Object} data
 * @param {number} data.userId
 * @param {number} data.eventId
 * @param {'PARTICIPANT' | 'VOLUNTEER'} data.type
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createRegistration = ({ userId, eventId, type }) => {
  return apiClient.post('/registrations', {
    userId,
    eventId,
    type,
  })
}

/**
 * Retrieve all registrations belonging to a specific user.
 *
 * @param {number|string} userId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getUserRegistrations = (userId) => {
  return apiClient.get(`/registrations/user/${userId}`)
}

/**
 * Retrieve a single registration by its ID.
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getRegistrationById = (id) => {
  return apiClient.get(`/registrations/${id}`)
}

/**
 * Retrieve registrations for a specific event (organizers/admins) with optional type and status filters.
 *
 * @param {number|string} eventId
 * @param {Object} [params]
 * @param {string} [params.type] - RegistrationType (e.g., 'PARTICIPANT', 'VOLUNTEER')
 * @param {string} [params.status] - RegistrationStatus (e.g., 'REGISTERED', 'ACCEPTED', 'CANCELLED', 'REJECTED')
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getRegistrationsByEvent = (eventId, params = {}) => {
  const cleanParams = {}
  if (params.type && params.type !== 'ALL') cleanParams.type = params.type
  if (params.status && params.status !== 'ALL') cleanParams.status = params.status
  return apiClient.get(`/registrations/event/${eventId}`, { params: cleanParams })
}

/**
 * Retrieve registration metrics summary for a specific event (organizers/admins).
 *
 * @param {number|string} eventId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getEventRegistrationSummary = (eventId) => {
  return apiClient.get(`/registrations/event/${eventId}/summary`)
}

/**
 * Update volunteer registration status (organizers/admins).
 *
 * @param {number|string} id - Registration ID
 * @param {string} status - Target status ('ACCEPTED' or 'REJECTED')
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateVolunteerStatus = (id, status) => {
  return apiClient.patch(`/registrations/${id}/volunteer-status`, { status })
}

/**
 * Cancel a registration by ID.
 * Allowed for users cancelling their own registration, organizers for their events, or admins.
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const cancelRegistration = (id) => {
  return apiClient.patch(`/registrations/${id}/cancel`)
}

/**
 * Fetch total participant registrations count for an event.
 *
 * @param {number|string} eventId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getParticipantCount = (eventId) => {
  return apiClient.get(`/registrations/event/${eventId}/participant-count`)
}

/**
 * Fetch total volunteer registrations count for an event.
 *
 * @param {number|string} eventId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getVolunteerCount = (eventId) => {
  return apiClient.get(`/registrations/event/${eventId}/volunteer-count`)
}

export const registrationApi = {
  createRegistration,
  getUserRegistrations,
  getRegistrationById,
  getRegistrationsByEvent,
  getEventRegistrationSummary,
  updateVolunteerStatus,
  cancelRegistration,
  getParticipantCount,
  getVolunteerCount,
}

export default registrationApi
