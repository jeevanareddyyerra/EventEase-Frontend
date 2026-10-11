import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRegistration } from '../src/api/registrationApi.js'
import { apiClient } from '../src/api/client.js'

describe('Participant & Volunteer Registration Flow & Business Logic', () => {
  const originalPost = apiClient.post

  describe('Event Registration Open Eligibility Condition', () => {
    const checkEventOpen = (event) => {
      return event?.status === 'PUBLISHED' || event?.status === 'APPROVED'
    }

    test('APPROVED events are open for registration', () => {
      assert.equal(checkEventOpen({ status: 'APPROVED' }), true)
    })

    test('PUBLISHED events are open for registration', () => {
      assert.equal(checkEventOpen({ status: 'PUBLISHED' }), true)
    })

    test('PENDING events are NOT open for registration', () => {
      assert.equal(checkEventOpen({ status: 'PENDING' }), false)
    })

    test('COMPLETED events are NOT open for registration', () => {
      assert.equal(checkEventOpen({ status: 'COMPLETED' }), false)
    })

    test('CANCELLED events are NOT open for registration', () => {
      assert.equal(checkEventOpen({ status: 'CANCELLED' }), false)
    })

    test('Null or undefined events are NOT open for registration', () => {
      assert.equal(checkEventOpen(null), false)
      assert.equal(checkEventOpen(undefined), false)
      assert.equal(checkEventOpen({}), false)
    })
  })

  describe('Participant Registration Button Disabled State Logic', () => {
    const isParticipantButtonDisabled = ({
      event,
      participantCount = 0,
      isDeadlinePassed = false,
      isSubmitting = false,
    }) => {
      const isEventOpenForRegistration =
        event?.status === 'PUBLISHED' || event?.status === 'APPROVED'
      const isParticipantCapacityFull =
        event?.capacity != null && participantCount >= event.capacity

      return (
        isSubmitting ||
        !isEventOpenForRegistration ||
        isDeadlinePassed ||
        isParticipantCapacityFull
      )
    }

    test('Button is ENABLED for APPROVED event with open deadline and available capacity', () => {
      const event = { id: 15, status: 'APPROVED', capacity: 100 }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 5,
        isDeadlinePassed: false,
        isSubmitting: false,
      })
      assert.equal(disabled, false)
    })

    test('Button is ENABLED for APPROVED event with unlimited capacity (null capacity)', () => {
      const event = { id: 15, status: 'APPROVED', capacity: null }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 99,
        isDeadlinePassed: false,
        isSubmitting: false,
      })
      assert.equal(disabled, false)
    })

    test('Button is DISABLED when APPROVED event registration deadline has passed', () => {
      const event = { id: 15, status: 'APPROVED', capacity: 100 }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 5,
        isDeadlinePassed: true,
        isSubmitting: false,
      })
      assert.equal(disabled, true)
    })

    test('Button is DISABLED when APPROVED event capacity is completely full', () => {
      const event = { id: 15, status: 'APPROVED', capacity: 50 }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 50,
        isDeadlinePassed: false,
        isSubmitting: false,
      })
      assert.equal(disabled, true)
    })

    test('Button is DISABLED when event is PENDING approval', () => {
      const event = { id: 15, status: 'PENDING', capacity: 100 }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 0,
        isDeadlinePassed: false,
        isSubmitting: false,
      })
      assert.equal(disabled, true)
    })

    test('Button is DISABLED when event is COMPLETED or CANCELLED', () => {
      assert.equal(
        isParticipantButtonDisabled({
          event: { id: 15, status: 'COMPLETED' },
          participantCount: 0,
          isDeadlinePassed: false,
        }),
        true
      )
      assert.equal(
        isParticipantButtonDisabled({
          event: { id: 15, status: 'CANCELLED' },
          participantCount: 0,
          isDeadlinePassed: false,
        }),
        true
      )
    })

    test('Button is DISABLED while registration submission is in progress', () => {
      const event = { id: 15, status: 'APPROVED', capacity: 100 }
      const disabled = isParticipantButtonDisabled({
        event,
        participantCount: 5,
        isDeadlinePassed: false,
        isSubmitting: true,
      })
      assert.equal(disabled, true)
    })
  })

  describe('Volunteer Registration Separate Requirements & Capacity', () => {
    const isVolunteerButtonDisabled = ({
      event,
      volunteerReq,
      volunteerCount = 0,
      isDeadlinePassed = false,
      isSubmitting = false,
    }) => {
      const isEventOpenForRegistration =
        event?.status === 'PUBLISHED' || event?.status === 'APPROVED'
      const isVolunteerCapacityFull =
        volunteerReq?.requiredCount != null && volunteerCount >= volunteerReq.requiredCount

      return (
        isSubmitting ||
        !isEventOpenForRegistration ||
        isDeadlinePassed ||
        isVolunteerCapacityFull
      )
    }

    test('Volunteer button is ENABLED when APPROVED event has open volunteer requirement', () => {
      const event = { id: 15, status: 'APPROVED' }
      const volunteerReq = { requiredCount: 10, roleDescription: 'Stage hands' }
      const disabled = isVolunteerButtonDisabled({
        event,
        volunteerReq,
        volunteerCount: 3,
        isDeadlinePassed: false,
      })
      assert.equal(disabled, false)
    })

    test('Volunteer button is DISABLED when volunteer capacity is full on APPROVED event', () => {
      const event = { id: 15, status: 'APPROVED' }
      const volunteerReq = { requiredCount: 5 }
      const disabled = isVolunteerButtonDisabled({
        event,
        volunteerReq,
        volunteerCount: 5,
        isDeadlinePassed: false,
      })
      assert.equal(disabled, true)
    })
  })

  describe('Registration Unavailable Explanation Messaging', () => {
    const getUnavailableExplanation = (event) => {
      const isEventOpenForRegistration =
        event?.status === 'PUBLISHED' || event?.status === 'APPROVED'
      if (isEventOpenForRegistration) return null

      return event?.status === 'PENDING'
        ? 'Registration is unavailable. This event is pending administrator approval.'
        : event?.status === 'COMPLETED'
        ? 'Registration is closed. This event has ended.'
        : event?.status === 'CANCELLED'
        ? 'Registration is unavailable. This event has been cancelled.'
        : `Registration is unavailable. Event status is ${event?.status || 'not open'}.`
    }

    test('PENDING event shows clear admin approval message', () => {
      assert.equal(
        getUnavailableExplanation({ status: 'PENDING' }),
        'Registration is unavailable. This event is pending administrator approval.'
      )
    })

    test('COMPLETED event shows clear event ended message', () => {
      assert.equal(
        getUnavailableExplanation({ status: 'COMPLETED' }),
        'Registration is closed. This event has ended.'
      )
    })

    test('CANCELLED event shows clear cancelled message', () => {
      assert.equal(
        getUnavailableExplanation({ status: 'CANCELLED' }),
        'Registration is unavailable. This event has been cancelled.'
      )
    })

    test('APPROVED and PUBLISHED events do not render unavailable explanation', () => {
      assert.equal(getUnavailableExplanation({ status: 'APPROVED' }), null)
      assert.equal(getUnavailableExplanation({ status: 'PUBLISHED' }), null)
    })
  })

  describe('createRegistration API Integration', () => {
    test('createRegistration sends properly formatted payload to POST /registrations', async () => {
      let capturedUrl = null
      let capturedPayload = null

      apiClient.post = async (url, payload) => {
        capturedUrl = url
        capturedPayload = payload
        return {
          data: {
            id: 201,
            userId: payload.userId,
            eventId: payload.eventId,
            type: payload.type,
            status: 'REGISTERED',
          },
          status: 201,
        }
      }

      try {
        const res = await createRegistration({
          userId: 7,
          eventId: 15,
          type: 'PARTICIPANT',
        })

        assert.equal(capturedUrl, '/registrations')
        assert.equal(capturedPayload.userId, 7)
        assert.equal(capturedPayload.eventId, 15)
        assert.equal(capturedPayload.type, 'PARTICIPANT')
        assert.equal(res.status, 201)
        assert.equal(res.data.id, 201)
      } finally {
        apiClient.post = originalPost
      }
    })
  })
})
