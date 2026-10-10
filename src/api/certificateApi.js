import apiClient from './client.js'

/**
 * EventEase Certificate API module.
 * Communicates with Spring Boot CertificateController endpoints under /api/certificates.
 */

/**
 * Issue a certificate for a registration (creates a certificate record via POST).
 * Endpoint: POST /api/certificates
 *
 * @param {Object} data
 * @param {number} data.registrationId - Registration ID (must be attended and event COMPLETED)
 * @param {string} [data.certificateUrl] - Optional URL for the certificate
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const issueCertificate = ({ registrationId, certificateUrl }) => {
  const payload = { registrationId }
  if (certificateUrl) {
    payload.certificateUrl = certificateUrl
  }
  return apiClient.post('/certificates', payload)
}

/**
 * Retrieve certificate record for a specific registration.
 * Endpoint: GET /api/certificates/registration/{registrationId}
 *
 * @param {number|string} registrationId
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getCertificateByRegistration = (registrationId) => {
  return apiClient.get(`/certificates/registration/${registrationId}`)
}

/**
 * Retrieve certificate record by its ID.
 * Endpoint: GET /api/certificates/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getCertificateById = (id) => {
  return apiClient.get(`/certificates/${id}`)
}

/**
 * Retrieve all certificates.
 * Endpoint: GET /api/certificates
 *
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const getAllCertificates = () => {
  return apiClient.get('/certificates')
}

/**
 * Update an existing certificate record (via PUT).
 * Endpoint: PUT /api/certificates/{id}
 *
 * @param {number|string} id - Certificate ID
 * @param {Object} data
 * @param {number} [data.registrationId]
 * @param {string} [data.certificateUrl]
 * @param {string} [data.status]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateCertificate = (id, data) => {
  return apiClient.put(`/certificates/${id}`, data)
}

/**
 * Delete a certificate record (via DELETE).
 * Endpoint: DELETE /api/certificates/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const deleteCertificate = (id) => {
  return apiClient.delete(`/certificates/${id}`)
}

export const certificateApi = {
  issueCertificate,
  getCertificateByRegistration,
  getCertificateById,
  getAllCertificates,
  updateCertificate,
  deleteCertificate,
}

export default certificateApi
