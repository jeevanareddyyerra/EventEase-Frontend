import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import {
  getEventsByOrganizer,
  updateEventStatus,
  getEventRegistrationSummary,
  getRegistrationsByEvent,
  updateVolunteerStatus,
  cancelRegistration,
  markAttendance,
  updateAttendance,
  getAttendanceByRegistration,
  issueCertificate,
  getCertificateByRegistration,
} from '../api'
import { formatDate, formatTimeRange, formatDateTime } from '../utils/formatters'

export default function OrganizerDashboardPage() {
  const { user } = useAuth()
  const organizerId = user?.id || user?.userId

  const [events, setEvents] = useState([])
  const [eventSummaries, setEventSummaries] = useState({})
  const [isLoading, setIsLoading] = useState(Boolean(organizerId))
  const [errorMessage, setErrorMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('ALL')
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Status update & cancellation confirmation states
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Roster View states
  const [rosterEvent, setRosterEvent] = useState(null)
  const [rosterRegistrations, setRosterRegistrations] = useState([])
  const [rosterSummary, setRosterSummary] = useState(null)
  const [isRosterLoading, setIsRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState(null)
  const [rosterTypeFilter, setRosterTypeFilter] = useState('ALL')
  const [rosterStatusFilter, setRosterStatusFilter] = useState('ALL')
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterPage, setRosterPage] = useState(0)
  const [rosterPageSize, setRosterPageSize] = useState(10)
  const [updatingRosterId, setUpdatingRosterId] = useState(null)
  const [rosterActionSuccess, setRosterActionSuccess] = useState(null)
  const [rosterActionError, setRosterActionError] = useState(null)
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0)

  // Attendance management states
  const [attendanceMap, setAttendanceMap] = useState({})
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState(null)
  const [updatingAttendanceAction, setUpdatingAttendanceAction] = useState(null)

  // Certificate management states
  const [certificateMap, setCertificateMap] = useState({})
  const [issuingCertificateId, setIssuingCertificateId] = useState(null)

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setFetchTrigger((prev) => prev + 1)
  }

  // Fetch organizer-scoped events from the backend
  useEffect(() => {
    if (!organizerId) return

    let isMounted = true

    getEventsByOrganizer(organizerId)
      .then((response) => {
        if (!isMounted) return
        if (Array.isArray(response.data)) {
          // Sort newest first by date or createdAt
          const sorted = [...response.data].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0)
          })
          setEvents(sorted)
        } else {
          setEvents([])
        }
        setErrorMessage(null)
      })
      .catch((err) => {
        if (!isMounted) return
        setErrorMessage(err?.message || 'Failed to load your organized events.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [organizerId, fetchTrigger])

  // Fetch registration summaries for all events on dashboard
  useEffect(() => {
    if (!events.length) return
    let isMounted = true

    Promise.allSettled(
      events.map((ev) =>
        getEventRegistrationSummary(ev.id).then((res) => ({ id: ev.id, summary: res.data }))
      )
    ).then((results) => {
      if (!isMounted) return
      const map = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.id] = r.value.summary
        }
      })
      setEventSummaries((prev) => ({ ...prev, ...map }))
    })

    return () => {
      isMounted = false
    }
  }, [events])

  // Attendance retrieval helpers
  const fetchSingleAttendance = async (regId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [regId]: {
        attendanceId: prev[regId]?.attendanceId || null,
        status: 'LOADING',
        attended: null,
        isLoading: true,
        error: null,
      },
    }))
    try {
      const res = await getAttendanceByRegistration(regId)
      const att = res.data
      setAttendanceMap((prev) => ({
        ...prev,
        [regId]: {
          attendanceId: att.id,
          status: att.attended ? 'PRESENT' : 'ABSENT',
          attended: att.attended,
          isLoading: false,
          error: null,
        },
      }))
    } catch (err) {
      if (err?.status === 404) {
        setAttendanceMap((prev) => ({
          ...prev,
          [regId]: {
            attendanceId: null,
            status: 'NOT_MARKED',
            attended: null,
            isLoading: false,
            error: null,
          },
        }))
      } else {
        setAttendanceMap((prev) => ({
          ...prev,
          [regId]: {
            attendanceId: null,
            status: 'ERROR',
            attended: null,
            isLoading: false,
            error: err?.message || 'Failed to load attendance record',
          },
        }))
      }
    }
  }

  const fetchAttendanceForRoster = async (list) => {
    if (!Array.isArray(list) || list.length === 0) return

    setAttendanceMap((prev) => {
      const next = { ...prev }
      list.forEach((reg) => {
        if (reg.status === 'CANCELLED' || reg.status === 'REJECTED') {
          next[reg.id] = {
            attendanceId: null,
            status: 'NOT_APPLICABLE',
            attended: null,
            isLoading: false,
            error: null,
          }
        } else if (!next[reg.id] || next[reg.id].status === 'ERROR') {
          next[reg.id] = {
            attendanceId: null,
            status: 'LOADING',
            attended: null,
            isLoading: true,
            error: null,
          }
        }
      })
      return next
    })

    const activeList = list.filter((r) => r.status === 'REGISTERED' || r.status === 'ACCEPTED')

    await Promise.allSettled(
      activeList.map(async (reg) => {
        try {
          const res = await getAttendanceByRegistration(reg.id)
          const att = res.data
          setAttendanceMap((prev) => ({
            ...prev,
            [reg.id]: {
              attendanceId: att.id,
              status: att.attended ? 'PRESENT' : 'ABSENT',
              attended: att.attended,
              isLoading: false,
              error: null,
            },
          }))
        } catch (err) {
          if (err?.status === 404) {
            setAttendanceMap((prev) => ({
              ...prev,
              [reg.id]: {
                attendanceId: null,
                status: 'NOT_MARKED',
                attended: null,
                isLoading: false,
                error: null,
              },
            }))
          } else {
            setAttendanceMap((prev) => ({
              ...prev,
              [reg.id]: {
                attendanceId: null,
                status: 'ERROR',
                attended: null,
                isLoading: false,
                error: err?.message || 'Failed to load attendance record',
              },
            }))
          }
        }
      })
    )
  }

  const fetchSingleCertificate = async (regId) => {
    setCertificateMap((prev) => ({
      ...prev,
      [regId]: {
        certificateId: null,
        status: 'LOADING',
        certificateUrl: null,
        issuedAt: null,
        isLoading: true,
        error: null,
      },
    }))
    try {
      const res = await getCertificateByRegistration(regId)
      const cert = res.data
      setCertificateMap((prev) => ({
        ...prev,
        [regId]: {
          certificateId: cert.id,
          status: cert.status || 'ISSUED',
          certificateUrl: cert.certificateUrl,
          issuedAt: cert.issuedAt,
          isLoading: false,
          error: null,
        },
      }))
    } catch (err) {
      if (err?.status === 404) {
        setCertificateMap((prev) => ({
          ...prev,
          [regId]: {
            certificateId: null,
            status: 'NOT_ISSUED',
            certificateUrl: null,
            issuedAt: null,
            isLoading: false,
            error: null,
          },
        }))
      } else {
        setCertificateMap((prev) => ({
          ...prev,
          [regId]: {
            certificateId: null,
            status: 'ERROR',
            certificateUrl: null,
            issuedAt: null,
            isLoading: false,
            error: err?.message || 'Failed to load certificate record',
          },
        }))
      }
    }
  }

  const fetchCertificatesForRoster = async (list) => {
    if (!Array.isArray(list) || list.length === 0) return

    setCertificateMap((prev) => {
      const next = { ...prev }
      list.forEach((reg) => {
        if (reg.status === 'CANCELLED' || reg.status === 'REJECTED') {
          next[reg.id] = {
            certificateId: null,
            status: 'NOT_APPLICABLE',
            certificateUrl: null,
            issuedAt: null,
            isLoading: false,
            error: null,
          }
        } else if (!next[reg.id] || next[reg.id].status === 'ERROR') {
          next[reg.id] = {
            certificateId: null,
            status: 'LOADING',
            certificateUrl: null,
            issuedAt: null,
            isLoading: true,
            error: null,
          }
        }
      })
      return next
    })

    const activeList = list.filter((r) => r.status === 'REGISTERED' || r.status === 'ACCEPTED')

    await Promise.allSettled(
      activeList.map(async (reg) => {
        try {
          const res = await getCertificateByRegistration(reg.id)
          const cert = res.data
          setCertificateMap((prev) => ({
            ...prev,
            [reg.id]: {
              certificateId: cert.id,
              status: cert.status || 'ISSUED',
              certificateUrl: cert.certificateUrl,
              issuedAt: cert.issuedAt,
              isLoading: false,
              error: null,
            },
          }))
        } catch (err) {
          if (err?.status === 404) {
            setCertificateMap((prev) => ({
              ...prev,
              [reg.id]: {
                certificateId: null,
                status: 'NOT_ISSUED',
                certificateUrl: null,
                issuedAt: null,
                isLoading: false,
                error: null,
              },
            }))
          } else {
            setCertificateMap((prev) => ({
              ...prev,
              [reg.id]: {
                certificateId: null,
                status: 'ERROR',
                certificateUrl: null,
                issuedAt: null,
                isLoading: false,
                error: err?.message || 'Failed to load certificate record',
              },
            }))
          }
        }
      })
    )
  }

  // Fetch roster data when rosterEvent, filters, or refresh key change
  useEffect(() => {
    if (!rosterEvent) return
    let isMounted = true

    Promise.resolve().then(() => {
      if (isMounted) {
        setIsRosterLoading(true)
        setRosterError(null)
      }
    })

    Promise.allSettled([
      getRegistrationsByEvent(rosterEvent.id, {
        type: rosterTypeFilter,
        status: rosterStatusFilter,
      }),
      getEventRegistrationSummary(rosterEvent.id),
    ]).then(([rosterResult, summaryResult]) => {
      if (!isMounted) return
      if (rosterResult.status === 'fulfilled') {
        const raw = rosterResult.value.data
        const list = Array.isArray(raw) ? raw : (raw?.content || [])
        setRosterRegistrations(list)
        if (rosterEvent.status === 'PUBLISHED' || rosterEvent.status === 'COMPLETED') {
          fetchAttendanceForRoster(list)
        }
        if (rosterEvent.status === 'COMPLETED') {
          fetchCertificatesForRoster(list)
        }
      } else {
        setRosterError(rosterResult.reason?.message || 'Failed to load attendee roster.')
      }

      if (summaryResult.status === 'fulfilled') {
        setRosterSummary(summaryResult.value.data)
        setEventSummaries((prev) => ({ ...prev, [rosterEvent.id]: summaryResult.value.data }))
      }
      setIsRosterLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [rosterEvent, rosterTypeFilter, rosterStatusFilter, rosterRefreshKey])

  const handleRefreshRoster = () => {
    setAttendanceMap({})
    setCertificateMap({})
    setRosterRefreshKey((k) => k + 1)
  }

  const handleOpenRoster = (event) => {
    setRosterEvent(event)
    setRosterTypeFilter('ALL')
    setRosterStatusFilter('ALL')
    setRosterSearch('')
    setRosterPage(0)
    setRosterActionSuccess(null)
    setRosterActionError(null)
    setAttendanceMap({})
    setCertificateMap({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCloseRoster = () => {
    setRosterEvent(null)
    setRosterRegistrations([])
    setRosterSummary(null)
    setRosterActionSuccess(null)
    setRosterActionError(null)
    setAttendanceMap({})
    setCertificateMap({})
    setUpdatingAttendanceId(null)
    setUpdatingAttendanceAction(null)
    setIssuingCertificateId(null)
  }

  // Handle status transition (e.g. APPROVED -> PUBLISHED, or PUBLISHED -> COMPLETED)
  const handleTransitionStatus = async (eventId, newStatus) => {
    setUpdatingStatusId(eventId)
    setActionError(null)
    setActionSuccess(null)

    try {
      const response = await updateEventStatus(eventId, newStatus)
      const updated = response.data

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: updated.status } : e))
      )
      setConfirmCancelId(null)
      setActionSuccess(`Event #${eventId} status successfully updated to ${newStatus}.`)
    } catch (err) {
      setActionError(err?.message || `Failed to update status to ${newStatus}.`)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Handle volunteer approval / rejection in roster
  const handleUpdateVolunteer = async (regId, newStatus) => {
    setUpdatingRosterId(regId)
    setRosterActionError(null)
    setRosterActionSuccess(null)

    try {
      await updateVolunteerStatus(regId, newStatus)
      setRosterActionSuccess(`Volunteer registration #${regId} successfully marked as ${newStatus}.`)
      handleRefreshRoster()
    } catch (err) {
      setRosterActionError(err?.message || `Failed to update volunteer status to ${newStatus}.`)
    } finally {
      setUpdatingRosterId(null)
    }
  }

  // Handle cancellation of attendee registration in roster
  const handleCancelAttendee = async (regId) => {
    setUpdatingRosterId(regId)
    setRosterActionError(null)
    setRosterActionSuccess(null)

    try {
      await cancelRegistration(regId)
      setRosterActionSuccess(`Registration #${regId} has been successfully cancelled.`)
      handleRefreshRoster()
    } catch (err) {
      setRosterActionError(err?.message || `Failed to cancel registration #${regId}.`)
    } finally {
      setUpdatingRosterId(null)
    }
  }

  // Handle marking / updating attendee attendance in roster
  const handleMarkAttendance = async (reg, shouldBeAttended) => {
    if (!reg || !reg.id) return
    if (updatingAttendanceId !== null) return

    const regId = reg.id
    const currentAtt = attendanceMap[regId]

    // Prevent redundant toggle if already in desired state
    if (currentAtt?.status === (shouldBeAttended ? 'PRESENT' : 'ABSENT')) {
      return
    }

    setUpdatingAttendanceId(regId)
    setUpdatingAttendanceAction(shouldBeAttended)
    setRosterActionError(null)
    setRosterActionSuccess(null)

    const attendeeName = reg.userName || `User #${reg.userId}` || `Reg #${regId}`
    const targetLabel = shouldBeAttended ? 'PRESENT' : 'ABSENT'

    try {
      let resultAtt = null

      if (currentAtt?.attendanceId) {
        // Attendance record exists -> PUT /api/attendance/{id}
        const res = await updateAttendance(currentAtt.attendanceId, { attended: shouldBeAttended })
        resultAtt = res.data
      } else {
        // No attendance record -> POST /api/attendance
        try {
          const res = await markAttendance({ registrationId: regId, attended: shouldBeAttended })
          resultAtt = res.data
        } catch (postErr) {
          // If 409 Conflict occurred (record was created concurrently), fetch and update via PUT
          if (postErr?.status === 409) {
            const fetchRes = await getAttendanceByRegistration(regId)
            if (fetchRes.data?.id) {
              const updateRes = await updateAttendance(fetchRes.data.id, { attended: shouldBeAttended })
              resultAtt = updateRes.data
            } else {
              throw postErr
            }
          } else {
            throw postErr
          }
        }
      }

      const newStatus = resultAtt.attended ? 'PRESENT' : 'ABSENT'
      setAttendanceMap((prev) => ({
        ...prev,
        [regId]: {
          attendanceId: resultAtt.id,
          status: newStatus,
          attended: resultAtt.attended,
          isLoading: false,
          error: null,
        },
      }))

      setRosterActionSuccess(
        `Attendance for ${attendeeName} (#${regId}) successfully marked as ${newStatus}.`
      )
    } catch (err) {
      setRosterActionError(
        err?.message || `Failed to mark attendance as ${targetLabel} for ${attendeeName}.`
      )
    } finally {
      setUpdatingAttendanceId(null)
      setUpdatingAttendanceAction(null)
    }
  }

  // Handle certificate issuance for an attended participant in a COMPLETED event
  const handleIssueCertificate = async (reg) => {
    const regId = reg.id
    const attendeeName = reg.userName || `Attendee #${regId}`

    if (rosterEvent?.status !== 'COMPLETED') {
      setRosterActionError('Certificates can only be issued for COMPLETED events.')
      return
    }

    const currentAtt = attendanceMap[regId]
    if (!currentAtt || currentAtt.status !== 'PRESENT') {
      setRosterActionError(`Cannot issue certificate: ${attendeeName} must be marked as PRESENT first.`)
      return
    }

    if (issuingCertificateId !== null) return

    setIssuingCertificateId(regId)
    setRosterActionError(null)
    setRosterActionSuccess(null)

    try {
      const res = await issueCertificate({ registrationId: regId })
      const cert = res.data

      setCertificateMap((prev) => ({
        ...prev,
        [regId]: {
          certificateId: cert.id,
          status: cert.status || 'ISSUED',
          certificateUrl: cert.certificateUrl,
          issuedAt: cert.issuedAt,
          isLoading: false,
          error: null,
        },
      }))

      setRosterActionSuccess(
        `Certificate #${cert.id} successfully issued for ${attendeeName}.`
      )
    } catch (err) {
      if (err?.status === 409) {
        // HTTP 409 Conflict: Certificate was already issued. Refresh the record rather than issuing repeatedly.
        try {
          const fetchRes = await getCertificateByRegistration(regId)
          if (fetchRes.data?.id) {
            const cert = fetchRes.data
            setCertificateMap((prev) => ({
              ...prev,
              [regId]: {
                certificateId: cert.id,
                status: cert.status || 'ISSUED',
                certificateUrl: cert.certificateUrl,
                issuedAt: cert.issuedAt,
                isLoading: false,
                error: null,
              },
            }))
            setRosterActionSuccess(
              `Certificate #${cert.id} is already issued for ${attendeeName}.`
            )
          } else {
            setRosterActionError(err?.message || `Certificate already issued for ${attendeeName}.`)
          }
        } catch {
          setRosterActionError(err?.message || `Certificate already issued for ${attendeeName}.`)
        }
      } else {
        setRosterActionError(
          err?.message || `Failed to issue certificate for ${attendeeName}.`
        )
      }
    } finally {
      setIssuingCertificateId(null)
    }
  }

  // Filter events by tab
  const filteredEvents = useMemo(() => {
    if (activeTab === 'ALL') return events
    return events.filter((e) => e.status === activeTab)
  }, [events, activeTab])

  // Filter roster by client-side search keyword
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return rosterRegistrations
    const term = rosterSearch.toLowerCase().trim()
    return rosterRegistrations.filter((reg) => {
      const name = (reg.userName || '').toLowerCase()
      const email = (reg.userEmail || '').toLowerCase()
      const idStr = String(reg.id || '')
      return name.includes(term) || email.includes(term) || idStr.includes(term)
    })
  }, [rosterRegistrations, rosterSearch])

  const totalRosterPages = Math.ceil(filteredRoster.length / rosterPageSize) || 1

  const paginatedRoster = useMemo(() => {
    const start = rosterPage * rosterPageSize
    return filteredRoster.slice(start, start + rosterPageSize)
  }, [filteredRoster, rosterPage, rosterPageSize])

  // Metrics summary
  const metrics = useMemo(() => {
    return {
      total: events.length,
      pending: events.filter((e) => e.status === 'PENDING').length,
      approved: events.filter((e) => e.status === 'APPROVED').length,
      published: events.filter((e) => e.status === 'PUBLISHED').length,
      completed: events.filter((e) => e.status === 'COMPLETED').length,
      cancelled: events.filter((e) => e.status === 'CANCELLED').length,
    }
  }, [events])

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return 'badge-success'
      case 'APPROVED':
        return 'badge-accent'
      case 'COMPLETED':
        return 'badge-secondary'
      case 'CANCELLED':
        return 'badge-error'
      case 'PENDING':
      default:
        return 'badge-warning'
    }
  }

  const getRegistrationStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return 'badge-success'
      case 'REGISTERED':
        return 'badge-warning'
      case 'CANCELLED':
        return 'badge-error'
      case 'REJECTED':
      default:
        return 'badge-secondary'
    }
  }

  const canManageAttendance =
    rosterEvent?.status === 'PUBLISHED' || rosterEvent?.status === 'COMPLETED'

  const canManageCertificates = rosterEvent?.status === 'COMPLETED'

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {/* Navigation Breadcrumb */}
        <div className="event-breadcrumb">
          <Link to="/home" className="back-link">
            &larr; Back to Home
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          {rosterEvent ? (
            <>
              <button
                type="button"
                className="back-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                onClick={handleCloseRoster}
              >
                Organizer Event Workspace
              </button>
              <span style={{ color: 'var(--border)' }}>/</span>
              <span style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                {rosterEvent.title} (Roster)
              </span>
            </>
          ) : (
            <Link to="/events" className="back-link">
              Public Events Catalog
            </Link>
          )}
        </div>

        {/* Page Header */}
        <div className="events-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 className="events-page-title" style={{ margin: 0 }}>
                {rosterEvent ? `Attendee Roster: ${rosterEvent.title}` : 'Organizer Event Workspace'}
              </h1>
              <span className="badge badge-role">ORGANIZER</span>
              {rosterEvent && (
                <span className={`badge ${getStatusBadgeClass(rosterEvent.status)}`}>
                  {rosterEvent.status}
                </span>
              )}
            </div>
            <p className="events-page-subtitle">
              {rosterEvent
                ? `Review registered attendees and volunteers, confirm volunteer applications, and inspect metrics for Event #${rosterEvent.id}.`
                : 'Manage your organized event proposals, review participant/volunteer counts, and manage event lifecycles.'}
            </p>
          </div>
          {rosterEvent ? (
            <button type="button" className="btn btn-secondary btn-large" onClick={handleCloseRoster}>
              &larr; Back to All Events
            </button>
          ) : (
            <Link to="/organizer/events/new" className="btn btn-primary btn-large">
              + Create New Event
            </Link>
          )}
        </div>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div
            className="alert alert-success"
            role="status"
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setActionSuccess(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="alert-icon" aria-hidden="true">⚠</span>
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setActionError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ROSTER VIEW: When an event's roster is opened */}
        {rosterEvent ? (
          <section className="roster-card" aria-label="Event Attendee Roster">
            {/* Roster Header & Meta Details */}
            <div className="roster-meta-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-accent">{rosterEvent.category || 'General'}</span>
                  <span className="badge badge-secondary">ID: #{rosterEvent.id}</span>
                  <span className={`badge ${getStatusBadgeClass(rosterEvent.status)}`}>
                    {rosterEvent.status}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                  📅 {formatDate(rosterEvent.date)} &bull; ⏰ {formatTimeRange(rosterEvent.startTime, rosterEvent.endTime)} &bull; 📍 {rosterEvent.venue || 'TBA'} &bull; 👥 Capacity: {rosterEvent.capacity != null ? `${rosterEvent.capacity} Max` : 'Open'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRefreshRoster}
                  disabled={isRosterLoading}
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseRoster}
                >
                  ✕ Close Roster
                </button>
              </div>
            </div>

            {/* Real-time Metrics Summary Pills */}
            {rosterSummary && (
              <div className="roster-summary-grid">
                <div className="roster-summary-pill">
                  <span className="val">{rosterSummary.totalRegistrations}</span>
                  <span className="lbl">Total Registrations</span>
                </div>
                <div className="roster-summary-pill">
                  <span className="val" style={{ color: 'var(--accent)' }}>{rosterSummary.participantCount}</span>
                  <span className="lbl">Participants</span>
                </div>
                <div className="roster-summary-pill">
                  <span className="val" style={{ color: '#6366f1' }}>{rosterSummary.volunteerCount}</span>
                  <span className="lbl">Volunteers</span>
                </div>
                <div className="roster-summary-pill">
                  <span className="val" style={{ color: '#f59e0b' }}>{rosterSummary.registeredCount}</span>
                  <span className="lbl">Pending Reg</span>
                </div>
                <div className="roster-summary-pill">
                  <span className="val" style={{ color: '#10b981' }}>{rosterSummary.acceptedCount}</span>
                  <span className="lbl">Accepted</span>
                </div>
                <div className="roster-summary-pill">
                  <span className="val" style={{ color: '#ef4444' }}>{rosterSummary.cancelledCount}</span>
                  <span className="lbl">Cancelled</span>
                </div>
                {rosterSummary.rejectedCount > 0 && (
                  <div className="roster-summary-pill">
                    <span className="val" style={{ color: '#94a3b8' }}>{rosterSummary.rejectedCount}</span>
                    <span className="lbl">Rejected</span>
                  </div>
                )}
              </div>
            )}

            {/* Roster-level Action Alerts */}
            {rosterActionSuccess && (
              <div
                className="alert alert-success"
                role="status"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="alert-icon" aria-hidden="true">✓</span>
                  <span>{rosterActionSuccess}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                  onClick={() => setRosterActionSuccess(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {rosterActionError && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="alert-icon" aria-hidden="true">⚠</span>
                  <span>{rosterActionError}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                  onClick={() => setRosterActionError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filters & Search Row */}
            <div className="events-filter-row" style={{ marginTop: '0.25rem' }}>
              <div className="events-search-wrapper" style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Filter attendee by name or reg #..."
                  value={rosterSearch}
                  onChange={(e) => {
                    setRosterSearch(e.target.value)
                    setRosterPage(0)
                  }}
                  aria-label="Filter attendee by name or registration ID"
                />
              </div>

              <div className="events-filter-group">
                <label htmlFor="roster-type-select" className="filter-label">
                  Type
                </label>
                <select
                  id="roster-type-select"
                  className="filter-select"
                  value={rosterTypeFilter}
                  onChange={(e) => {
                    setRosterTypeFilter(e.target.value)
                    setRosterPage(0)
                  }}
                >
                  <option value="ALL">All Types</option>
                  <option value="PARTICIPANT">Participants Only</option>
                  <option value="VOLUNTEER">Volunteers Only</option>
                </select>
              </div>

              <div className="events-filter-group">
                <label htmlFor="roster-status-select" className="filter-label">
                  Status
                </label>
                <select
                  id="roster-status-select"
                  className="filter-select"
                  value={rosterStatusFilter}
                  onChange={(e) => {
                    setRosterStatusFilter(e.target.value)
                    setRosterPage(0)
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="events-filter-group">
                <label htmlFor="roster-per-page" className="filter-label">
                  Per Page
                </label>
                <select
                  id="roster-per-page"
                  className="filter-select"
                  value={rosterPageSize}
                  onChange={(e) => {
                    setRosterPageSize(Number(e.target.value))
                    setRosterPage(0)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Roster Loading / Error / Table Content */}
            {isRosterLoading ? (
              <div className="auth-loading-screen" role="status" style={{ minHeight: '160px' }}>
                <span className="auth-spinner" aria-hidden="true"></span>
                <p>Loading registrations roster...</p>
              </div>
            ) : rosterError ? (
              <div className="connection-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                <span style={{ fontSize: '2rem' }} aria-hidden="true">⚠</span>
                <h3 style={{ margin: '0.5rem 0' }}>Failed to Load Roster</h3>
                <p className="hero-description" style={{ margin: '0 auto 1.25rem', maxWidth: '400px' }}>
                  {rosterError}
                </p>
                <button type="button" className="btn btn-primary" onClick={handleRefreshRoster}>
                  Retry Loading
                </button>
              </div>
            ) : paginatedRoster.length === 0 ? (
              <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }} aria-hidden="true">👥</span>
                <h3 style={{ margin: '0.5rem 0' }}>
                  {rosterRegistrations.length === 0 ? 'No Registrations Recorded Yet' : 'No Matching Registrations'}
                </h3>
                <p className="hero-description" style={{ margin: '0 auto 1rem', maxWidth: '440px' }}>
                  {rosterRegistrations.length === 0
                    ? 'There are currently no attendees or volunteers registered for this event.'
                    : 'No attendee registrations match your search and filter criteria.'}
                </p>
                {rosterRegistrations.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setRosterTypeFilter('ALL')
                      setRosterStatusFilter('ALL')
                      setRosterSearch('')
                      setRosterPage(0)
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Roster Table */}
                <div className="roster-table-container">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th scope="col">Reg #</th>
                        <th scope="col">Attendee</th>
                        <th scope="col">Type</th>
                        <th scope="col">Status</th>
                        <th scope="col">Registered At</th>
                        {canManageAttendance && <th scope="col">Attendance</th>}
                        {canManageCertificates && <th scope="col">Certificate</th>}
                        <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoster.map((reg) => {
                        const isProcessingThis = updatingRosterId === reg.id
                        const isProcessingAttendance = updatingAttendanceId === reg.id
                        const isIssuingCert = issuingCertificateId === reg.id
                        const att = attendanceMap[reg.id]
                        const cert = certificateMap[reg.id]
                        const isInactive = reg.status === 'CANCELLED' || reg.status === 'REJECTED'
                        const isPresent = att?.status === 'PRESENT'
                        return (
                          <tr key={reg.id}>
                            <td>
                              <span className="badge badge-secondary">#{reg.id}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ color: 'var(--text-h)' }}>
                                  {reg.userName || `User #${reg.userId}`}
                                </strong>
                                {reg.userEmail && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                                    {reg.userEmail}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${reg.type === 'VOLUNTEER' ? 'badge-role' : 'badge-accent'}`}>
                                {reg.type}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getRegistrationStatusBadge(reg.status)}`}>
                                {reg.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {formatDateTime(reg.registeredAt)}
                              </span>
                            </td>
                            {canManageAttendance && (
                              <td>
                                {isInactive ? (
                                  <span
                                    className="badge badge-secondary"
                                    title="Attendance cannot be marked for cancelled or rejected registrations"
                                  >
                                    N/A
                                  </span>
                                ) : !att || att.isLoading ? (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                                    Loading...
                                  </span>
                                ) : att.status === 'ERROR' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span className="badge badge-error" title={att.error || 'Failed to load attendance'}>
                                      Error
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small"
                                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                                      onClick={() => fetchSingleAttendance(reg.id)}
                                      title="Retry loading attendance"
                                    >
                                      ↻
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <div>
                                      {att.status === 'PRESENT' && (
                                        <span className="badge badge-success">PRESENT</span>
                                      )}
                                      {att.status === 'ABSENT' && (
                                        <span className="badge badge-error">ABSENT</span>
                                      )}
                                      {att.status === 'NOT_MARKED' && (
                                        <span className="badge badge-secondary">NOT MARKED</span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-small"
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                        disabled={updatingAttendanceId !== null || att.status === 'PRESENT'}
                                        onClick={() => handleMarkAttendance(reg, true)}
                                        title="Mark attendee as Present"
                                      >
                                        {isProcessingAttendance && updatingAttendanceAction === 'PRESENT'
                                          ? 'Marking...'
                                          : 'Mark Present'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-small"
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                        disabled={updatingAttendanceId !== null || att.status === 'ABSENT'}
                                        onClick={() => handleMarkAttendance(reg, false)}
                                        title="Mark attendee as Absent"
                                      >
                                        {isProcessingAttendance && updatingAttendanceAction === 'ABSENT'
                                          ? 'Marking...'
                                          : 'Mark Absent'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            )}
                            {canManageCertificates && (
                              <td>
                                {isInactive ? (
                                  <span
                                    className="badge badge-secondary"
                                    title="Certificates cannot be issued for cancelled or rejected registrations"
                                  >
                                    N/A
                                  </span>
                                ) : !cert || cert.isLoading ? (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                                    Loading...
                                  </span>
                                ) : cert.status === 'ERROR' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span className="badge badge-error" title={cert.error || 'Failed to load certificate'}>
                                      Error
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small"
                                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                                      onClick={() => fetchSingleCertificate(reg.id)}
                                      title="Retry loading certificate"
                                    >
                                      ↻
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      {cert.status === 'ISSUED' ? (
                                        <>
                                          <span className="badge badge-success">ISSUED</span>
                                          {cert.certificateId && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
                                              #{cert.certificateId}
                                            </span>
                                          )}
                                          {cert.certificateUrl && (
                                            <a
                                              href={cert.certificateUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="btn btn-secondary btn-small"
                                              style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }}
                                              title="Open certificate document"
                                            >
                                              🔗 Open
                                            </a>
                                          )}
                                        </>
                                      ) : (
                                        <span className="badge badge-secondary">NOT ISSUED</span>
                                      )}
                                    </div>
                                    {cert.status !== 'ISSUED' && (
                                      <div>
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-small"
                                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                          disabled={
                                            issuingCertificateId !== null ||
                                            !isPresent ||
                                            isInactive
                                          }
                                          onClick={() => handleIssueCertificate(reg)}
                                          title={
                                            !isPresent
                                              ? 'Attendance must be marked PRESENT before issuing certificate'
                                              : 'Issue certificate of completion'
                                          }
                                        >
                                          {isIssuingCert ? 'Issuing...' : '🎓 Issue Certificate'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                            <td style={{ textAlign: 'right' }}>
                              <div className="roster-actions-cell" style={{ justifyContent: 'flex-end' }}>
                                {/* Volunteer Review Actions */}
                                {reg.type === 'VOLUNTEER' && reg.status === 'REGISTERED' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-small"
                                      disabled={isProcessingThis}
                                      onClick={() => handleUpdateVolunteer(reg.id, 'ACCEPTED')}
                                      title="Accept Volunteer"
                                    >
                                      {isProcessingThis ? '...' : '✓ Accept'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-small"
                                      disabled={isProcessingThis}
                                      onClick={() => handleUpdateVolunteer(reg.id, 'REJECTED')}
                                      title="Reject Volunteer"
                                    >
                                      {isProcessingThis ? '...' : '✕ Reject'}
                                    </button>
                                  </>
                                )}

                                {/* Cancel Active Registration */}
                                {(reg.status === 'REGISTERED' || reg.status === 'ACCEPTED') && (
                                  <button
                                    type="button"
                                    className="btn btn-cancel-reg btn-small"
                                    disabled={isProcessingThis}
                                    onClick={() => handleCancelAttendee(reg.id)}
                                    title="Cancel Attendee Registration"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="events-pagination-bar" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={rosterPage === 0}
                    onClick={() => setRosterPage((prev) => Math.max(0, prev - 1))}
                  >
                    &larr; Previous
                  </button>
                  <span className="pagination-info">
                    Page {rosterPage + 1} of {totalRosterPages || 1} ({filteredRoster.length} total)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={rosterPage >= totalRosterPages - 1}
                    onClick={() => setRosterPage((prev) => prev + 1)}
                  >
                    Next &rarr;
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          /* DASHBOARD VIEW: Events Overview & Cards */
          <>
            {/* Workspace Overview Metrics */}
            <div className="organizer-metrics-row">
              <div className="organizer-metric-card">
                <span className="metric-label">Total Events</span>
                <span className="metric-value">{metrics.total}</span>
              </div>
              <div className="organizer-metric-card">
                <span className="metric-label">Published (Active)</span>
                <span className="metric-value" style={{ color: '#10b981' }}>{metrics.published}</span>
              </div>
              <div className="organizer-metric-card">
                <span className="metric-label">Approved (Ready to Publish)</span>
                <span className="metric-value" style={{ color: '#6366f1' }}>{metrics.approved}</span>
              </div>
              <div className="organizer-metric-card">
                <span className="metric-label">Pending Approval</span>
                <span className="metric-value" style={{ color: '#f59e0b' }}>{metrics.pending}</span>
              </div>
              <div className="organizer-metric-card">
                <span className="metric-label">Completed</span>
                <span className="metric-value" style={{ color: '#94a3b8' }}>{metrics.completed}</span>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="auth-loading-screen" role="status">
                <span className="auth-spinner" aria-hidden="true"></span>
                <p>Loading your organized events...</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <span style={{ fontSize: '2.5rem' }} aria-hidden="true">⚠</span>
                <h2 style={{ margin: '0.75rem 0 0.25rem' }}>Unable to Load Organized Events</h2>
                <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '440px' }}>
                  {errorMessage}
                </p>
                <button type="button" className="btn btn-primary" onClick={handleRetry}>
                  Retry Loading
                </button>
              </div>
            )}

            {/* Loaded Content */}
            {!isLoading && !errorMessage && (
              <>
                {/* Filter Tabs */}
                <div className="my-reg-tabs-bar" style={{ marginTop: '1.5rem' }}>
                  <div className="my-reg-tabs">
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'ALL' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('ALL')}
                    >
                      All ({metrics.total})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'PUBLISHED' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('PUBLISHED')}
                    >
                      Published ({metrics.published})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'APPROVED' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('APPROVED')}
                    >
                      Approved ({metrics.approved})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'PENDING' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('PENDING')}
                    >
                      Pending Review ({metrics.pending})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'COMPLETED' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('COMPLETED')}
                    >
                      Completed ({metrics.completed})
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'CANCELLED' ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab('CANCELLED')}
                    >
                      Cancelled ({metrics.cancelled})
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {events.length === 0 ? (
                  <div className="connection-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    <span style={{ fontSize: '2.75rem' }} aria-hidden="true">📅</span>
                    <h2 style={{ margin: '0.75rem 0 0.25rem' }}>No Events Created Yet</h2>
                    <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '480px' }}>
                      You have not submitted any event proposals yet. Create your first event now
                      to coordinate attendees and volunteers!
                    </p>
                    <Link to="/organizer/events/new" className="btn btn-primary btn-large">
                      + Create Your First Event
                    </Link>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="connection-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
                    <span style={{ fontSize: '2rem' }} aria-hidden="true">🔍</span>
                    <h3 style={{ margin: '0.5rem 0 0.25rem' }}>
                      No {activeTab.toLowerCase()} events found
                    </h3>
                    <p className="hero-description" style={{ margin: '0 auto 1rem', maxWidth: '400px' }}>
                      There are no organized events currently in this status.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('ALL')}
                    >
                      View All Events
                    </button>
                  </div>
                ) : (
                  /* Events List */
                  <div className="organizer-events-list">
                    {filteredEvents.map((ev) => {
                      const isProcessing = updatingStatusId === ev.id
                      const isConfirmingCancel = confirmCancelId === ev.id
                      const canEdit =
                        ev.status === 'PENDING' || ev.status === 'APPROVED' || ev.status === 'PUBLISHED'
                      const summary = eventSummaries[ev.id]

                      return (
                        <article key={ev.id} className="organizer-event-card">
                          {ev.imageUrl && (
                            <div
                              style={{
                                width: '100%',
                                maxHeight: '140px',
                                overflow: 'hidden',
                                borderRadius: '6px 6px 0 0',
                                marginBottom: '0.75rem',
                                borderBottom: '1px solid var(--border)',
                              }}
                            >
                              <img
                                src={ev.imageUrl}
                                alt={ev.title}
                                style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="organizer-event-main">
                            <div>
                              <div className="organizer-card-badges">
                                <span className="badge badge-accent">
                                  {ev.category || 'General'}
                                </span>
                                <span className={`badge ${getStatusBadgeClass(ev.status)}`}>
                                  {ev.status}
                                </span>
                                <span className="badge badge-secondary">
                                  ID: #{ev.id}
                                </span>
                              </div>

                              <h2 className="organizer-event-title">
                                <Link to={`/events/${ev.id}`} className="my-reg-title-link">
                                  {ev.title}
                                </Link>
                              </h2>

                              {ev.description && (
                                <p className="organizer-event-desc">
                                  {ev.description}
                                </p>
                              )}
                            </div>

                            {/* Event Metadata Chips */}
                            <div className="organizer-meta-chips">
                              <span className="meta-chip">
                                📅 {formatDate(ev.date)}
                              </span>
                              <span className="meta-chip">
                                ⏰ {formatTimeRange(ev.startTime, ev.endTime)}
                              </span>
                              <span className="meta-chip">
                                📍 {ev.venue || 'TBA'}
                              </span>
                              <span className="meta-chip">
                                👥 {ev.capacity != null ? `${ev.capacity} Max` : 'Open'}
                              </span>
                              {ev.registrationDeadline && (
                                <span className="meta-chip">
                                  ⏳ Deadline: {formatDateTime(ev.registrationDeadline)}
                                </span>
                              )}
                            </div>

                            {/* Event Registration & Volunteer Summary Strip */}
                            {summary && (
                              <div className="organizer-reg-metrics-strip">
                                <div className="reg-metrics-item">
                                  <span className="reg-metrics-num">{summary.totalRegistrations}</span>
                                  <span className="reg-metrics-label">Total Reg</span>
                                </div>
                                <div className="reg-metrics-item">
                                  <span className="reg-metrics-num" style={{ color: 'var(--accent)' }}>
                                    {summary.participantCount}
                                  </span>
                                  <span className="reg-metrics-label">Participants</span>
                                </div>
                                <div className="reg-metrics-item">
                                  <span className="reg-metrics-num" style={{ color: '#6366f1' }}>
                                    {summary.volunteerCount}
                                  </span>
                                  <span className="reg-metrics-label">Volunteers</span>
                                </div>
                                {summary.registeredCount > 0 && (
                                  <div className="reg-metrics-item">
                                    <span className="reg-metrics-num" style={{ color: '#f59e0b' }}>
                                      {summary.registeredCount}
                                    </span>
                                    <span className="reg-metrics-label">Pending</span>
                                  </div>
                                )}
                                {summary.acceptedCount > 0 && (
                                  <div className="reg-metrics-item">
                                    <span className="reg-metrics-num" style={{ color: '#10b981' }}>
                                      {summary.acceptedCount}
                                    </span>
                                    <span className="reg-metrics-label">Accepted</span>
                                  </div>
                                )}
                                {summary.cancelledCount > 0 && (
                                  <div className="reg-metrics-item">
                                    <span className="reg-metrics-num" style={{ color: '#ef4444' }}>
                                      {summary.cancelledCount}
                                    </span>
                                    <span className="reg-metrics-label">Cancelled</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Cancellation Confirmation Box */}
                          {isConfirmingCancel && (
                            <div className="my-reg-confirm-box" role="alert" style={{ margin: '0.75rem 0' }}>
                              <div className="confirm-box-content">
                                <span style={{ fontSize: '1.25rem' }} aria-hidden="true">⚠</span>
                                <div>
                                  <strong>Cancel Event Confirmation</strong>
                                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                                    Are you sure you want to cancel <strong>{ev.title}</strong>? Once cancelled,
                                    attendees cannot register and the status is irreversible.
                                  </p>
                                </div>
                              </div>
                              <div className="confirm-box-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => setConfirmCancelId(null)}
                                  disabled={isProcessing}
                                >
                                  Keep Active
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleTransitionStatus(ev.id, 'CANCELLED')}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? 'Cancelling...' : 'Yes, Cancel Event'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Event Status & Lifecycle Actions */}
                          <div className="organizer-card-footer">
                            <div className="organizer-footer-links">
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                                onClick={() => handleOpenRoster(ev)}
                              >
                                👥 Attendee Roster {summary?.totalRegistrations != null ? `(${summary.totalRegistrations})` : ''}
                              </button>

                              <Link
                                to={`/events/${ev.id}`}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                              >
                                Public Page &rarr;
                              </Link>

                              {canEdit && (
                                <Link
                                  to={`/organizer/events/${ev.id}/edit`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                                >
                                  ✏️ Edit
                                </Link>
                              )}
                            </div>

                            <div className="organizer-footer-actions">
                              {/* Case A: PENDING Status */}
                              {ev.status === 'PENDING' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span className="status-note" style={{ color: '#f59e0b' }}>
                                    ⏳ Awaiting Admin Approval
                                  </span>
                                  {!isConfirmingCancel && (
                                    <button
                                      type="button"
                                      className="btn btn-cancel-reg"
                                      onClick={() => setConfirmCancelId(ev.id)}
                                      disabled={isProcessing}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Case B: APPROVED Status -> Organizer can publish */}
                              {ev.status === 'APPROVED' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                                    onClick={() => handleTransitionStatus(ev.id, 'PUBLISHED')}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? 'Publishing...' : '🚀 Publish Event Now'}
                                  </button>
                                  {!isConfirmingCancel && (
                                    <button
                                      type="button"
                                      className="btn btn-cancel-reg"
                                      onClick={() => setConfirmCancelId(ev.id)}
                                      disabled={isProcessing}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Case C: PUBLISHED Status -> Organizer can complete or cancel */}
                              {ev.status === 'PUBLISHED' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                                    onClick={() => handleTransitionStatus(ev.id, 'COMPLETED')}
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? 'Updating...' : '🏁 Mark Completed'}
                                  </button>
                                  {!isConfirmingCancel && (
                                    <button
                                      type="button"
                                      className="btn btn-cancel-reg"
                                      onClick={() => setConfirmCancelId(ev.id)}
                                      disabled={isProcessing}
                                    >
                                      Cancel Event
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Case D: Terminal Statuses */}
                              {ev.status === 'COMPLETED' && (
                                <span className="status-note status-note-cancelled">
                                  🏁 Completed
                                </span>
                              )}

                              {ev.status === 'CANCELLED' && (
                                <span className="status-note status-note-cancelled">
                                  🚫 Cancelled
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
