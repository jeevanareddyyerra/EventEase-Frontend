import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { createEvent, updateEvent } from '../src/api/organizerEventApi.js'
import { apiClient } from '../src/api/client.js'

describe('Organizer Event Form State & Payload Formatting', () => {
  const originalPost = apiClient.post
  const originalPut = apiClient.put

  test('Strict numeric ID validation correctly identifies create vs edit modes', () => {
    const isEditModeCheck = (id) => {
      const numericId = id != null && id !== 'new' && id !== 'undefined' ? Number(id) : null
      return Boolean(numericId && !isNaN(numericId) && numericId > 0)
    }

    // Create mode scenarios
    assert.equal(isEditModeCheck(undefined), false)
    assert.equal(isEditModeCheck(null), false)
    assert.equal(isEditModeCheck(''), false)
    assert.equal(isEditModeCheck('new'), false)
    assert.equal(isEditModeCheck(':id'), false)
    assert.equal(isEditModeCheck('undefined'), false)
    assert.equal(isEditModeCheck('0'), false)
    assert.equal(isEditModeCheck('-5'), false)

    // Edit mode scenarios
    assert.equal(isEditModeCheck('1'), true)
    assert.equal(isEditModeCheck('42'), true)
    assert.equal(isEditModeCheck(100), true)
  })

  test('Time formatting helper safely formats LocalTime without duplicate seconds', () => {
    const formatTimePayload = (timeStr) => {
      if (!timeStr || typeof timeStr !== 'string') return null
      const trimmed = timeStr.trim()
      if (!trimmed) return null
      if (trimmed.length === 5 && trimmed.includes(':')) {
        return `${trimmed}:00`
      }
      return trimmed
    }

    // Empty or falsy inputs
    assert.equal(formatTimePayload(null), null)
    assert.equal(formatTimePayload(''), null)
    assert.equal(formatTimePayload('   '), null)

    // Standard HTML5 time input (5 characters "HH:mm")
    assert.equal(formatTimePayload('09:30'), '09:30:00')
    assert.equal(formatTimePayload('18:00'), '18:00:00')

    // Already formatted time with seconds (8 characters "HH:mm:ss")
    assert.equal(formatTimePayload('09:30:00'), '09:30:00')
    assert.equal(formatTimePayload('18:00:00'), '18:00:00')
  })

  test('Deadline formatting helper safely formats LocalDateTime without duplicate seconds', () => {
    const formatDeadlinePayload = (deadlineStr) => {
      if (!deadlineStr || typeof deadlineStr !== 'string') return null
      const trimmed = deadlineStr.trim()
      if (!trimmed) return null
      if (trimmed.length === 16) {
        return `${trimmed}:00`
      }
      return trimmed
    }

    // Empty or falsy inputs
    assert.equal(formatDeadlinePayload(null), null)
    assert.equal(formatDeadlinePayload(''), null)
    assert.equal(formatDeadlinePayload('   '), null)

    // Standard HTML5 datetime-local input (16 characters "YYYY-MM-DDTHH:mm")
    assert.equal(formatDeadlinePayload('2026-11-24T23:59'), '2026-11-24T23:59:00')

    // Already formatted with seconds (19 characters)
    assert.equal(formatDeadlinePayload('2026-11-24T23:59:00'), '2026-11-24T23:59:00')
  })

  test('createEvent: calls POST /events with valid payload', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: { id: 99, ...payload, status: 'PENDING' },
        status: 201,
      }
    }

    try {
      const payload = {
        title: 'New Conference',
        category: 'Conference',
        date: '2026-11-25',
        startTime: '09:00:00',
        endTime: '17:00:00',
        capacity: 150,
      }
      const res = await createEvent(payload)

      assert.equal(capturedUrl, '/events')
      assert.equal(capturedPayload.title, 'New Conference')
      assert.equal(capturedPayload.startTime, '09:00:00')
      assert.equal(res.status, 201)
      assert.equal(res.data.id, 99)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('updateEvent: calls PUT /events/{id} with valid payload', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.put = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: { id: 42, ...payload },
        status: 200,
      }
    }

    try {
      const payload = {
        title: 'Updated Summit',
        date: '2026-12-01',
        startTime: '10:00:00',
      }
      const res = await updateEvent(42, payload)

      assert.equal(capturedUrl, '/events/42')
      assert.equal(capturedPayload.title, 'Updated Summit')
      assert.equal(res.status, 200)
    } finally {
      apiClient.put = originalPut
    }
  })

  test('createEvent: creates event without poster image upload, setting imageUrl to null', async () => {
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedPayload = payload
      return {
        data: { id: 101, ...payload, status: 'PENDING' },
        status: 201,
      }
    }

    try {
      const payload = {
        title: 'Tech Conference 2026',
        category: 'Conference',
        date: '2026-11-25',
        startTime: '09:00:00',
        endTime: '17:00:00',
        venue: 'Hall A',
        capacity: 100,
        organizerId: 6,
        imageUrl: null,
      }
      const res = await createEvent(payload)

      assert.equal(res.status, 201)
      assert.equal(capturedPayload.imageUrl, null)
      assert.equal(res.data.imageUrl, null)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('updateEvent: preserves existing imageUrl when updating an event record', async () => {
    let capturedPayload = null

    apiClient.put = async (url, payload) => {
      capturedPayload = payload
      return {
        data: { id: 101, ...payload },
        status: 200,
      }
    }

    try {
      const existingImageUrl = 'https://res.cloudinary.com/eventease/image/upload/v1/eventease/events/poster123.jpg'
      const payload = {
        title: 'Tech Conference 2026 - Updated',
        date: '2026-11-26',
        imageUrl: existingImageUrl,
      }
      const res = await updateEvent(101, payload)

      assert.equal(res.status, 200)
      assert.equal(capturedPayload.imageUrl, existingImageUrl)
      assert.equal(res.data.imageUrl, existingImageUrl)
    } finally {
      apiClient.put = originalPut
    }
  })
})
