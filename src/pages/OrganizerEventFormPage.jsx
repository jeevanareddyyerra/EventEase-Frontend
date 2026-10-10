import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context'
import {
  getEventById,
  createEvent,
  updateEvent,
  getVolunteerRequirements,
  createVolunteerRequirement,
  updateVolunteerRequirement,
  deleteVolunteerRequirement,
} from '../api'

const CATEGORIES = [
  'Conference',
  'Workshop',
  'Hackathon',
  'Seminar',
  'Meetup',
  'Cultural',
  'Sports',
  'Exhibition',
  'Networking',
  'Other',
]

export default function OrganizerEventFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserId = user?.id || user?.userId
  const isEditMode = Boolean(id)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Conference',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    capacity: '',
    eligibility: '',
    registrationDeadline: '',
  })

  // Volunteer Requirement Form State
  const [enableVolunteers, setEnableVolunteers] = useState(false)
  const [volunteerCount, setVolunteerCount] = useState('')
  const [volunteerDescription, setVolunteerDescription] = useState('')
  const [existingVolunteerReqId, setExistingVolunteerReqId] = useState(null)

  // Loading & Validation States
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [ownershipForbidden, setOwnershipForbidden] = useState(false)
  const [cannotEditStatus, setCannotEditStatus] = useState(null)

  // Load existing event data in edit mode
  useEffect(() => {
    if (!isEditMode) return

    let isMounted = true

    getEventById(id)
      .then(async (res) => {
        if (!isMounted) return
        const ev = res.data

        // Check ownership
        if (ev.organizerId && currentUserId && ev.organizerId !== currentUserId && user?.role !== 'ADMIN') {
          setOwnershipForbidden(true)
          return
        }

        // Check event status
        if (ev.status === 'COMPLETED' || ev.status === 'CANCELLED') {
          setCannotEditStatus(ev.status)
        }

        // Format date and time for HTML input values
        setFormData({
          title: ev.title || '',
          description: ev.description || '',
          category: ev.category || 'Conference',
          date: ev.date || '',
          startTime: ev.startTime ? ev.startTime.substring(0, 5) : '',
          endTime: ev.endTime ? ev.endTime.substring(0, 5) : '',
          venue: ev.venue || '',
          capacity: ev.capacity != null ? String(ev.capacity) : '',
          eligibility: ev.eligibility || '',
          registrationDeadline: ev.registrationDeadline
            ? ev.registrationDeadline.substring(0, 16)
            : '',
        })

        // Check for existing volunteer requirement
        try {
          const volRes = await getVolunteerRequirements()
          if (isMounted && Array.isArray(volRes.data)) {
            const req = volRes.data.find((r) => String(r.eventId) === String(id))
            if (req) {
              setEnableVolunteers(true)
              setVolunteerCount(String(req.requiredCount || ''))
              setVolunteerDescription(req.description || '')
              setExistingVolunteerReqId(req.id)
            }
          }
        } catch {
          // Non-blocking
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setServerError(err?.message || 'Failed to load event data for editing.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingEvent(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id, isEditMode, currentUserId, user?.role])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.title.trim()) {
      errs.title = 'Title is required.'
    } else if (formData.title.trim().length > 255) {
      errs.title = 'Title must not exceed 255 characters.'
    }

    if (formData.description && formData.description.length > 2000) {
      errs.description = 'Description must not exceed 2000 characters.'
    }

    if (!formData.date) {
      errs.date = 'Event date is required.'
    }

    if (formData.capacity) {
      const cap = Number(formData.capacity)
      if (isNaN(cap) || cap < 1) {
        errs.capacity = 'Capacity must be at least 1 attendee.'
      }
    }

    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
      errs.endTime = 'End time must be after start time.'
    }

    if (enableVolunteers) {
      if (!volunteerCount || isNaN(Number(volunteerCount)) || Number(volunteerCount) < 1) {
        errs.volunteerCount = 'Required volunteer count must be at least 1.'
      }
      if (volunteerDescription && volunteerDescription.length > 1000) {
        errs.volunteerDescription = 'Volunteer duties must not exceed 1000 characters.'
      }
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setServerError(null)

    // Format payload
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      category: formData.category || null,
      date: formData.date,
      startTime: formData.startTime ? `${formData.startTime}:00` : null,
      endTime: formData.endTime ? `${formData.endTime}:00` : null,
      venue: formData.venue.trim() || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      eligibility: formData.eligibility.trim() || null,
      registrationDeadline: formData.registrationDeadline
        ? (formData.registrationDeadline.length === 16
            ? `${formData.registrationDeadline}:00`
            : formData.registrationDeadline)
        : null,
      organizerId: currentUserId,
    }

    try {
      if (isEditMode) {
        // 1. Update Event
        await updateEvent(id, payload)

        // 2. Handle Volunteer Requirements update/create/delete
        if (enableVolunteers) {
          const reqPayload = {
            eventId: Number(id),
            requiredCount: Number(volunteerCount),
            description: volunteerDescription.trim() || null,
          }
          if (existingVolunteerReqId) {
            await updateVolunteerRequirement(existingVolunteerReqId, reqPayload)
          } else {
            await createVolunteerRequirement(reqPayload)
          }
        } else if (existingVolunteerReqId) {
          // Untoggled volunteer requirement
          try {
            await deleteVolunteerRequirement(existingVolunteerReqId)
          } catch {
            // Non-blocking
          }
        }

        navigate('/organizer/dashboard', {
          state: { successMessage: `Event "${formData.title}" updated successfully.` },
        })
      } else {
        // 1. Create Event
        const createRes = await createEvent(payload)
        const newEvent = createRes.data

        // 2. Attach Volunteer Requirement if configured
        if (enableVolunteers && newEvent?.id) {
          try {
            await createVolunteerRequirement({
              eventId: newEvent.id,
              requiredCount: Number(volunteerCount),
              description: volunteerDescription.trim() || null,
            })
          } catch {
            // Requirement creation non-blocking on event creation
          }
        }

        navigate('/organizer/dashboard', {
          state: {
            successMessage: `Event proposal "${formData.title}" created successfully! It is currently PENDING and awaiting administrator review.`,
          },
        })
      }
    } catch (err) {
      if (err?.validationErrors) {
        setValidationErrors(err.validationErrors)
      }
      setServerError(err?.message || 'An error occurred while saving the event.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        {/* Navigation Breadcrumb */}
        <div className="event-breadcrumb">
          <Link to="/organizer/dashboard" className="back-link">
            &larr; Back to Organizer Workspace
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-h)', fontSize: '0.82rem' }}>
            {isEditMode ? 'Edit Event' : 'Create New Event'}
          </span>
        </div>

        {/* Loading State for Edit Mode */}
        {isLoadingEvent && (
          <div className="auth-loading-screen" role="status">
            <span className="auth-spinner" aria-hidden="true"></span>
            <p>Loading event information...</p>
          </div>
        )}

        {/* Ownership Forbidden State */}
        {!isLoadingEvent && ownershipForbidden && (
          <div className="connection-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <span style={{ fontSize: '2.5rem' }} aria-hidden="true">🚫</span>
            <h2 style={{ margin: '0.75rem 0 0.25rem' }}>Unauthorized Action</h2>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem', maxWidth: '440px' }}>
              You can only edit events that you have organized.
            </p>
            <Link to="/organizer/dashboard" className="btn btn-primary">
              Return to Workspace
            </Link>
          </div>
        )}

        {/* Form Container */}
        {!isLoadingEvent && !ownershipForbidden && (
          <div className="organizer-form-container">
            <div className="organizer-form-header">
              <div>
                <h1 className="events-page-title" style={{ margin: 0 }}>
                  {isEditMode ? 'Edit Event Proposal' : 'Create New Event Proposal'}
                </h1>
                <p className="events-page-subtitle">
                  {isEditMode
                    ? 'Update event metadata, scheduling, venue, and volunteer recruitment.'
                    : 'Submit an event proposal. New events default to PENDING status and await admin approval.'}
                </p>
              </div>
              <span className="badge badge-role">
                {isEditMode ? 'Edit Mode' : 'New Submission'}
              </span>
            </div>

            {cannotEditStatus && (
              <div className="alert alert-warning" role="alert" style={{ marginBottom: '1.5rem' }}>
                <span className="alert-icon" aria-hidden="true">ℹ</span>
                <span>
                  Notice: This event is currently in <strong>{cannotEditStatus}</strong> status.
                  Backend policy restricts updates on concluded or cancelled events.
                </span>
              </div>
            )}

            {serverError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
                <span className="alert-icon" aria-hidden="true">⚠</span>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="organizer-form">
              {/* Basic Information Section */}
              <fieldset className="form-fieldset">
                <legend className="form-legend">1. Basic Information</legend>

                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    Event Title <span className="field-required">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    className={`form-input ${validationErrors.title ? 'form-input-error' : ''}`}
                    placeholder="e.g. Annual AI &amp; Cloud Summit 2026"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isSubmitting || Boolean(cannotEditStatus)}
                    maxLength={255}
                    required
                  />
                  {validationErrors.title && (
                    <span className="field-error-text">{validationErrors.title}</span>
                  )}
                </div>

                {/* Category & Capacity Row */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category" className="form-label">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="form-input filter-select"
                      value={formData.category}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="capacity" className="form-label">
                      Attendee Capacity
                    </label>
                    <input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      className={`form-input ${validationErrors.capacity ? 'form-input-error' : ''}`}
                      placeholder="e.g. 250 (Leave empty for open)"
                      value={formData.capacity}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                    {validationErrors.capacity && (
                      <span className="field-error-text">{validationErrors.capacity}</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    className={`form-input form-textarea ${validationErrors.description ? 'form-input-error' : ''}`}
                    placeholder="Describe the schedule, speakers, topics, and goals of this event..."
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isSubmitting || Boolean(cannotEditStatus)}
                    maxLength={2000}
                  ></textarea>
                  <span className="field-hint">
                    {formData.description.length} / 2000 characters
                  </span>
                  {validationErrors.description && (
                    <span className="field-error-text">{validationErrors.description}</span>
                  )}
                </div>
              </fieldset>

              {/* Date, Time & Location Section */}
              <fieldset className="form-fieldset">
                <legend className="form-legend">2. Schedule &amp; Venue</legend>

                {/* Date Row */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date" className="form-label">
                      Event Date <span className="field-required">*</span>
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      className={`form-input ${validationErrors.date ? 'form-input-error' : ''}`}
                      value={formData.date}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                      required
                    />
                    {validationErrors.date && (
                      <span className="field-error-text">{validationErrors.date}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="venue" className="form-label">
                      Venue / Location
                    </label>
                    <input
                      id="venue"
                      name="venue"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Main Auditorium, Building 4"
                      value={formData.venue}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                  </div>
                </div>

                {/* Start & End Times */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="startTime" className="form-label">
                      Start Time
                    </label>
                    <input
                      id="startTime"
                      name="startTime"
                      type="time"
                      className="form-input"
                      value={formData.startTime}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endTime" className="form-label">
                      End Time
                    </label>
                    <input
                      id="endTime"
                      name="endTime"
                      type="time"
                      className={`form-input ${validationErrors.endTime ? 'form-input-error' : ''}`}
                      value={formData.endTime}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                    {validationErrors.endTime && (
                      <span className="field-error-text">{validationErrors.endTime}</span>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Eligibility & Deadlines Section */}
              <fieldset className="form-fieldset">
                <legend className="form-legend">3. Registration &amp; Eligibility</legend>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="eligibility" className="form-label">
                      Eligibility Requirements
                    </label>
                    <input
                      id="eligibility"
                      name="eligibility"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Undergraduate students or IT professionals"
                      value={formData.eligibility}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="registrationDeadline" className="form-label">
                      Registration Deadline
                    </label>
                    <input
                      id="registrationDeadline"
                      name="registrationDeadline"
                      type="datetime-local"
                      className="form-input"
                      value={formData.registrationDeadline}
                      onChange={handleChange}
                      disabled={isSubmitting || Boolean(cannotEditStatus)}
                    />
                  </div>
                </div>
              </fieldset>

              {/* Volunteer Recruitment Section */}
              <fieldset className="form-fieldset">
                <legend className="form-legend">4. Volunteer Opportunities (Optional)</legend>

                <div className="form-checkbox-row">
                  <input
                    id="enableVolunteers"
                    type="checkbox"
                    checked={enableVolunteers}
                    onChange={(e) => setEnableVolunteers(e.target.checked)}
                    disabled={isSubmitting || Boolean(cannotEditStatus)}
                    className="form-checkbox"
                  />
                  <label htmlFor="enableVolunteers" className="form-checkbox-label">
                    Recruit volunteer roles for this event
                  </label>
                </div>

                {enableVolunteers && (
                  <div className="volunteer-form-fields" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="volunteerCount" className="form-label">
                        Required Volunteer Positions <span className="field-required">*</span>
                      </label>
                      <input
                        id="volunteerCount"
                        type="number"
                        min="1"
                        className={`form-input ${validationErrors.volunteerCount ? 'form-input-error' : ''}`}
                        placeholder="e.g. 5"
                        value={volunteerCount}
                        onChange={(e) => setVolunteerCount(e.target.value)}
                        disabled={isSubmitting || Boolean(cannotEditStatus)}
                        required
                      />
                      {validationErrors.volunteerCount && (
                        <span className="field-error-text">
                          {validationErrors.volunteerCount}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="volunteerDescription" className="form-label">
                        Volunteer Duties &amp; Responsibilities
                      </label>
                      <textarea
                        id="volunteerDescription"
                        rows="3"
                        className={`form-input form-textarea ${validationErrors.volunteerDescription ? 'form-input-error' : ''}`}
                        placeholder="Describe volunteer tasks (e.g., Attendee check-in, stage logistics, Q&amp;A microphone coordination)..."
                        value={volunteerDescription}
                        onChange={(e) => setVolunteerDescription(e.target.value)}
                        disabled={isSubmitting || Boolean(cannotEditStatus)}
                        maxLength={1000}
                      ></textarea>
                      {validationErrors.volunteerDescription && (
                        <span className="field-error-text">
                          {validationErrors.volunteerDescription}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Form Submission Actions */}
              <div className="form-actions-bar">
                <Link to="/organizer/dashboard" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary btn-large"
                  disabled={isSubmitting || Boolean(cannotEditStatus)}
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Saving Changes...'
                      : 'Submitting Proposal...'
                    : isEditMode
                    ? 'Save Event Changes'
                    : 'Submit Event Proposal'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
