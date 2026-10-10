import apiClient from './client.js'

/**
 * EventEase Attendance API module.
 * Communicates with Spring Boot AttendanceController endpoints under /api/attendance.
 */

/**
 * Mark attendance for a registration (creates a new attendance record via POST).
 * Endpoint: POST /api/attendance
 *
 * @param {Object} data
 * @param {number} data.registrationId - Registration ID
 * @param {boolean} data.attended - true for PRESENT, false for ABSENT
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const markAttendance = ({ registrationId, attended }) => {
  return apiClient.post('/attendance', {
    registrationId,
    attended,
  })
}

/**
 * Update an existing attendance record (via PUT).
 * Endpoint: PUT /api/attendance/{id}
 *
 * @param {number|string} id - Attendance record ID
 * @param {Object} data
 * @param {boolean} data.attended - true for PRESENT, false for ABSENT
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateAttendance = (id, { attended }) => {
  return apiClient.put(`/attendance/${id}`, {
    attended,
  })
}

/**
 * Retrieve attendance record for a specific registration.
 * Endpoint: GET /api/attendance/registration/{registrationId}
 *
 * @param {number|string} registrationId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getAttendanceByRegistration = (registrationId) => {
  return apiClient.get(`/attendance/registration/${registrationId}`)
}

/**
 * Retrieve attendance record by its ID.
 * Endpoint: GET /api/attendance/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getAttendanceById = (id) => {
  return apiClient.get(`/attendance/${id}`)
}

/**
 * Retrieve all attendance records (admin / organizer overview).
 * Endpoint: GET /api/attendance
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getAllAttendance = () => {
  return apiClient.get('/attendance')
}

/**
 * Delete an attendance record.
 * Endpoint: DELETE /api/attendance/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteAttendance = (id) => {
  return apiClient.delete(`/attendance/${id}`)
}

export const attendanceApi = {
  markAttendance,
  updateAttendance,
  getAttendanceByRegistration,
  getAttendanceById,
  getAllAttendance,
  deleteAttendance,
}

export default attendanceApi
