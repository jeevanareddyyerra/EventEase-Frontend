import { apiClient } from './client.js'

/**
 * Send a question to the EventEase RAG AI Assistant.
 * Endpoint: POST /api/ai/assistant/chat
 *
 * @param {Object} payload
 * @param {string} payload.question - Required user question (max 1000 characters)
 * @param {number|string} [payload.eventId] - Optional event ID filter
 * @param {string} [payload.documentType] - Optional DocumentType filter (RULES, FAQ, etc.)
 * @returns {Promise<import('axios').AxiosResponse<Object>>}
 */
export const askAiAssistant = async ({ question, eventId, documentType } = {}) => {
  const payload = { question: question ? question.trim() : '' }

  if (eventId !== undefined && eventId !== null && String(eventId).trim() !== '') {
    const num = Number(eventId)
    // If it's a valid integer, send the numeric value; otherwise send the original value
    // so backend validation (@Positive or type mismatch) can validate or reject invalid inputs explicitly.
    payload.eventId = !isNaN(num) && Number.isInteger(num) ? num : eventId
  }

  if (documentType && documentType !== 'ALL') {
    payload.documentType = documentType
  }

  return apiClient.post('/ai/assistant/chat', payload)
}

export const aiAssistantApi = {
  askAiAssistant,
}

export default aiAssistantApi
