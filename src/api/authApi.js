import { apiClient } from './client.js'

/**
 * Register a new user account with EventEase.
 *
 * @param {Object} data
 * @param {string} data.name - Full name of the user
 * @param {string} data.email - Valid email address
 * @param {string} data.password - Password (at least 6 characters)
 * @param {string} [data.phone] - Optional contact phone number
 * @returns {Promise<import('axios').AxiosResponse<{
 *   token: string,
 *   userId: number,
 *   name: string,
 *   email: string,
 *   role: string
 * }>>}
 */
export const signup = async ({ name, email, password, phone, accountType }) => {
  const payload = {
    name: name != null ? name.trim() : '',
    email: email != null ? email.trim() : '',
    password,
  }

  if (phone != null && phone.trim() !== '') {
    payload.phone = phone.trim()
  }

  if (accountType != null && accountType.trim() !== '') {
    payload.accountType = accountType.trim()
  }

  return apiClient.post('/auth/signup', payload)
}

/**
 * Authenticate an existing user with email and password.
 *
 * @param {Object} credentials
 * @param {string} credentials.email - Account email address
 * @param {string} credentials.password - Account password
 * @returns {Promise<import('axios').AxiosResponse<{
 *   token: string,
 *   userId: number,
 *   name: string,
 *   email: string,
 *   role: string
 * }>>}
 */
export const login = async ({ email, password }) => {
  const payload = {
    email: email != null ? email.trim() : '',
    password,
  }

  return apiClient.post('/auth/login', payload)
}

export const authApi = {
  signup,
  login,
}

export default authApi
