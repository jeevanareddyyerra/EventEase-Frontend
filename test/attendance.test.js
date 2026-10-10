import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  markAttendance,
  updateAttendance,
  getAttendanceByRegistration,
  getAttendanceById,
} from '../src/api/attendanceApi.js'
import { apiClient } from '../src/api/client.js'

describe('Attendance API Integration & Logic', () => {
  const originalGet = apiClient.get
  const originalPost = apiClient.post
  const originalPut = apiClient.put

  test('markAttendance: should call POST /attendance with registrationId and attended=true for Present', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 101,
          registrationId: 42,
          attended: true,
          markedAt: '2026-10-10T12:00:00Z',
        },
        status: 201,
      }
    }

    try {
      const res = await markAttendance({ registrationId: 42, attended: true })
      assert.equal(capturedUrl, '/attendance')
      assert.deepEqual(capturedPayload, { registrationId: 42, attended: true })
      assert.equal(res.data.id, 101)
      assert.equal(res.data.attended, true)
      assert.equal(res.data.registrationId, 42)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('markAttendance: should call POST /attendance with registrationId and attended=false for Absent', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 102,
          registrationId: 43,
          attended: false,
          markedAt: '2026-10-10T12:05:00Z',
        },
        status: 201,
      }
    }

    try {
      const res = await markAttendance({ registrationId: 43, attended: false })
      assert.equal(capturedUrl, '/attendance')
      assert.deepEqual(capturedPayload, { registrationId: 43, attended: false })
      assert.equal(res.data.id, 102)
      assert.equal(res.data.attended, false)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('updateAttendance: should call PUT /attendance/{id} with attended=true when updating to Present', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.put = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 101,
          registrationId: 42,
          attended: true,
          markedAt: '2026-10-10T12:10:00Z',
        },
        status: 200,
      }
    }

    try {
      const res = await updateAttendance(101, { attended: true })
      assert.equal(capturedUrl, '/attendance/101')
      assert.deepEqual(capturedPayload, { attended: true })
      assert.equal(res.data.attended, true)
    } finally {
      apiClient.put = originalPut
    }
  })

  test('updateAttendance: should call PUT /attendance/{id} with attended=false when updating to Absent', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.put = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 101,
          registrationId: 42,
          attended: false,
          markedAt: '2026-10-10T12:15:00Z',
        },
        status: 200,
      }
    }

    try {
      const res = await updateAttendance(101, { attended: false })
      assert.equal(capturedUrl, '/attendance/101')
      assert.deepEqual(capturedPayload, { attended: false })
      assert.equal(res.data.attended, false)
    } finally {
      apiClient.put = originalPut
    }
  })

  test('getAttendanceByRegistration: should call GET /attendance/registration/{registrationId}', async () => {
    let capturedUrl = null

    apiClient.get = async (url) => {
      capturedUrl = url
      return {
        data: {
          id: 200,
          registrationId: 55,
          attended: true,
          markedAt: '2026-10-10T11:00:00Z',
        },
      }
    }

    try {
      const res = await getAttendanceByRegistration(55)
      assert.equal(capturedUrl, '/attendance/registration/55')
      assert.equal(res.data.id, 200)
      assert.equal(res.data.registrationId, 55)
      assert.equal(res.data.attended, true)
    } finally {
      apiClient.get = originalGet
    }
  })

  test('getAttendanceById: should call GET /attendance/{id}', async () => {
    let capturedUrl = null

    apiClient.get = async (url) => {
      capturedUrl = url
      return {
        data: {
          id: 300,
          registrationId: 77,
          attended: false,
        },
      }
    }

    try {
      const res = await getAttendanceById(300)
      assert.equal(capturedUrl, '/attendance/300')
      assert.equal(res.data.id, 300)
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Error handling: 404 indicates NOT MARKED, non-404 indicates actual error', async () => {
    // 404 Not Found error simulation
    apiClient.get = async () => {
      const err = new Error('Attendance not found')
      err.status = 404
      throw err
    }

    try {
      let is404 = false
      try {
        await getAttendanceByRegistration(999)
      } catch (err) {
        if (err.status === 404) {
          is404 = true
        }
      }
      assert.equal(is404, true, '404 should be detected to indicate NOT MARKED')
    } finally {
      apiClient.get = originalGet
    }

    // 500 Internal Server Error simulation
    apiClient.get = async () => {
      const err = new Error('Internal Server Error')
      err.status = 500
      throw err
    }

    try {
      let isServerError = false
      try {
        await getAttendanceByRegistration(999)
      } catch (err) {
        if (err.status !== 404) {
          isServerError = true
        }
      }
      assert.equal(isServerError, true, 'Non-404 error should NOT be treated as NOT MARKED')
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Attendance state management logic for roster rows', async () => {
    // Simulate the roster attendance resolution logic used in OrganizerDashboardPage
    const mockRoster = [
      { id: 10, userName: 'Alice', status: 'REGISTERED' }, // has attendance (PRESENT)
      { id: 11, userName: 'Bob', status: 'REGISTERED' },   // no attendance record (404 -> NOT_MARKED)
      { id: 12, userName: 'Charlie', status: 'REGISTERED' }, // server error (500 -> ERROR)
      { id: 13, userName: 'Dave', status: 'CANCELLED' },   // cancelled -> N/A
    ]

    apiClient.get = async (url) => {
      if (url === '/attendance/registration/10') {
        return { data: { id: 501, registrationId: 10, attended: true } }
      }
      if (url === '/attendance/registration/11') {
        const notFound = new Error('Attendance not found for registration: 11')
        notFound.status = 404
        throw notFound
      }
      if (url === '/attendance/registration/12') {
        const serverError = new Error('Database connection failed')
        serverError.status = 500
        throw serverError
      }
      throw new Error('Unexpected URL: ' + url)
    }

    try {
      const attendanceResults = {}

      for (const reg of mockRoster) {
        if (reg.status === 'CANCELLED' || reg.status === 'REJECTED') {
          attendanceResults[reg.id] = { status: 'NOT_APPLICABLE' }
          continue
        }

        try {
          const res = await getAttendanceByRegistration(reg.id)
          attendanceResults[reg.id] = {
            attendanceId: res.data.id,
            status: res.data.attended ? 'PRESENT' : 'ABSENT',
            attended: res.data.attended,
          }
        } catch (err) {
          if (err.status === 404) {
            attendanceResults[reg.id] = {
              attendanceId: null,
              status: 'NOT_MARKED',
              attended: null,
            }
          } else {
            attendanceResults[reg.id] = {
              attendanceId: null,
              status: 'ERROR',
              error: err.message,
            }
          }
        }
      }

      // Assert each item's derived state matches requirements
      assert.equal(attendanceResults[10].status, 'PRESENT')
      assert.equal(attendanceResults[10].attendanceId, 501)
      assert.equal(attendanceResults[10].attended, true)

      assert.equal(attendanceResults[11].status, 'NOT_MARKED')
      assert.equal(attendanceResults[11].attendanceId, null)

      assert.equal(attendanceResults[12].status, 'ERROR')
      assert.equal(attendanceResults[12].error, 'Database connection failed')

      assert.equal(attendanceResults[13].status, 'NOT_APPLICABLE')
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Marking attendance workflow: POST when no record exists, PUT when record exists', async () => {
    let postCallCount = 0
    let putCallCount = 0

    apiClient.post = async (url, payload) => {
      postCallCount++
      assert.equal(url, '/attendance')
      return {
        data: { id: 777, registrationId: payload.registrationId, attended: payload.attended },
        status: 201,
      }
    }

    apiClient.put = async (url, payload) => {
      putCallCount++
      assert.equal(url, '/attendance/777')
      return {
        data: { id: 777, registrationId: 50, attended: payload.attended },
        status: 200,
      }
    }

    try {
      // Step 1: Initial mark (no record exists -> POST)
      const currentRecord = null
      let activeRecord = null

      if (!currentRecord?.attendanceId) {
        const postRes = await markAttendance({ registrationId: 50, attended: true })
        activeRecord = postRes.data
      } else {
        const putRes = await updateAttendance(currentRecord.attendanceId, { attended: true })
        activeRecord = putRes.data
      }

      assert.equal(postCallCount, 1)
      assert.equal(putCallCount, 0)
      assert.equal(activeRecord.id, 777)
      assert.equal(activeRecord.attended, true)

      // Step 2: Update mark from Present to Absent (record exists -> PUT)
      if (activeRecord?.id) {
        const putRes = await updateAttendance(activeRecord.id, { attended: false })
        activeRecord = putRes.data
      } else {
        const postRes = await markAttendance({ registrationId: 50, attended: false })
        activeRecord = postRes.data
      }

      assert.equal(postCallCount, 1)
      assert.equal(putCallCount, 1)
      assert.equal(activeRecord.id, 777)
      assert.equal(activeRecord.attended, false)
    } finally {
      apiClient.post = originalPost
      apiClient.put = originalPut
    }
  })

  test('Conflict resolution: 409 Conflict on POST falls back to fetch and PUT', async () => {
    let postAttempted = false
    let getAttempted = false
    let putAttempted = false

    apiClient.post = async () => {
      postAttempted = true
      const conflictErr = new Error('Attendance already marked for registration: 60')
      conflictErr.status = 409
      throw conflictErr
    }

    apiClient.get = async (url) => {
      getAttempted = true
      assert.equal(url, '/attendance/registration/60')
      return {
        data: { id: 888, registrationId: 60, attended: false },
      }
    }

    apiClient.put = async (url, payload) => {
      putAttempted = true
      assert.equal(url, '/attendance/888')
      assert.equal(payload.attended, true)
      return {
        data: { id: 888, registrationId: 60, attended: true },
      }
    }

    try {
      // Simulate handleMarkAttendance conflict recovery branch
      const regId = 60
      const shouldBeAttended = true
      let resultAtt = null

      try {
        const res = await markAttendance({ registrationId: regId, attended: shouldBeAttended })
        resultAtt = res.data
      } catch (postErr) {
        if (postErr?.status === 409) {
          const fetchRes = await getAttendanceByRegistration(regId)
          if (fetchRes.data?.id) {
            const updateRes = await updateAttendance(fetchRes.data.id, { attended: shouldBeAttended })
            resultAtt = updateRes.data
          }
        }
      }

      assert.equal(postAttempted, true)
      assert.equal(getAttempted, true)
      assert.equal(putAttempted, true)
      assert.notEqual(resultAtt, null)
      assert.equal(resultAtt.id, 888)
      assert.equal(resultAtt.attended, true)
    } finally {
      apiClient.post = originalPost
      apiClient.get = originalGet
      apiClient.put = originalPut
    }
  })

  test('Prevention of duplicate submissions and operation-in-progress state tracking', () => {
    let updatingAttendanceId = null
    let updatingAttendanceAction = null

    const isButtonDisabled = (regId, targetAction, currentStatus) => {
      // Buttons should be disabled if any attendance operation is in progress,
      // or if the attendee already has this status
      if (updatingAttendanceId !== null) return true
      if (currentStatus === targetAction) return true
      return false
    }

    const getButtonLabel = (regId, targetAction, defaultLabel) => {
      if (updatingAttendanceId === regId && updatingAttendanceAction === targetAction) {
        return 'Marking...'
      }
      return defaultLabel
    }

    // Idle state, attendee is NOT_MARKED
    assert.equal(isButtonDisabled(1, 'PRESENT', 'NOT_MARKED'), false)
    assert.equal(isButtonDisabled(1, 'ABSENT', 'NOT_MARKED'), false)
    assert.equal(getButtonLabel(1, 'PRESENT', 'Mark Present'), 'Mark Present')

    // Attendee is already PRESENT
    assert.equal(isButtonDisabled(1, 'PRESENT', 'PRESENT'), true)
    assert.equal(isButtonDisabled(1, 'ABSENT', 'PRESENT'), false)

    // Operation in progress for registration 1 marking Present
    updatingAttendanceId = 1
    updatingAttendanceAction = 'PRESENT'

    assert.equal(isButtonDisabled(1, 'PRESENT', 'NOT_MARKED'), true)
    assert.equal(isButtonDisabled(1, 'ABSENT', 'NOT_MARKED'), true)
    assert.equal(getButtonLabel(1, 'PRESENT', 'Mark Present'), 'Marking...')
    assert.equal(getButtonLabel(1, 'ABSENT', 'Mark Absent'), 'Mark Absent')

    // Other rows are also protected against concurrent duplicate submission
    assert.equal(isButtonDisabled(2, 'PRESENT', 'NOT_MARKED'), true)
    assert.equal(isButtonDisabled(2, 'ABSENT', 'NOT_MARKED'), true)

    // Operation finishes
    updatingAttendanceId = null
    updatingAttendanceAction = null

    assert.equal(isButtonDisabled(2, 'PRESENT', 'NOT_MARKED'), false)
    assert.equal(getButtonLabel(1, 'PRESENT', 'Mark Present'), 'Mark Present')
  })
})
