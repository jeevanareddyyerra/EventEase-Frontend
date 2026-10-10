import { apiClient } from './client.js'

/**
 * Fetch events from the backend with optional search, filter, pagination, and sorting criteria.
 * Endpoint: GET /api/events
 *
 * @param {Object} [params={}] - Optional query parameters
 * @param {string} [params.keyword] - Case-insensitive partial match across title, description, or venue
 * @param {string} [params.category] - Category exact match
 * @param {string} [params.status] - EventStatus enum value
 * @param {boolean} [params.upcoming] - If true, filters date >= today
 * @param {number} [params.page=0] - 0-indexed page number
 * @param {number} [params.size=10] - Number of items per page (max 50)
 * @param {string} [params.sortBy='date'] - Sortable field name (date, title, category, capacity, createdAt, status, venue)
 * @param {'asc'|'desc'} [params.direction='asc'] - Sort order direction
 * @returns {Promise<import('axios').AxiosResponse<Object>>}
 */
export const getAllEvents = async (params = {}) => {
  const cleanParams = {}
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
        cleanParams[key] = value
      }
    })
  }
  return apiClient.get('/events', { params: cleanParams })
}

/**
 * Fetch a single event by its ID.
 * Endpoint: GET /api/events/{id}
 *
 * @param {number|string} id - Unique event identifier
 * @returns {Promise<import('axios').AxiosResponse<Object>>}
 */
export const getEventById = async (id) => {
  return apiClient.get(`/events/${id}`)
}

/**
 * Fetch events filtered by lifecycle status (e.g. PUBLISHED, APPROVED).
 * Endpoint: GET /api/events/status/{status}
 *
 * @param {string} status - EventStatus enum value
 * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>}
 */
export const getEventsByStatus = async (status) => {
  return apiClient.get(`/events/status/${status}`)
}

/**
 * Fetch all volunteer requirements across events.
 * Endpoint: GET /api/volunteer-requirements
 *
 * @returns {Promise<import('axios').AxiosResponse<Array<Object>>>}
 */
export const getVolunteerRequirements = async () => {
  return apiClient.get('/volunteer-requirements')
}

export const eventApi = {
  getAllEvents,
  getEventById,
  getEventsByStatus,
  getVolunteerRequirements,
}

export default eventApi
