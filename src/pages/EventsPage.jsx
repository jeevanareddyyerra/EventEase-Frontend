import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  MapPin,
  UsersRound,
  UserRound,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { getAllEvents } from '../api'
import { formatDate, formatTimeRange } from '../utils/formatters'

const KNOWN_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [upcomingOnly, setUpcomingOnly] = useState(false)
  const [availableCategories, setAvailableCategories] = useState([])

  // Pagination & Sorting states
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('date')
  const [direction, setDirection] = useState('asc')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [hasNext, setHasNext] = useState(false)

  // Sequence ref to prevent stale async responses from overwriting latest results
  const requestSeqRef = useRef(0)

  // Debounce search term changes by 300ms and reset to page 0
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setFetchTrigger((prev) => prev + 1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setSelectedCategory('ALL')
    setSelectedStatus('ALL')
    setUpcomingOnly(false)
    setPageSize(10)
    setSortBy('date')
    setDirection('asc')
    setPage(0)
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setPage(0)
  }

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value)
    setPage(0)
  }

  const handleUpcomingChange = (e) => {
    setUpcomingOnly(e.target.checked)
    setPage(0)
  }

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value))
    setPage(0)
  }

  const handleSortChange = (e) => {
    const [newSortBy, newDir] = e.target.value.split(':')
    setSortBy(newSortBy)
    setDirection(newDir)
    setPage(0)
  }

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    upcomingOnly ||
    pageSize !== 10 ||
    sortBy !== 'date' ||
    direction !== 'asc' ||
    page !== 0
  )

  useEffect(() => {
    let isMounted = true
    const currentSeq = ++requestSeqRef.current

    const params = {
      page,
      size: pageSize,
      sortBy,
      direction,
    }
    if (debouncedSearch) {
      params.keyword = debouncedSearch
    }
    if (selectedCategory && selectedCategory !== 'ALL') {
      params.category = selectedCategory
    }
    if (selectedStatus && selectedStatus !== 'ALL') {
      params.status = selectedStatus
    }
    if (upcomingOnly) {
      params.upcoming = true
    }

    getAllEvents(params)
      .then((response) => {
        // Discard out-of-order or unmounted responses
        if (!isMounted || currentSeq !== requestSeqRef.current) return

        const data = Array.isArray(response.data?.content)
          ? response.data.content
          : (Array.isArray(response.data) ? response.data : [])

        setEvents(data)
        setTotalPages(response.data?.totalPages ?? (data.length > 0 ? 1 : 0))
        setTotalElements(response.data?.totalElements ?? data.length)
        setHasPrevious(Boolean(response.data?.hasPrevious ?? (page > 0)))
        setHasNext(Boolean(response.data?.hasNext ?? false))

        // Accumulate distinct categories so dropdown options persist across pages
        setAvailableCategories((prev) => {
          const set = new Set(prev)
          data.forEach((e) => {
            if (e.category && e.category.trim()) {
              set.add(e.category.trim())
            }
          })
          return Array.from(set).sort()
        })
      })
      .catch((err) => {
        if (!isMounted || currentSeq !== requestSeqRef.current) return
        setErrorMessage(
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load events from the server. Please try again.'
        )
      })
      .finally(() => {
        if (isMounted && currentSeq === requestSeqRef.current) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [debouncedSearch, selectedCategory, selectedStatus, upcomingOnly, page, pageSize, sortBy, direction, fetchTrigger])

  // Extract categories for dropdown
  const categories = useMemo(() => {
    return ['ALL', ...availableCategories]
  }, [availableCategories])

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

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {/* Header Hero Section */}
        <section className="events-header">
          <div className="events-header-info">
            <h1 className="hero-title" style={{ fontSize: '2.4rem', textAlign: 'left' }}>
              Discover Events
            </h1>
            <p className="hero-description" style={{ textAlign: 'left', margin: 0 }}>
              Browse campus activities, workshops, seminars, hackathons, and corporate sessions.
            </p>
          </div>

          <div className="events-header-meta">
            <Link to="/assistant" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} className="inline-icon" aria-hidden="true" /> Ask AI Assistant
            </Link>
            <span className="badge badge-accent">
              {totalElements} {hasActiveFilters ? 'Matching Events' : 'Total Events'}
            </span>
            <Link to="/home" className="btn btn-secondary">
              ← Workspace Home
            </Link>
          </div>
        </section>

        {/* Filters & Search Control Bar */}
        <section className="events-controls-card">
          <div className="events-search-group">
            <label htmlFor="event-search" className="form-label">
              Search Events
            </label>
            <input
              id="event-search"
              type="text"
              className="form-input"
              placeholder="Search by title, description, venue, or organizer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="events-filter-row">
            <div className="filter-select-group">
              <label htmlFor="category-select" className="form-label">
                Category
              </label>
              <select
                id="category-select"
                className="form-input filter-select"
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-group">
              <label htmlFor="status-select" className="form-label">
                Lifecycle Status
              </label>
              <select
                id="status-select"
                className="form-input filter-select"
                value={selectedStatus}
                onChange={handleStatusChange}
              >
                {KNOWN_STATUSES.map((stat) => (
                  <option key={stat} value={stat}>
                    {stat === 'ALL' ? 'All Statuses' : stat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-group">
              <label htmlFor="sort-select" className="form-label">
                Sort By
              </label>
              <select
                id="sort-select"
                className="form-input filter-select"
                value={`${sortBy}:${direction}`}
                onChange={handleSortChange}
              >
                <option value="date:asc">Event Date: Earliest First</option>
                <option value="date:desc">Event Date: Latest First</option>
                <option value="title:asc">Event Title: A → Z</option>
                <option value="title:desc">Event Title: Z → A</option>
                <option value="capacity:desc">Capacity: Highest First</option>
              </select>
            </div>

            <div className="filter-select-group" style={{ flex: '0 0 auto', minWidth: '120px' }}>
              <label htmlFor="pagesize-select" className="form-label">
                Per Page
              </label>
              <select
                id="pagesize-select"
                className="form-input filter-select"
                value={pageSize}
                onChange={handlePageSizeChange}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="filter-select-group" style={{ flex: '0 0 auto', minWidth: 'auto' }}>
              <span className="form-label" style={{ visibility: 'hidden' }}>
                Upcoming
              </span>
              <label className="form-checkbox-row" style={{ height: '38px', margin: 0, padding: '0 0.25rem' }}>
                <input
                  id="upcoming-filter"
                  type="checkbox"
                  className="form-checkbox"
                  checked={upcomingOnly}
                  onChange={handleUpcomingChange}
                />
                <span className="form-checkbox-label">Upcoming Only</span>
              </label>
            </div>

            {hasActiveFilters && (
              <div className="filter-reset-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="auth-loading-screen" role="status">
            <span className="auth-spinner" aria-hidden="true"></span>
            <p>Loading events from server...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="auth-alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">
              <AlertCircle size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Error loading events</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{errorMessage}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetry}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && events.length === 0 && (
          <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <CalendarDays size={36} className="empty-icon-svg" aria-hidden="true" />
            <h3 style={{ margin: '0.75rem 0 0.25rem' }}>No Events Found</h3>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '480px' }}>
              {hasActiveFilters
                ? 'No events match your selected search or filter criteria.'
                : 'There are currently no events registered in the EventEase system.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClearFilters}
              >
                Reset Filter Criteria
              </button>
            )}
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !errorMessage && events.length > 0 && (
          <section className="events-grid-section">
            <div className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="section-subtitle">
                Showing <strong>{events.length}</strong> of <strong>{totalElements}</strong> {hasActiveFilters ? 'matching ' : ''}{totalElements === 1 ? 'event' : 'events'}
              </span>
              {totalPages > 0 && (
                <span className="section-subtitle" style={{ fontSize: '0.88rem' }}>
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                </span>
              )}
            </div>

            <div className="cards-grid">
              {events.map((event) => (
                <article key={event.id} className="preview-card event-card">
                  {event.imageUrl && (
                    <div
                       className="event-card-poster-wrapper"
                       style={{
                        width: '100%',
                        height: '180px',
                        overflow: 'hidden',
                        borderRadius: '6px 6px 0 0',
                        position: 'relative',
                        background: 'var(--bg-subtle)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="event-card-content">
                    <div className="preview-card-header">
                      <span className="badge badge-accent">
                        {event.category || 'General'}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(event.status)}`}>
                        {event.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <h2 className="preview-card-title event-title-heading">
                      <Link to={`/events/${event.id}`} className="event-title-link">
                        {event.title}
                      </Link>
                    </h2>

                    <p className="preview-card-desc event-desc-snippet">
                      {event.description
                        ? event.description.length > 130
                          ? `${event.description.substring(0, 130)}...`
                          : event.description
                        : 'No description provided.'}
                    </p>

                    <div className="event-metadata-list">
                      <div className="event-meta-row">
                        <span className="event-meta-icon" aria-hidden="true">
                          <CalendarDays size={14} className="inline-icon" />
                        </span>
                        <span>{formatDate(event.date)}</span>
                        {(event.startTime || event.endTime) && (
                          <span className="event-meta-time">
                            • {formatTimeRange(event.startTime, event.endTime)}
                          </span>
                        )}
                      </div>

                      <div className="event-meta-row">
                        <span className="event-meta-icon" aria-hidden="true">
                          <MapPin size={14} className="inline-icon" />
                        </span>
                        <span>{event.venue || 'Venue to be announced'}</span>
                      </div>

                      <div className="event-meta-row">
                        <span className="event-meta-icon" aria-hidden="true">
                          <UsersRound size={14} className="inline-icon" />
                        </span>
                        <span>
                          {event.capacity != null ? `${event.capacity} Max Capacity` : 'Open Capacity'}
                        </span>
                      </div>

                      {event.organizerName && (
                        <div className="event-meta-row">
                          <span className="event-meta-icon" aria-hidden="true">
                            <UserRound size={14} className="inline-icon" />
                          </span>
                          <span>Organized by {event.organizerName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="event-card-footer">
                    <Link
                      to={`/events/${event.id}`}
                      className="btn btn-primary btn-event-action"
                    >
                      View Event Details &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalElements > 0 && (
              <div
                className="events-pagination-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginTop: '2rem',
                  padding: '1.25rem 0',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> ({totalElements} total {totalElements === 1 ? 'event' : 'events'})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={!hasPrevious || page === 0 || isLoading}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                    aria-label="Previous Page"
                  >
                    &larr; Previous
                  </button>

                  <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem', color: 'var(--text-h)' }}>
                    {page + 1} / {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!hasNext || page >= totalPages - 1 || isLoading}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                    aria-label="Next Page"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
