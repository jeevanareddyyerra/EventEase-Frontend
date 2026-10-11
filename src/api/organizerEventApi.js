import apiClient from './client.js'

/**
 * EventEase Organizer Event API module.
 * Provides functions for event creation, editing, status transitions,
 * organizer-scoped listing, and volunteer requirement management.
 */

/**
 * Retrieve all events organized by a specific organizer ID.
 *
 * @param {number|string} organizerId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getEventsByOrganizer = (organizerId) => {
  return apiClient.get(`/events/organizer/${organizerId}`)
}

/**
 * Create a new event.
 * Newly created events automatically default to PENDING status in the backend.
 *
 * @param {Object} eventData
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createEvent = (eventData) => {
  return apiClient.post('/events', eventData)
}

/**
 * Update an existing event.
 * Note: Status changes are prohibited through this endpoint and must use updateEventStatus.
 *
 * @param {number|string} id
 * @param {Object} eventData
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateEvent = (id, eventData) => {
  return apiClient.put(`/events/${id}`, eventData)
}

/**
 * Update the status of an event according to backend ALLOWED_TRANSITIONS rules.
 *
 * @param {number|string} id
 * @param {string} status - Target status (e.g., 'PUBLISHED', 'COMPLETED', 'CANCELLED')
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateEventStatus = (id, status) => {
  return apiClient.patch(`/events/${id}/status`, { status })
}

/**
 * Delete an event by ID.
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteEvent = (id) => {
  return apiClient.delete(`/events/${id}`)
}

/**
 * Create a volunteer requirement for an event.
 *
 * @param {Object} reqData
 * @param {number} reqData.eventId
 * @param {number} reqData.requiredCount
 * @param {string} [reqData.description]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const createVolunteerRequirement = (reqData) => {
  return apiClient.post('/volunteer-requirements', reqData)
}

/**
 * Update an existing volunteer requirement.
 *
 * @param {number|string} id
 * @param {Object} reqData
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateVolunteerRequirement = (id, reqData) => {
  return apiClient.put(`/volunteer-requirements/${id}`, reqData)
}

/**
 * Delete a volunteer requirement by ID.
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteVolunteerRequirement = (id) => {
  return apiClient.delete(`/volunteer-requirements/${id}`)
}

/**
 * Upload an image file for an event poster.
 * Endpoint: POST /api/events/upload-image
 *
 * @param {File|Blob} file
 * @returns {Promise<import('axios').AxiosResponse<{ imageUrl: string, publicId: string }>>}
 */
export const uploadEventImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/events/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * Delete an event poster image by its publicId.
 * Endpoint: DELETE /api/events/images
 *
 * @param {string} publicId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteEventImage = (publicId) => {
  return apiClient.delete('/events/images', {
    params: { publicId },
  })
}

export const organizerEventApi = {
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  createVolunteerRequirement,
  updateVolunteerRequirement,
  deleteVolunteerRequirement,
  uploadEventImage,
  deleteEventImage,
}

export default organizerEventApi
