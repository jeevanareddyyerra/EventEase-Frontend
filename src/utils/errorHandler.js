/**
 * Centralized API error formatter and sanitizer.
 * Transforms raw Axios errors into safe, structured error objects
 * without exposing sensitive backend internals or credentials.
 *
 * @param {import('axios').AxiosError | Error | any} error
 * @returns {{
 *   status: number,
 *   message: string,
 *   validationErrors: Record<string, string> | null,
 *   isNetworkError: boolean
 * }}
 */
export const formatApiError = (error) => {
  if (error && error.isFormattedApiError) {
    return error
  }

  // Response received from server (HTTP 4xx, 5xx)
  if (error?.response) {
    const status = error.response.status
    const data = error.response.data || {}
    const backendMessage = typeof data.message === 'string' ? data.message.trim() : null
    const validationErrors = data.validationErrors && typeof data.validationErrors === 'object'
      ? data.validationErrors
      : null

    let message = backendMessage

    switch (status) {
      case 400:
        message = message || 'Invalid request parameters.'
        break
      case 401:
        message = message || 'Authentication required or session expired.'
        break
      case 403:
        message = message || 'You do not have permission to perform this action.'
        break
      case 404:
        message = message || 'The requested resource was not found.'
        break
      case 409:
        message = message || 'A resource conflict was encountered.'
        break
      case 500:
      default:
        if (status >= 500) {
          // Never leak database errors, stack traces, or internal exceptions
          message = 'A server error occurred. Please try again later.'
        } else {
          message = message || 'An unexpected request error occurred.'
        }
        break
    }

    return {
      status,
      message,
      validationErrors,
      isNetworkError: false,
      isFormattedApiError: true,
    }
  }

  // Request made but no response received (network failure, timeout, CORS blocking)
  if (error?.request) {
    return {
      status: 0,
      message: 'Unable to reach the server. Please check your network connection.',
      validationErrors: null,
      isNetworkError: true,
      isFormattedApiError: true,
    }
  }

  // Error during request setup
  return {
    status: 0,
    message: typeof error?.message === 'string' ? error.message : 'An unexpected error occurred.',
    validationErrors: null,
    isNetworkError: false,
    isFormattedApiError: true,
  }
}

export const isAuthError = (error) => error?.status === 401
export const isForbiddenError = (error) => error?.status === 403
export const isNotFoundError = (error) => error?.status === 404
export const isNetworkError = (error) => Boolean(error?.isNetworkError)
