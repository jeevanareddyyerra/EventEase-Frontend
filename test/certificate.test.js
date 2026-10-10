import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  issueCertificate,
  getCertificateByRegistration,
  getCertificateById,
  getAllCertificates,
} from '../src/api/certificateApi.js'
import { apiClient } from '../src/api/client.js'

describe('Certificate API Integration & Logic', () => {
  const originalGet = apiClient.get
  const originalPost = apiClient.post

  test('issueCertificate: should call POST /certificates with registrationId and optional certificateUrl', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 501,
          registrationId: 88,
          status: 'ISSUED',
          certificateUrl: 'https://example.com/certs/cert-88.pdf',
          issuedAt: '2026-10-10T14:00:00Z',
        },
        status: 201,
      }
    }

    try {
      const res = await issueCertificate({
        registrationId: 88,
        certificateUrl: 'https://example.com/certs/cert-88.pdf',
      })
      assert.equal(capturedUrl, '/certificates')
      assert.deepEqual(capturedPayload, {
        registrationId: 88,
        certificateUrl: 'https://example.com/certs/cert-88.pdf',
      })
      assert.equal(res.data.id, 501)
      assert.equal(res.data.registrationId, 88)
      assert.equal(res.data.status, 'ISSUED')
      assert.equal(res.data.certificateUrl, 'https://example.com/certs/cert-88.pdf')
      assert.notEqual(res.data.issuedAt, null)
    } finally {
      apiClient.post = originalPost
    }
  })

  test('issueCertificate: should call POST /certificates without certificateUrl when omitted', async () => {
    let capturedUrl = null
    let capturedPayload = null

    apiClient.post = async (url, payload) => {
      capturedUrl = url
      capturedPayload = payload
      return {
        data: {
          id: 502,
          registrationId: 89,
          status: 'ISSUED',
          certificateUrl: null,
          issuedAt: '2026-10-10T14:05:00Z',
        },
        status: 201,
      }
    }

    try {
      const res = await issueCertificate({ registrationId: 89 })
      assert.equal(capturedUrl, '/certificates')
      assert.deepEqual(capturedPayload, { registrationId: 89 })
      assert.equal(res.data.id, 502)
      assert.equal(res.data.status, 'ISSUED')
    } finally {
      apiClient.post = originalPost
    }
  })

  test('getCertificateByRegistration: should call GET /certificates/registration/{registrationId}', async () => {
    let capturedUrl = null

    apiClient.get = async (url) => {
      capturedUrl = url
      return {
        data: {
          id: 601,
          registrationId: 105,
          status: 'ISSUED',
          certificateUrl: 'https://certs.eventease.com/105',
          issuedAt: '2026-10-10T12:00:00Z',
        },
      }
    }

    try {
      const res = await getCertificateByRegistration(105)
      assert.equal(capturedUrl, '/certificates/registration/105')
      assert.equal(res.data.id, 601)
      assert.equal(res.data.registrationId, 105)
      assert.equal(res.data.status, 'ISSUED')
    } finally {
      apiClient.get = originalGet
    }
  })

  test('getCertificateById & getAllCertificates: should call GET /certificates/{id} and GET /certificates', async () => {
    let capturedUrls = []

    apiClient.get = async (url) => {
      capturedUrls.push(url)
      if (url === '/certificates/601') {
        return { data: { id: 601, status: 'ISSUED' } }
      }
      if (url === '/certificates') {
        return { data: [{ id: 601, status: 'ISSUED' }] }
      }
      throw new Error('Not found')
    }

    try {
      const single = await getCertificateById(601)
      const list = await getAllCertificates()
      assert.equal(single.data.id, 601)
      assert.equal(list.data.length, 1)
      assert.deepEqual(capturedUrls, ['/certificates/601', '/certificates'])
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Issuance blocked when attendance is not PRESENT', () => {
    const event = { id: 1, status: 'COMPLETED' }

    const canIssueCertificate = (evt, attendance, cert) => {
      if (evt?.status !== 'COMPLETED') return false
      if (!attendance || attendance.status !== 'PRESENT') return false
      if (cert && cert.status === 'ISSUED') return false
      return true
    }

    // Attendee is NOT_MARKED
    assert.equal(canIssueCertificate(event, { status: 'NOT_MARKED' }, { status: 'NOT_ISSUED' }), false)

    // Attendee is ABSENT
    assert.equal(canIssueCertificate(event, { status: 'ABSENT' }, { status: 'NOT_ISSUED' }), false)

    // Attendee is null / unrecorded
    assert.equal(canIssueCertificate(event, null, { status: 'NOT_ISSUED' }), false)

    // Attendee is PRESENT -> issuance is allowed
    assert.equal(canIssueCertificate(event, { status: 'PRESENT' }, { status: 'NOT_ISSUED' }), true)
  })

  test('Issuance blocked when the event is not COMPLETED', () => {
    const canManageCertificates = (eventStatus) => eventStatus === 'COMPLETED'

    // Gating for other event statuses
    assert.equal(canManageCertificates('PENDING'), false)
    assert.equal(canManageCertificates('APPROVED'), false)
    assert.equal(canManageCertificates('PUBLISHED'), false)
    assert.equal(canManageCertificates('CANCELLED'), false)

    // Only COMPLETED enables certificate management
    assert.equal(canManageCertificates('COMPLETED'), true)
  })

  test('Already-issued certificates and HTTP 409 conflict handling', async () => {
    let postAttempted = false
    let getAttempted = false

    apiClient.post = async () => {
      postAttempted = true
      const conflictErr = new Error('Certificate has already been issued for this registration.')
      conflictErr.status = 409
      throw conflictErr
    }

    apiClient.get = async (url) => {
      getAttempted = true
      assert.equal(url, '/certificates/registration/75')
      return {
        data: {
          id: 999,
          registrationId: 75,
          status: 'ISSUED',
          certificateUrl: 'https://certs.eventease.com/75',
          issuedAt: '2026-10-10T10:00:00Z',
        },
      }
    }

    try {
      // Simulate handleIssueCertificate 409 Conflict resolution logic
      const regId = 75
      let certificateRecord = null
      let actionSuccessMessage = null

      try {
        const res = await issueCertificate({ registrationId: regId })
        certificateRecord = res.data
      } catch (err) {
        if (err?.status === 409) {
          const fetchRes = await getCertificateByRegistration(regId)
          if (fetchRes.data?.id) {
            certificateRecord = fetchRes.data
            actionSuccessMessage = `Certificate #${certificateRecord.id} is already issued for this attendee.`
          }
        }
      }

      assert.equal(postAttempted, true)
      assert.equal(getAttempted, true)
      assert.notEqual(certificateRecord, null)
      assert.equal(certificateRecord.id, 999)
      assert.equal(certificateRecord.status, 'ISSUED')
      assert.equal(actionSuccessMessage, 'Certificate #999 is already issued for this attendee.')
    } finally {
      apiClient.post = originalPost
      apiClient.get = originalGet
    }
  })

  test('API loading and error states: 404 is NOT_ISSUED, 500 is ERROR', async () => {
    // 404 indicates certificate has not been issued yet
    apiClient.get = async () => {
      const notFoundErr = new Error('Certificate not found for registration id: 99')
      notFoundErr.status = 404
      throw notFoundErr
    }

    try {
      let derivedStatus = null
      try {
        await getCertificateByRegistration(99)
      } catch (err) {
        if (err?.status === 404) {
          derivedStatus = 'NOT_ISSUED'
        } else {
          derivedStatus = 'ERROR'
        }
      }
      assert.equal(derivedStatus, 'NOT_ISSUED', '404 must be derived as NOT_ISSUED')
    } finally {
      apiClient.get = originalGet
    }

    // 500 indicates server error, must NOT be treated as NOT_ISSUED
    apiClient.get = async () => {
      const serverErr = new Error('Database connection failed')
      serverErr.status = 500
      throw serverErr
    }

    try {
      let derivedStatus = null
      try {
        await getCertificateByRegistration(99)
      } catch (err) {
        if (err?.status === 404) {
          derivedStatus = 'NOT_ISSUED'
        } else {
          derivedStatus = 'ERROR'
        }
      }
      assert.equal(derivedStatus, 'ERROR', 'Non-404 error must NOT be derived as NOT_ISSUED')
    } finally {
      apiClient.get = originalGet
    }
  })

  test('Prevention of duplicate submissions and operation-in-progress state tracking', () => {
    let issuingCertificateId = null

    const isIssueButtonDisabled = (regId, attendanceStatus, certStatus) => {
      // Disabled if an operation is in progress, attendance is not PRESENT, or certificate already issued
      if (issuingCertificateId !== null) return true
      if (attendanceStatus !== 'PRESENT') return true
      if (certStatus === 'ISSUED') return true
      return false
    }

    const getIssueButtonLabel = (regId) => {
      if (issuingCertificateId === regId) return 'Issuing...'
      return '🎓 Issue Certificate'
    }

    // Attendance is PRESENT, not issued -> enabled
    assert.equal(isIssueButtonDisabled(10, 'PRESENT', 'NOT_ISSUED'), false)
    assert.equal(getIssueButtonLabel(10), '🎓 Issue Certificate')

    // Start issuing for registration 10
    issuingCertificateId = 10
    assert.equal(isIssueButtonDisabled(10, 'PRESENT', 'NOT_ISSUED'), true)
    assert.equal(getIssueButtonLabel(10), 'Issuing...')

    // Other rows are protected from duplicate concurrent submission
    assert.equal(isIssueButtonDisabled(11, 'PRESENT', 'NOT_ISSUED'), true)
    assert.equal(getIssueButtonLabel(11), '🎓 Issue Certificate')

    // Operation finishes, now ISSUED
    issuingCertificateId = null
    assert.equal(isIssueButtonDisabled(10, 'PRESENT', 'ISSUED'), true)
    assert.equal(isIssueButtonDisabled(11, 'PRESENT', 'NOT_ISSUED'), false)
  })

  test('Participant certificate visibility logic for MyRegistrationsPage', () => {
    const mockRegistrations = [
      { id: 1, eventTitle: 'Hackathon 2026', eventStatus: 'COMPLETED' },
      { id: 2, eventTitle: 'Tech Summit', eventStatus: 'COMPLETED' },
      { id: 3, eventTitle: 'AI Workshop', eventStatus: 'COMPLETED' },
      { id: 4, eventTitle: 'Future Expo', eventStatus: 'PUBLISHED' },
    ]

    const mockCertificatesMap = {
      1: { id: 101, status: 'ISSUED', certificateUrl: 'https://certs.eventease.com/101.pdf', issuedAt: '2026-10-10' },
      2: { id: 102, status: 'ISSUED', certificateUrl: null, issuedAt: '2026-10-10' },
      3: { id: null, status: 'NOT_ISSUED' },
    }

    const deriveCertificateDisplay = (reg) => {
      if (reg.eventStatus !== 'COMPLETED') {
        return { showBadge: false, showBox: false }
      }
      const cert = mockCertificatesMap[reg.id]
      if (cert && cert.status === 'ISSUED') {
        return {
          showBadge: true,
          badgeLabel: `🎓 Certificate #${cert.id}`,
          showBox: true,
          hasLink: Boolean(cert.certificateUrl),
          linkUrl: cert.certificateUrl,
        }
      }
      return {
        showBadge: true,
        badgeLabel: 'Certificate: Not Issued',
        showBox: false,
        hasLink: false,
      }
    }

    // Reg 1: Completed, issued with URL
    const reg1Display = deriveCertificateDisplay(mockRegistrations[0])
    assert.equal(reg1Display.showBadge, true)
    assert.equal(reg1Display.badgeLabel, '🎓 Certificate #101')
    assert.equal(reg1Display.showBox, true)
    assert.equal(reg1Display.hasLink, true)
    assert.equal(reg1Display.linkUrl, 'https://certs.eventease.com/101.pdf')

    // Reg 2: Completed, issued without external URL
    const reg2Display = deriveCertificateDisplay(mockRegistrations[1])
    assert.equal(reg2Display.showBadge, true)
    assert.equal(reg2Display.badgeLabel, '🎓 Certificate #102')
    assert.equal(reg2Display.showBox, true)
    assert.equal(reg2Display.hasLink, false)

    // Reg 3: Completed, not issued
    const reg3Display = deriveCertificateDisplay(mockRegistrations[2])
    assert.equal(reg3Display.showBadge, true)
    assert.equal(reg3Display.badgeLabel, 'Certificate: Not Issued')
    assert.equal(reg3Display.showBox, false)

    // Reg 4: Published event -> no certificate display
    const reg4Display = deriveCertificateDisplay(mockRegistrations[3])
    assert.equal(reg4Display.showBadge, false)
    assert.equal(reg4Display.showBox, false)
  })
})
