import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { askAiAssistant } from '../src/api/aiAssistantApi.js'
import { apiClient } from '../src/api/client.js'

describe('AI Assistant Frontend API Integration', () => {
  // Store original post function to restore after tests
  const originalPost = apiClient.post

  test('should format clean payload with question and call POST /ai/assistant/chat', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          answer: 'Teams may have up to 4 members.',
          grounded: true,
          evidenceFound: true,
          sources: [
            {
              eventId: 10,
              eventTitle: 'Hackathon 2026',
              documentId: 1,
              documentTitle: 'Official Rules',
              documentType: 'RULES',
              chunkId: 'event-10-doc-1-chunk-0',
              similarityScore: 0.894,
            },
          ],
          topSimilarityScore: 0.894,
          modelUsed: 'gemini-3.8-flash',
          fallbackReason: null,
        },
      }
    }

    try {
      const res = await askAiAssistant({ question: 'What is the team size?' })
      assert.equal(capturedUrl, '/ai/assistant/chat')
      assert.deepEqual(capturedPayload, { question: 'What is the team size?' })
      assert.equal(res.data.grounded, true)
      assert.equal(res.data.evidenceFound, true)
      assert.equal(res.data.modelUsed, 'gemini-3.8-flash')
      assert.equal(res.data.sources.length, 1)
      assert.equal(res.data.sources[0].eventTitle, 'Hackathon 2026')
      assert.equal(res.data.sources[0].documentType, 'RULES')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should trim leading and trailing whitespace from the user question', async () => {
    let capturedPayload = null

    apiClient.post = async (_url, payload) => {
      capturedPayload = payload
      return { data: { answer: 'Valid answer', grounded: true, sources: [] } }
    }

    try {
      await askAiAssistant({ question: '   Are laptops mandatory?   ' })
      assert.equal(capturedPayload.question, 'Are laptops mandatory?')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should include numeric eventId and documentType filters when supplied', async () => {
    let capturedPayload = null

    apiClient.post = async (_url, payload) => {
      capturedPayload = payload
      return { data: { answer: 'Laptops required.', grounded: true, sources: [] } }
    }

    try {
      await askAiAssistant({
        question: 'Are laptops required?',
        eventId: '15',
        documentType: 'RULES',
      })
      assert.deepEqual(capturedPayload, {
        question: 'Are laptops required?',
        eventId: 15,
        documentType: 'RULES',
      })
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should pass non-empty invalid or negative eventId so backend validation catches it', async () => {
    let capturedPayload = null

    apiClient.post = async (_url, payload) => {
      capturedPayload = payload
      return { data: { answer: 'Checked', grounded: true, sources: [] } }
    }

    try {
      // Negative integer string should preserve value to trigger @Positive on backend
      await askAiAssistant({
        question: 'Negative event test?',
        eventId: '-5',
      })
      assert.equal(capturedPayload.eventId, -5)

      // Non-numeric string should preserve value to trigger type mismatch on backend
      await askAiAssistant({
        question: 'Malformed event test?',
        eventId: 'abc_not_number',
      })
      assert.equal(capturedPayload.eventId, 'abc_not_number')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should omit documentType filter when set to "ALL"', async () => {
    let capturedPayload = null

    apiClient.post = async (_url, payload) => {
      capturedPayload = payload
      return { data: { answer: 'Schedule info.', grounded: true, sources: [] } }
    }

    try {
      await askAiAssistant({
        question: 'What is the schedule?',
        eventId: 20,
        documentType: 'ALL',
      })
      assert.deepEqual(capturedPayload, {
        question: 'What is the schedule?',
        eventId: 20,
      })
      assert.equal(capturedPayload.documentType, undefined)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should handle insufficient evidence fallback response correctly', async () => {
    apiClient.post = async () => ({
      data: {
        answer: 'I do not have sufficient information in the published event documentation to answer your question.',
        grounded: false,
        evidenceFound: false,
        sources: [],
        topSimilarityScore: 0.12,
        modelUsed: null,
        fallbackReason: 'INSUFFICIENT_EVIDENCE',
      },
    })

    try {
      const res = await askAiAssistant({ question: 'What is the prize pool?' })
      assert.equal(res.data.grounded, false)
      assert.equal(res.data.evidenceFound, false)
      assert.equal(res.data.fallbackReason, 'INSUFFICIENT_EVIDENCE')
      assert.equal(res.data.sources.length, 0)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should handle unconfigured AI client fallback correctly', async () => {
    apiClient.post = async () => ({
      data: {
        answer: 'AI answer generation is currently unavailable. Relevant documentation was found in: "Official Rules".',
        grounded: false,
        evidenceFound: true,
        sources: [
          {
            eventId: 10,
            eventTitle: 'Hackathon 2026',
            documentId: 1,
            documentTitle: 'Official Rules',
            documentType: 'RULES',
            chunkId: 'event-10-doc-1-chunk-0',
            similarityScore: 0.85,
          },
        ],
        topSimilarityScore: 0.85,
        modelUsed: null,
        fallbackReason: 'AI_CLIENT_UNCONFIGURED',
      },
    })

    try {
      const res = await askAiAssistant({ question: 'What are the rules?' })
      assert.equal(res.data.grounded, false)
      assert.equal(res.data.evidenceFound, true)
      assert.equal(res.data.fallbackReason, 'AI_CLIENT_UNCONFIGURED')
      assert.equal(res.data.sources.length, 1)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should handle AI_CLIENT_ERROR provider failure fallback with citations preserved', async () => {
    apiClient.post = async () => ({
      data: {
        answer: 'The AI service encountered an issue while generating a response. Relevant documentation was found in: "Venue Guidelines".',
        grounded: false,
        evidenceFound: true,
        sources: [
          {
            eventId: 12,
            eventTitle: 'Tech Summit 2026',
            documentId: 3,
            documentTitle: 'Venue Guidelines',
            documentType: 'GUIDELINES',
            chunkId: 'event-12-doc-3-chunk-1',
            similarityScore: 0.782,
          },
        ],
        topSimilarityScore: 0.782,
        modelUsed: 'gemini-3.8-flash',
        fallbackReason: 'AI_CLIENT_ERROR',
      },
    })

    try {
      const res = await askAiAssistant({ question: 'Where is parking?' })
      assert.equal(res.data.grounded, false)
      assert.equal(res.data.evidenceFound, true)
      assert.equal(res.data.fallbackReason, 'AI_CLIENT_ERROR')
      assert.equal(res.data.sources.length, 1)
      assert.equal(res.data.sources[0].documentType, 'GUIDELINES')
      assert.equal(res.data.topSimilarityScore, 0.782)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should preserve multi-source citations with distinct metadata and vector scores', async () => {
    const mockSources = [
      {
        eventId: 10,
        eventTitle: 'Hackathon 2026',
        documentId: 1,
        documentTitle: 'Rules',
        documentType: 'RULES',
        chunkId: 'chunk-1',
        similarityScore: 0.88,
      },
      {
        eventId: 10,
        eventTitle: 'Hackathon 2026',
        documentId: 2,
        documentTitle: 'FAQ',
        documentType: 'FAQ',
        chunkId: 'chunk-2',
        similarityScore: 0.76,
      },
    ]

    apiClient.post = async () => ({
      data: {
        answer: 'Detailed combined answer.',
        grounded: true,
        evidenceFound: true,
        sources: mockSources,
        topSimilarityScore: 0.88,
        modelUsed: 'gemini-3.8-flash',
        fallbackReason: null,
      },
    })

    try {
      const res = await askAiAssistant({ question: 'What are the rules and FAQs?' })
      assert.equal(res.data.sources.length, 2)
      assert.equal(res.data.sources[0].chunkId, 'chunk-1')
      assert.equal(res.data.sources[0].similarityScore, 0.88)
      assert.equal(res.data.sources[1].chunkId, 'chunk-2')
      assert.equal(res.data.sources[1].similarityScore, 0.76)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should propagate formatted 400 Bad Request error (e.g., event not published)', async () => {
    apiClient.post = async () => {
      const err = new Error('Questions can only be asked for PUBLISHED events.')
      err.status = 400
      err.isFormattedApiError = true
      throw err
    }

    try {
      await assert.rejects(
        async () => {
          await askAiAssistant({ question: 'Draft rules?', eventId: 99 })
        },
        (err) => {
          assert.equal(err.status, 400)
          assert.match(err.message, /PUBLISHED/)
          return true
        }
      )
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should propagate formatted 401 Unauthorized error', async () => {
    apiClient.post = async () => {
      const err = new Error('Authentication required')
      err.status = 401
      err.isFormattedApiError = true
      throw err
    }

    try {
      await assert.rejects(
        async () => {
          await askAiAssistant({ question: 'Unauthenticated query?' })
        },
        (err) => {
          assert.equal(err.status, 401)
          assert.match(err.message, /Authentication required/)
          return true
        }
      )
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should propagate formatted 404 Not Found error', async () => {
    apiClient.post = async () => {
      const err = new Error('Event not found with id: 999')
      err.status = 404
      err.isFormattedApiError = true
      throw err
    }

    try {
      await assert.rejects(
        async () => {
          await askAiAssistant({ question: 'Query for missing event?', eventId: 999 })
        },
        (err) => {
          assert.equal(err.status, 404)
          assert.match(err.message, /not found/)
          return true
        }
      )
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should propagate formatted 429 Rate Limit error', async () => {
    apiClient.post = async () => {
      const err = new Error('AI assistant rate limit exceeded. Please try again shortly.')
      err.status = 429
      err.isFormattedApiError = true
      throw err
    }

    try {
      await assert.rejects(
        async () => {
          await askAiAssistant({ question: 'Spammed query?' })
        },
        (err) => {
          assert.equal(err.status, 429)
          assert.match(err.message, /rate limit/i)
          return true
        }
      )
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should propagate network connection errors', async () => {
    apiClient.post = async () => {
      const err = new Error('Unable to reach the server. Please check your network connection.')
      err.status = 0
      err.isNetworkError = true
      err.isFormattedApiError = true
      throw err
    }

    try {
      await assert.rejects(
        async () => {
          await askAiAssistant({ question: 'Query during network outage?' })
        },
        (err) => {
          assert.equal(err.status, 0)
          assert.equal(err.isNetworkError, true)
          assert.match(err.message, /Unable to reach the server/)
          return true
        }
      )
    } finally {
      apiClient.post = originalPost
    }
  })

  test('should safely handle empty or omitted parameters', async () => {
    let capturedPayload = null

    apiClient.post = async (_url, payload) => {
      capturedPayload = payload
      return { data: { answer: 'Answer', grounded: true, sources: [] } }
    }

    try {
      await askAiAssistant()
      assert.deepEqual(capturedPayload, { question: '' })
    } finally {
      apiClient.post = originalPost
    }
  })
})
