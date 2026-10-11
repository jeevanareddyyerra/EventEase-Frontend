import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import {
  getPlatformSummary,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getAllUsers,
  deleteUser,
  getAllEvents,
  getOrganizerRequests,
  approveOrganizerRequest,
  rejectOrganizerRequest,
} from '../api'
import { formatDate, formatTimeRange, formatDateTime, formatFriendlyRole } from '../utils/formatters'

export default function AdminDashboardPage() {
  const { user: currentUser, isAuthenticated } = useAuth()

  // Tab navigation: 'PENDING_EVENTS' | 'ORGANIZER_REQUESTS' | 'USERS' | 'ALL_EVENTS'
  const [activeTab, setActiveTab] = useState('PENDING_EVENTS')

  // Platform Metrics
  const [summary, setSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState(null)
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0)

  // Pending Approvals Queue
  const [pendingEvents, setPendingEvents] = useState([])
  const [isLoadingPending, setIsLoadingPending] = useState(true)
  const [pendingError, setPendingError] = useState(null)
  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0)

  // Organizer Requests Queue
  const [organizerRequests, setOrganizerRequests] = useState([])
  const [isLoadingOrganizerRequests, setIsLoadingOrganizerRequests] = useState(true)
  const [organizerRequestsError, setOrganizerRequestsError] = useState(null)
  const [organizerSearch, setOrganizerSearch] = useState('')
  const [organizerStatusFilter, setOrganizerStatusFilter] = useState('ALL')
  const [organizerRefreshKey, setOrganizerRefreshKey] = useState(0)
  const [approveModalOrganizer, setApproveModalOrganizer] = useState(null)
  const [rejectModalOrganizer, setRejectModalOrganizer] = useState(null)
  const [processingOrganizerId, setProcessingOrganizerId] = useState(null)

  // Users Governance Directory
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('ALL')
  const [usersRefreshKey, setUsersRefreshKey] = useState(0)

  // All Events Explorer
  const [allEvents, setAllEvents] = useState([])
  const [isLoadingAllEvents, setIsLoadingAllEvents] = useState(false)
  const [allEventsError, setAllEventsError] = useState(null)
  const [allEventsSearch, setAllEventsSearch] = useState('')
  const [allEventsStatusFilter, setAllEventsStatusFilter] = useState('ALL')
  const [allEventsRefreshKey, setAllEventsRefreshKey] = useState(0)

  // Action status and modals
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [processingEventId, setProcessingEventId] = useState(null)
  const [rejectModalEvent, setRejectModalEvent] = useState(null)
  const [approveModalEvent, setApproveModalEvent] = useState(null)
  const [deleteModalUser, setDeleteModalUser] = useState(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const handleRefreshAll = () => {
    setIsLoadingSummary(true)
    setIsLoadingPending(true)
    setIsLoadingOrganizerRequests(true)
    setSummaryRefreshKey((k) => k + 1)
    setPendingRefreshKey((k) => k + 1)
    setOrganizerRefreshKey((k) => k + 1)
    if (activeTab === 'USERS') {
      setIsLoadingUsers(true)
      setUsersRefreshKey((k) => k + 1)
    }
    if (activeTab === 'ALL_EVENTS') {
      setIsLoadingAllEvents(true)
      setAllEventsRefreshKey((k) => k + 1)
    }
  }

  const handleRefreshSummary = () => {
    setIsLoadingSummary(true)
    setSummaryRefreshKey((k) => k + 1)
  }

  const handleRefreshPending = () => {
    setIsLoadingPending(true)
    setPendingRefreshKey((k) => k + 1)
  }

  const handleRefreshOrganizerRequests = () => {
    setIsLoadingOrganizerRequests(true)
    setOrganizerRefreshKey((k) => k + 1)
  }

  const handleRefreshUsers = () => {
    setIsLoadingUsers(true)
    setUsersRefreshKey((k) => k + 1)
  }

  const handleRefreshAllEvents = () => {
    setIsLoadingAllEvents(true)
    setAllEventsRefreshKey((k) => k + 1)
  }

  // Load platform summary
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    getPlatformSummary()
      .then((res) => {
        if (isMounted) {
          setSummary(res.data)
          setSummaryError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setSummaryError(err?.message || 'Failed to load platform summary metrics.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSummary(false)
      })

    return () => {
      isMounted = false
    }
  }, [summaryRefreshKey, isAuthenticated])

  // Load pending events queue
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    getPendingEvents()
      .then((res) => {
        if (isMounted) {
          const data = res.data
          const list = Array.isArray(data) ? data : data?.content || []
          setPendingEvents(list)
          setPendingError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPendingError(err?.message || 'Failed to load pending approval events.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPending(false)
      })

    return () => {
      isMounted = false
    }
  }, [pendingRefreshKey, isAuthenticated])

  // Fetch Users Directory when USERS tab is active
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'USERS') return
    let isMounted = true

    getAllUsers()
      .then((res) => {
        if (isMounted) {
          setUsers(Array.isArray(res.data) ? res.data : [])
          setUsersError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setUsersError(err?.message || 'Failed to load user directory.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeTab, usersRefreshKey, isAuthenticated])

  // Fetch All Events when ALL_EVENTS tab is active
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'ALL_EVENTS') return
    let isMounted = true

    getAllEvents({ size: 50 })
      .then((res) => {
        if (isMounted) {
          const data = res.data
          const list = Array.isArray(data) ? data : data?.content || []
          setAllEvents(list)
          setAllEventsError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAllEventsError(err?.message || 'Failed to load platform events.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingAllEvents(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeTab, allEventsRefreshKey, isAuthenticated])

  // Fetch Organizer Requests when ORGANIZER_REQUESTS tab is active or on initial/refresh load
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    getOrganizerRequests(organizerStatusFilter === 'ALL' ? undefined : organizerStatusFilter)
      .then((res) => {
        if (isMounted) {
          setOrganizerRequests(Array.isArray(res.data) ? res.data : [])
          setOrganizerRequestsError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setOrganizerRequestsError(err?.message || 'Failed to load organizer requests.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrganizerRequests(false)
      })

    return () => {
      isMounted = false
    }
  }, [organizerStatusFilter, organizerRefreshKey, isAuthenticated])

  // Organizer Approval Action
  const handleApproveOrganizer = async (applicant) => {
    setProcessingOrganizerId(applicant.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await approveOrganizerRequest(applicant.id)
      setActionSuccess(`Organizer application for "${applicant.name}" (${applicant.email}) has been APPROVED.`)
      setApproveModalOrganizer(null)
      handleRefreshAll()
    } catch (err) {
      setActionError(err?.message || `Failed to approve organizer application for #${applicant.id}.`)
    } finally {
      setProcessingOrganizerId(null)
    }
  }

  // Organizer Rejection Action
  const handleRejectOrganizer = async (applicant) => {
    setProcessingOrganizerId(applicant.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await rejectOrganizerRequest(applicant.id)
      setActionSuccess(`Organizer application for "${applicant.name}" (${applicant.email}) has been DECLINED.`)
      setRejectModalOrganizer(null)
      handleRefreshAll()
    } catch (err) {
      setActionError(err?.message || `Failed to decline organizer application for #${applicant.id}.`)
    } finally {
      setProcessingOrganizerId(null)
    }
  }

  // Event Approval Action
  const handleApproveEvent = async (event) => {
    setProcessingEventId(event.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await approveEvent(event.id)
      setActionSuccess(`Event "${event.title}" (#${event.id}) has been successfully APPROVED.`)
      setApproveModalEvent(null)
      // Refresh pending queue and metrics
      handleRefreshAll()
    } catch (err) {
      setActionError(err?.message || `Failed to approve event #${event.id}.`)
    } finally {
      setProcessingEventId(null)
    }
  }

  // Event Rejection Action
  const handleRejectEvent = async (event) => {
    setProcessingEventId(event.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      await rejectEvent(event.id)
      setActionSuccess(`Event "${event.title}" (#${event.id}) has been REJECTED (status set to CANCELLED).`)
      setRejectModalEvent(null)
      // Refresh pending queue and metrics
      handleRefreshAll()
    } catch (err) {
      setActionError(err?.message || `Failed to reject event #${event.id}.`)
    } finally {
      setProcessingEventId(null)
    }
  }

  // User Deletion Action
  const handleDeleteUser = async (targetUser) => {
    if (!targetUser) return
    setIsDeletingUser(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await deleteUser(targetUser.id)
      setActionSuccess(`User "${targetUser.name}" (${targetUser.email}) was successfully deleted.`)
      setDeleteModalUser(null)
      // Refresh users and metrics
      handleRefreshUsers()
      handleRefreshSummary()
    } catch (err) {
      setActionError(
        err?.message || `Failed to delete user #${targetUser.id}. Note: Users with existing registrations or events cannot be removed.`
      )
    } finally {
      setIsDeletingUser(false)
    }
  }

  // Filtered Pending Events
  const filteredPendingEvents = useMemo(() => {
    if (!pendingSearch.trim()) return pendingEvents
    const term = pendingSearch.toLowerCase().trim()
    return pendingEvents.filter((ev) => {
      const title = (ev.title || '').toLowerCase()
      const venue = (ev.venue || '').toLowerCase()
      const category = (ev.category || '').toLowerCase()
      const idStr = String(ev.id || '')
      return title.includes(term) || venue.includes(term) || category.includes(term) || idStr.includes(term)
    })
  }, [pendingEvents, pendingSearch])

  // Filtered Organizer Requests
  const filteredOrganizerRequests = useMemo(() => {
    return organizerRequests.filter((req) => {
      if (!organizerSearch.trim()) return true
      const term = organizerSearch.toLowerCase().trim()
      const name = (req.name || '').toLowerCase()
      const email = (req.email || '').toLowerCase()
      const phone = (req.phone || '').toLowerCase()
      const idStr = String(req.id || '')
      return name.includes(term) || email.includes(term) || phone.includes(term) || idStr.includes(term)
    })
  }, [organizerRequests, organizerSearch])

  const pendingOrganizerCount = useMemo(() => {
    if (summary?.pendingOrganizers !== undefined && summary?.pendingOrganizers !== null) {
      return summary.pendingOrganizers
    }
    return organizerRequests.filter((r) => r.organizerStatus === 'PENDING').length
  }, [summary, organizerRequests])

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter
      if (!matchRole) return false
      if (!userSearch.trim()) return true
      const term = userSearch.toLowerCase().trim()
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const phone = (u.phone || '').toLowerCase()
      const idStr = String(u.id || '')
      return name.includes(term) || email.includes(term) || phone.includes(term) || idStr.includes(term)
    })
  }, [users, userRoleFilter, userSearch])

  // Filtered All Events
  const filteredAllEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const matchStatus = allEventsStatusFilter === 'ALL' || ev.status === allEventsStatusFilter
      if (!matchStatus) return false
      if (!allEventsSearch.trim()) return true
      const term = allEventsSearch.toLowerCase().trim()
      const title = (ev.title || '').toLowerCase()
      const venue = (ev.venue || '').toLowerCase()
      const category = (ev.category || '').toLowerCase()
      const idStr = String(ev.id || '')
      return title.includes(term) || venue.includes(term) || category.includes(term) || idStr.includes(term)
    })
  }, [allEvents, allEventsStatusFilter, allEventsSearch])

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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-accent'
      case 'ORGANIZER':
        return 'badge-role'
      case 'USER':
      default:
        return 'badge-secondary'
    }
  }

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
          <span style={{ color: 'var(--text-h)', fontWeight: 600 }}>
            Platform Administration
          </span>
        </div>

        {/* Page Header */}
        <div className="events-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <h1 className="events-page-title" style={{ margin: 0 }}>
                Platform Governance Dashboard
              </h1>
              <span className="badge badge-accent">ADMIN</span>
              {summary && summary.pendingEvents > 0 && (
                <span className="badge badge-warning">
                  {summary.pendingEvents} Pending Review
                </span>
              )}
            </div>
            <p className="events-page-subtitle">
              System-wide metrics, event approval queue, and user account governance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-large"
              onClick={handleRefreshAll}
              title="Refresh platform data"
            >
              🔄 Refresh Platform
            </button>
            <Link to="/events" className="btn btn-secondary btn-large">
              Public Events
            </Link>
          </div>
        </div>

        {/* Action Success / Error Notifications */}
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

        {/* Platform Metrics Overview Cards */}
        <section aria-label="Platform Summary Metrics">
          {isLoadingSummary ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text)' }}>
              Loading platform metrics...
            </div>
          ) : summaryError ? (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <span>{summaryError}</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ marginLeft: '1rem' }}
                onClick={handleRefreshSummary}
              >
                Retry
              </button>
            </div>
          ) : summary ? (
            <div className="admin-metrics-grid">
              {/* Card 1: Users */}
              <div className="admin-metric-card">
                <div className="admin-metric-header">
                  <span className="admin-metric-title">Platform Users</span>
                  <span className="badge badge-secondary">👥 Accounts</span>
                </div>
                <div className="admin-metric-value">{summary.totalUsers}</div>
                <div className="admin-metric-breakdown">
                  <span className="badge badge-secondary">
                    {summary.totalParticipants} Participants
                  </span>
                  <span className="badge badge-role">
                    {summary.totalOrganizers} Organizers
                  </span>
                  <span className="badge badge-accent">
                    {summary.totalAdmins} Admins
                  </span>
                </div>
              </div>

              {/* Card 2: Events */}
              <div className="admin-metric-card">
                <div className="admin-metric-header">
                  <span className="admin-metric-title">Platform Events</span>
                  <span className="badge badge-accent">🎪 Catalog</span>
                </div>
                <div className="admin-metric-value">{summary.totalEvents}</div>
                <div className="admin-metric-breakdown">
                  <span className="badge badge-success">
                    {summary.publishedEvents} Published
                  </span>
                  <span className="badge badge-accent">
                    {summary.approvedEvents} Approved
                  </span>
                  <span className="badge badge-secondary">
                    {summary.completedEvents} Completed
                  </span>
                </div>
              </div>

              {/* Card 3: Pending Approvals */}
              <div
                className={`admin-metric-card ${summary.pendingEvents > 0 ? 'alert-card' : ''}`}
              >
                <div className="admin-metric-header">
                  <span className="admin-metric-title">Pending Approvals</span>
                  {summary.pendingEvents > 0 ? (
                    <span className="badge badge-warning">Action Needed</span>
                  ) : (
                    <span className="badge badge-success">Up to Date</span>
                  )}
                </div>
                <div
                  className="admin-metric-value"
                  style={{ color: summary.pendingEvents > 0 ? '#f59e0b' : 'var(--text-h)' }}
                >
                  {summary.pendingEvents}
                </div>
                <div className="admin-metric-breakdown">
                  <span className="badge badge-warning">
                    {summary.pendingEvents} Awaiting Review
                  </span>
                  {summary.cancelledEvents > 0 && (
                    <span className="badge badge-error">
                      {summary.cancelledEvents} Rejected/Cancelled
                    </span>
                  )}
                </div>
              </div>

              {/* Card 4: Registrations */}
              <div className="admin-metric-card">
                <div className="admin-metric-header">
                  <span className="admin-metric-title">Total Registrations</span>
                  <span className="badge badge-success">🎫 Activity</span>
                </div>
                <div className="admin-metric-value" style={{ color: '#10b981' }}>
                  {summary.totalRegistrations}
                </div>
                <div className="admin-metric-breakdown">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                    Participants &amp; volunteers across all events
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Administration Navigation Tabs */}
        <nav className="admin-nav-tabs" aria-label="Governance Sections">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'PENDING_EVENTS' ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('PENDING_EVENTS')}
          >
            <span>⏳ Event Approval Queue</span>
            <span
              className={`badge ${pendingEvents.length > 0 ? 'badge-warning' : 'badge-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}
            >
              {pendingEvents.length}
            </span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'ORGANIZER_REQUESTS' ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('ORGANIZER_REQUESTS')}
          >
            <span>🏢 Organizer Applications</span>
            <span
              className={`badge ${pendingOrganizerCount > 0 ? 'badge-warning' : 'badge-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}
            >
              {pendingOrganizerCount}
            </span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'USERS' ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('USERS')}
          >
            <span>👤 User &amp; Organizer Directory</span>
            {users.length > 0 && (
              <span className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}>
                {users.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'ALL_EVENTS' ? 'admin-tab-btn-active' : ''}`}
            onClick={() => setActiveTab('ALL_EVENTS')}
          >
            <span>📋 All Events Explorer</span>
            {allEvents.length > 0 && (
              <span className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}>
                {allEvents.length}
              </span>
            )}
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: PENDING EVENT APPROVALS QUEUE                                      */}
        {/* ========================================================================= */}
        {activeTab === 'PENDING_EVENTS' && (
          <section aria-label="Event Approval Queue">
            <div className="events-filter-row" style={{ marginBottom: '1.25rem' }}>
              <div className="events-search-wrapper" style={{ flex: '1 1 260px' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search pending events by title, venue, or category..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  aria-label="Search pending events"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRefreshPending}
                  disabled={isLoadingPending}
                >
                  🔄 Refresh Queue
                </button>
              </div>
            </div>

            {isLoadingPending ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text)' }}>
                Loading approval queue...
              </div>
            ) : pendingError ? (
              <div className="alert alert-error">
                <span>{pendingError}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  style={{ marginLeft: '1rem' }}
                  onClick={handleRefreshPending}
                >
                  Retry
                </button>
              </div>
            ) : filteredPendingEvents.length === 0 ? (
              <div className="empty-state-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>
                  🎉
                </span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)' }}>
                  {pendingSearch ? 'No matching pending events' : 'Approval Queue is Clear!'}
                </h3>
                <p style={{ color: 'var(--text)', margin: 0, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {pendingSearch
                    ? `No pending events match "${pendingSearch}". Clear the search to view all.`
                    : 'There are currently no event proposals awaiting admin review. All organizers are up to date!'}
                </p>
                {pendingSearch && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                    onClick={() => setPendingSearch('')}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Event Title</th>
                      <th scope="col">Category</th>
                      <th scope="col">Date &amp; Time</th>
                      <th scope="col">Venue</th>
                      <th scope="col">Organizer</th>
                      <th scope="col">Capacity</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingEvents.map((ev) => {
                      const isProcessing = processingEventId === ev.id
                      return (
                        <tr key={ev.id}>
                          <td>
                            <span className="badge badge-secondary">#{ev.id}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              {ev.imageUrl && (
                                <img
                                  src={ev.imageUrl}
                                  alt=""
                                  style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                                />
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Link
                                  to={`/events/${ev.id}`}
                                  style={{ color: 'var(--text-h)', fontWeight: 600, textDecoration: 'none' }}
                                  title="View event details"
                                >
                                  {ev.title}
                                </Link>
                                <span className="badge badge-warning" style={{ alignSelf: 'flex-start', marginTop: '0.2rem' }}>
                                  PENDING
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-accent">
                              {ev.category || 'General'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                              <span>📅 {formatDate(ev.date)}</span>
                              <span style={{ color: 'var(--text)', fontSize: '0.78rem' }}>
                                ⏰ {formatTimeRange(ev.startTime, ev.endTime)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>
                              📍 {ev.venue || 'TBA'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>
                              {ev.organizerName || (ev.organizerId ? `Org #${ev.organizerId}` : '—')}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>
                              {ev.capacity != null ? `${ev.capacity} spots` : 'Unlimited'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="roster-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                disabled={isProcessing}
                                onClick={() => setApproveModalEvent(ev)}
                                title="Approve event proposal"
                              >
                                ✓ Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-small"
                                disabled={isProcessing}
                                onClick={() => setRejectModalEvent(ev)}
                                title="Reject event proposal"
                              >
                                ✕ Reject
                              </button>
                              <Link
                                to={`/events/${ev.id}`}
                                className="btn btn-secondary btn-small"
                                title="Inspect details"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB: ORGANIZER APPLICATIONS QUEUE                                         */}
        {/* ========================================================================= */}
        {activeTab === 'ORGANIZER_REQUESTS' && (
          <section aria-label="Organizer Applications Queue">
            <div className="events-filter-row" style={{ marginBottom: '1.25rem' }}>
              <div className="events-search-wrapper" style={{ flex: '1 1 260px' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search applicants by name, email, or phone..."
                  value={organizerSearch}
                  onChange={(e) => setOrganizerSearch(e.target.value)}
                  aria-label="Search organizer applications"
                />
              </div>

              <div className="filter-select-wrapper" style={{ minWidth: '170px' }}>
                <select
                  className="filter-select"
                  value={organizerStatusFilter}
                  onChange={(e) => {
                    setIsLoadingOrganizerRequests(true)
                    setOrganizerStatusFilter(e.target.value)
                  }}
                  aria-label="Filter by application status"
                >
                  <option value="ALL">All Application Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Declined</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRefreshOrganizerRequests}
                  disabled={isLoadingOrganizerRequests}
                >
                  🔄 Refresh Requests
                </button>
              </div>
            </div>

            {isLoadingOrganizerRequests ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text)' }}>
                Loading organizer applications...
              </div>
            ) : organizerRequestsError ? (
              <div className="alert alert-error">
                <span>{organizerRequestsError}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  style={{ marginLeft: '1rem' }}
                  onClick={handleRefreshOrganizerRequests}
                >
                  Retry
                </button>
              </div>
            ) : filteredOrganizerRequests.length === 0 ? (
              <div className="empty-state-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>
                  🏢
                </span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)' }}>
                  {organizerSearch
                    ? 'No matching organizer applications'
                    : organizerStatusFilter === 'PENDING'
                    ? 'No Pending Organizer Requests'
                    : 'No Organizer Applications Found'}
                </h3>
                <p style={{ color: 'var(--text)', margin: 0, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {organizerSearch
                    ? `No applications match "${organizerSearch}". Try clearing your search.`
                    : 'When users register with an Organizer account type, their verification requests will appear here for administrator review.'}
                </p>
                {organizerSearch && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                    onClick={() => setOrganizerSearch('')}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Applicant</th>
                      <th scope="col">Contact</th>
                      <th scope="col">Account Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Applied Date</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrganizerRequests.map((applicant) => (
                      <tr key={applicant.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                            #{applicant.id}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-h)', display: 'block' }}>
                            {applicant.name}
                          </strong>
                        </td>
                        <td>
                          <span style={{ display: 'block', fontSize: '0.85rem' }}>
                            {applicant.email}
                          </span>
                          {applicant.phone && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text)' }}>
                              📞 {applicant.phone}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getRoleBadgeClass(applicant.role)}`}>
                            {applicant.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              applicant.organizerStatus === 'APPROVED'
                                ? 'badge-success'
                                : applicant.organizerStatus === 'REJECTED'
                                ? 'badge-error'
                                : 'badge-warning'
                            }`}
                          >
                            {applicant.organizerStatus === 'APPROVED'
                              ? 'Approved'
                              : applicant.organizerStatus === 'REJECTED'
                              ? 'Declined'
                              : 'Pending Review'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                            {applicant.createdAt ? formatDate(applicant.createdAt) : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            {applicant.organizerStatus !== 'APPROVED' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => setApproveModalOrganizer(applicant)}
                                disabled={processingOrganizerId === applicant.id}
                                title="Approve as Event Organizer"
                              >
                                ✓ Approve
                              </button>
                            )}
                            {applicant.organizerStatus !== 'REJECTED' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => setRejectModalOrganizer(applicant)}
                                disabled={processingOrganizerId === applicant.id}
                                title="Decline organizer application"
                              >
                                ✕ Decline
                              </button>
                            )}
                            {applicant.organizerStatus === 'APPROVED' && (
                              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                                Active Organizer
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: USER & ORGANIZER DIRECTORY                                        */}
        {/* ========================================================================= */}
        {activeTab === 'USERS' && (
          <section aria-label="User Directory Management">
            <div className="events-filter-row" style={{ marginBottom: '1.25rem' }}>
              <div className="events-search-wrapper" style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search user by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  aria-label="Search users"
                />
              </div>

              <div className="events-filter-group">
                <label htmlFor="user-role-select" className="filter-label">
                  Role
                </label>
                <select
                  id="user-role-select"
                  className="filter-select"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="USER">Participants (USER)</option>
                  <option value="ORGANIZER">Organizers</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRefreshUsers}
                disabled={isLoadingUsers}
              >
                🔄 Refresh Directory
              </button>
            </div>

            {isLoadingUsers ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text)' }}>
                Loading user directory...
              </div>
            ) : usersError ? (
              <div className="alert alert-error">
                <span>{usersError}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  style={{ marginLeft: '1rem' }}
                  onClick={handleRefreshUsers}
                >
                  Retry
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>
                  👥
                </span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)' }}>
                  No users match criteria
                </h3>
                <p style={{ color: 'var(--text)', margin: 0 }}>
                  Try clearing your search terms or selecting a different role filter.
                </p>
              </div>
            ) : (
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th scope="col">User ID</th>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Role</th>
                      <th scope="col">Created At</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSelf = currentUser?.id === u.id || currentUser?.email === u.email
                      return (
                        <tr key={u.id}>
                          <td>
                            <span className="badge badge-secondary">#{u.id}</span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-h)' }}>{u.name}</strong>
                            {isSelf && (
                              <span className="badge badge-accent" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                                Current User
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.88rem' }}>{u.email}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>{u.phone || '—'}</span>
                          </td>
                          <td>
                            <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                              {formatFriendlyRole(u.role)}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              {formatDateTime(u.createdAt)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="roster-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-danger btn-small"
                                disabled={isSelf}
                                onClick={() => setDeleteModalUser(u)}
                                title={isSelf ? 'Cannot delete your active session' : 'Delete user account'}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALL EVENTS EXPLORER                                               */}
        {/* ========================================================================= */}
        {activeTab === 'ALL_EVENTS' && (
          <section aria-label="Platform Events Explorer">
            <div className="events-filter-row" style={{ marginBottom: '1.25rem' }}>
              <div className="events-search-wrapper" style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search events by title or venue..."
                  value={allEventsSearch}
                  onChange={(e) => setAllEventsSearch(e.target.value)}
                  aria-label="Search all events"
                />
              </div>

              <div className="events-filter-group">
                <label htmlFor="all-status-select" className="filter-label">
                  Status
                </label>
                <select
                  id="all-status-select"
                  className="filter-select"
                  value={allEventsStatusFilter}
                  onChange={(e) => setAllEventsStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRefreshAllEvents}
                disabled={isLoadingAllEvents}
              >
                🔄 Refresh Events
              </button>
            </div>

            {isLoadingAllEvents ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text)' }}>
                Loading platform events...
              </div>
            ) : allEventsError ? (
              <div className="alert alert-error">
                <span>{allEventsError}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  style={{ marginLeft: '1rem' }}
                  onClick={handleRefreshAllEvents}
                >
                  Retry
                </button>
              </div>
            ) : filteredAllEvents.length === 0 ? (
              <div className="empty-state-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>
                  🎪
                </span>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)' }}>
                  No events found
                </h3>
                <p style={{ color: 'var(--text)', margin: 0 }}>
                  Adjust your search or status filter to see other platform events.
                </p>
              </div>
            ) : (
              <div className="roster-table-container">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Title</th>
                      <th scope="col">Category</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                      <th scope="col">Venue</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <span className="badge badge-secondary">#{ev.id}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {ev.imageUrl && (
                              <img
                                src={ev.imageUrl}
                                alt=""
                                style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                              />
                            )}
                            <Link
                              to={`/events/${ev.id}`}
                              style={{ color: 'var(--text-h)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {ev.title}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-accent">
                            {ev.category || 'General'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(ev.status)}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>
                            📅 {formatDate(ev.date)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>
                            📍 {ev.venue || 'TBA'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/events/${ev.id}`}
                            className="btn btn-secondary btn-small"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CONFIRMATION MODALS                                                       */}
        {/* ========================================================================= */}

        {/* APPROVE EVENT CONFIRMATION MODAL */}
        {approveModalEvent && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">Approve Event Proposal</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setApproveModalEvent(null)}
                >
                  ✕
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  Are you sure you want to approve this event?
                </p>
                {approveModalEvent.imageUrl && (
                  <div style={{ maxHeight: '160px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                    <img src={approveModalEvent.imageUrl} alt={approveModalEvent.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ background: 'var(--code-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <strong>{approveModalEvent.title}</strong> (ID: #{approveModalEvent.id})
                  <br />
                  <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                    Category: {approveModalEvent.category || 'General'} &bull; Date: {formatDate(approveModalEvent.date)}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                  Once approved, the status will update to <strong>APPROVED</strong>, allowing the organizer to publish it for public registration.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApproveModalEvent(null)}
                  disabled={processingEventId === approveModalEvent.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleApproveEvent(approveModalEvent)}
                  disabled={processingEventId === approveModalEvent.id}
                >
                  {processingEventId === approveModalEvent.id ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT EVENT CONFIRMATION MODAL */}
        {rejectModalEvent && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h3 className="admin-modal-title" style={{ color: '#ef4444' }}>
                  Reject Event Proposal
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setRejectModalEvent(null)}
                >
                  ✕
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  Are you sure you want to reject this event proposal?
                </p>
                <div style={{ background: 'var(--code-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <strong>{rejectModalEvent.title}</strong> (ID: #{rejectModalEvent.id})
                  <br />
                  <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                    Organizer: {rejectModalEvent.organizerName || `Org #${rejectModalEvent.organizerId}`}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#ef4444' }}>
                  ⚠️ This will transition the event status to <strong>CANCELLED</strong>. The event will not be published.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectModalEvent(null)}
                  disabled={processingEventId === rejectModalEvent.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRejectEvent(rejectModalEvent)}
                  disabled={processingEventId === rejectModalEvent.id}
                >
                  {processingEventId === rejectModalEvent.id ? 'Rejecting...' : 'Reject Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE USER CONFIRMATION MODAL */}
        {deleteModalUser && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h3 className="admin-modal-title" style={{ color: '#ef4444' }}>
                  Delete User Account
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setDeleteModalUser(null)}
                >
                  ✕
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  Are you sure you want to permanently delete this user?
                </p>
                <div style={{ background: 'var(--code-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <strong>{deleteModalUser.name}</strong> ({deleteModalUser.email})
                  <br />
                  <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                    Role: {formatFriendlyRole(deleteModalUser.role)} &bull; ID: #{deleteModalUser.id}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#ef4444' }}>
                  ⚠️ Warning: This action cannot be reversed. If this user has active registrations or organized events, deletion will fail due to referential integrity constraints.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModalUser(null)}
                  disabled={isDeletingUser}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteUser(deleteModalUser)}
                  disabled={isDeletingUser}
                >
                  {isDeletingUser ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE ORGANIZER APPLICATION MODAL */}
        {approveModalOrganizer && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h3 className="admin-modal-title" style={{ color: 'var(--text-h)' }}>
                  Approve Organizer Application
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setApproveModalOrganizer(null)}
                >
                  ✕
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  Are you sure you want to approve this applicant as an Event Organizer?
                </p>
                <div style={{ background: 'var(--code-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <strong>{approveModalOrganizer.name}</strong> ({approveModalOrganizer.email})
                  <br />
                  <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                    User ID: #{approveModalOrganizer.id} &bull; Current Role: {approveModalOrganizer.role}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                  Once approved, their role will be updated to <strong>ORGANIZER</strong>, granting them permission to create and manage campus events and registrations.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApproveModalOrganizer(null)}
                  disabled={processingOrganizerId === approveModalOrganizer.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleApproveOrganizer(approveModalOrganizer)}
                  disabled={processingOrganizerId === approveModalOrganizer.id}
                >
                  {processingOrganizerId === approveModalOrganizer.id ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT ORGANIZER APPLICATION MODAL */}
        {rejectModalOrganizer && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h3 className="admin-modal-title" style={{ color: '#ef4444' }}>
                  Decline Organizer Application
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setRejectModalOrganizer(null)}
                >
                  ✕
                </button>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  Are you sure you want to decline this organizer application?
                </p>
                <div style={{ background: 'var(--code-bg)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <strong>{rejectModalOrganizer.name}</strong> ({rejectModalOrganizer.email})
                  <br />
                  <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                    User ID: #{rejectModalOrganizer.id}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                  The applicant will remain an active Participant with standard attendee privileges and will not be granted event creation rights.
                </p>
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectModalOrganizer(null)}
                  disabled={processingOrganizerId === rejectModalOrganizer.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRejectOrganizer(rejectModalOrganizer)}
                  disabled={processingOrganizerId === rejectModalOrganizer.id}
                >
                  {processingOrganizerId === rejectModalOrganizer.id ? 'Declining...' : 'Decline Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
