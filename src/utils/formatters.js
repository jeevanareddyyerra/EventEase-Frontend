/**
 * Format an ISO date string (YYYY-MM-DD) into a human-readable date.
 *
 * @param {string} [dateStr]
 * @returns {string} e.g. "Oct 15, 2026"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBA'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    return dateStr
  } catch {
    return dateStr
  }
}

/**
 * Format an ISO time string (HH:mm:ss or HH:mm) into a 12-hour display.
 *
 * @param {string} [timeStr]
 * @returns {string} e.g. "10:00 AM"
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  try {
    const parts = timeStr.split(':')
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1] || '00'
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  } catch {
    return timeStr
  }
}

/**
 * Format combined time range.
 *
 * @param {string} [startTime]
 * @param {string} [endTime]
 * @returns {string} e.g. "10:00 AM – 2:00 PM"
 */
export const formatTimeRange = (startTime, endTime) => {
  const start = formatTime(startTime)
  const end = formatTime(endTime)
  if (start && end) return `${start} – ${end}`
  if (start) return start
  if (end) return `Until ${end}`
  return 'Time TBA'
}

/**
 * Format an ISO datetime string into full date & time.
 *
 * @param {string} [dateTimeStr]
 * @returns {string} e.g. "Oct 14, 2026, 11:59 PM"
 */
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return 'TBA'
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return dateTimeStr
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateTimeStr
  }
}

/**
 * Return today's date formatted as YYYY-MM-DD.
 *
 * @returns {string} e.g. "2026-10-09"
 */
export const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

