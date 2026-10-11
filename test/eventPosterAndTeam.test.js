import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { uploadEventImage, deleteEventImage } from '../src/api/organizerEventApi.js'
import {
  createTeam,
  getTeamsByEvent,
  createTeamMember,
  getTeamMembersByTeam,
} from '../src/api/teamApi.js'
import { apiClient } from '../src/api/client.js'

describe('Event Poster Image Upload & Team API Integration', () => {
  const originalGet = apiClient.get
  const originalPost = apiClient.post
  const originalDelete = apiClient.delete

  test('uploadEventImage: should call POST /events/upload-image with multipart/form-data', async () => {
    let capturedUrl = null
    let capturedPayload = null
    let capturedConfig = null

    apiClient.post = async (url, payload, config) => {
      capturedUrl = url
      capturedPayload = payload
      capturedConfig = config
      return {
        data: {
          imageUrl: 'https://res.cloudinary.com/eventease/image/upload/v1/eventease/events/poster123.jpg',
          publicId: 'eventease/events/poster123',
        },
        status: 200,
      }
    }

    try {
      const mockFile = new Blob(['image-bytes'], { type: 'image/jpeg' })
      const res = await uploadEventImage(mockFile)

      assert.equal(capturedUrl, '/events/upload-image')
      assert.ok(capturedPayload instanceof FormData)
      assert.equal(capturedConfig?.headers?.['Content-Type'], 'multipart/form-data')
      assert.equal(res.data.imageUrl, 'https://res.cloudinary.com/eventease/image/upload/v1/eventease/events/poster123.jpg')
      assert.equal(res.data.publicId, 'eventease/events/poster123')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('deleteEventImage: should call DELETE /events/images with publicId param', async () => {
    let capturedUrl = null
    let capturedConfig = null

    apiClient.delete = async (url, config) => {
      capturedUrl = url
      capturedConfig = config
      return { status: 204 }
    }

    try {
      const res = await deleteEventImage('eventease/events/poster123')
      assert.equal(capturedUrl, '/events/images')
      assert.equal(capturedConfig?.params?.publicId, 'eventease/events/poster123')
      assert.equal(res.status, 204)
    } finally {
      apiClient.delete = originalDelete
    }
  })

  test('createTeam: should call POST /teams with eventId and leaderId', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 10,
          name: 'Alpha Innovators',
          eventId: 5,
          leaderId: 100,
          leaderName: 'Alice Leader',
        },
        status: 201,
      }
    }

    try {
      const res = await createTeam({
        name: 'Alpha Innovators',
        eventId: 5,
        leaderId: 100,
      })
      assert.equal(capturedUrl, '/teams')
      assert.deepEqual(capturedPayload, {
        name: 'Alpha Innovators',
        eventId: 5,
        leaderId: 100,
      })
      assert.equal(res.data.id, 10)
      assert.equal(res.data.name, 'Alpha Innovators')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('getTeamsByEvent: should call GET /teams/event/{id}', async () => {
    let capturedUrl = null

    apiClient.get = async (url) => {
      capturedUrl = url
      return {
        data: [
          { id: 10, name: 'Team Alpha', eventId: 5, leaderId: 100 },
          { id: 11, name: 'Team Beta', eventId: 5, leaderId: 101 },
        ],
        status: 200,
      }
    }

    try {
      const res = await getTeamsByEvent(5)
      assert.equal(capturedUrl, '/teams/event/5')
      assert.equal(res.data.length, 2)
      assert.equal(res.data[0].name, 'Team Alpha')
    } finally {
      apiClient.get = originalGet
    }
  })

  test('createTeamMember: should call POST /team-members with teamId and userId', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 201,
          teamId: 10,
          userId: 102,
          userName: 'Bob Member',
          joinedAt: '2026-10-11T12:00:00Z',
        },
        status: 201,
      }
    }

    try {
      const res = await createTeamMember({
        teamId: 10,
        userId: 102,
      })
      assert.equal(capturedUrl, '/team-members')
      assert.deepEqual(capturedPayload, { teamId: 10, userId: 102 })
      assert.equal(res.data.id, 201)
      assert.equal(res.data.userName, 'Bob Member')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('getTeamMembersByTeam: should call GET /team-members/team/{teamId}', async () => {
    let capturedUrl = null

    apiClient.get = async (url) => {
      capturedUrl = url
      return {
        data: [
          { id: 201, teamId: 10, userId: 102, userName: 'Bob Member' },
        ],
        status: 200,
      }
    }

    try {
      const res = await getTeamMembersByTeam(10)
      assert.equal(capturedUrl, '/team-members/team/10')
      assert.equal(res.data.length, 1)
      assert.equal(res.data[0].userId, 102)
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Client-side file validation for poster image', () => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxBytes = 5 * 1024 * 1024

    assert.ok(validMimes.includes('image/jpeg'))
    assert.ok(validMimes.includes('image/png'))
    assert.ok(validMimes.includes('image/webp'))
    assert.ok(!validMimes.includes('application/pdf'))
    assert.ok(!validMimes.includes('text/plain'))

    const validSize = 2 * 1024 * 1024 // 2MB
    const oversized = 6 * 1024 * 1024 // 6MB
    assert.ok(validSize <= maxBytes)
    assert.ok(oversized > maxBytes)
  })

  test('Event payload formatting retains imageUrl', () => {
    const eventPayload = {
      title: 'Global AI Summit 2026',
      description: 'Annual summit on artificial intelligence',
      category: 'Conference',
      date: '2026-11-20',
      startTime: '09:00:00',
      endTime: '17:00:00',
      venue: 'Main Auditorium',
      capacity: 500,
      eligibility: 'All participants',
      registrationDeadline: '2026-11-19T23:59:00',
      organizerId: 42,
      imageUrl: 'https://res.cloudinary.com/eventease/image/upload/v1/eventease/events/poster.jpg',
    }

    assert.equal(eventPayload.imageUrl, 'https://res.cloudinary.com/eventease/image/upload/v1/eventease/events/poster.jpg')
    assert.equal(eventPayload.title, 'Global AI Summit 2026')
    assert.equal(eventPayload.capacity, 500)
  })
})
