import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Sparkles,
  AlertCircle,
  Target,
  MessageSquare,
  CheckCircle2,
  FileText,
  Bot,
  ShieldCheck,
  FileCheck,
  Lock,
  Info,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { askAiAssistant } from '../api/aiAssistantApi'
import { getAllEvents } from '../api/eventApi'

const SUGGESTED_QUESTIONS = [
  {
    label: 'Eligibility & Requirements',
    text: 'What are the eligibility requirements to participate in this event?',
  },
  {
    label: 'What to Bring',
    text: 'What equipment, software, or items should attendees bring?',
  },
  {
    label: 'Official Rules & Code of Conduct',
    text: 'What are the official rules, judging criteria, and guidelines?',
  },
  {
    label: 'Registration & Deadlines',
    text: 'How does registration work and what is the deadline?',
  },
  {
    label: 'Event Schedule & Timelines',
    text: 'What is the schedule of activities and key event timings?',
  },
]

const DOCUMENT_TYPES = [
  { value: 'ALL', label: 'All Document Types' },
  { value: 'RULES', label: 'Rules & Guidelines' },
  { value: 'FAQ', label: 'Frequently Asked Questions (FAQ)' },
  { value: 'ELIGIBILITY', label: 'Eligibility & Requirements' },
  { value: 'GUIDELINES', label: 'Venue & Conduct Guidelines' },
]

export default function AiAssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter States - Derived from URL search params
  const selectedEventId = searchParams.get('eventId') || ''
  const initialEventTitle = searchParams.get('eventTitle') || ''

  // Validate URL eventId parameter: check for non-numeric or non-positive values
  const isInvalidEventId = Boolean(
    selectedEventId && (!/^\d+$/.test(selectedEventId) || Number(selectedEventId) <= 0)
  )

  const [selectedDocType, setSelectedDocType] = useState('ALL')
  const [publishedEvents, setPublishedEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  const isStaleEventId = Boolean(
    selectedEventId &&
      !isInvalidEventId &&
      !isLoadingEvents &&
      publishedEvents.length > 0 &&
      !publishedEvents.some((p) => String(p.id) === String(selectedEventId))
  )

  // Input & Chat States
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [lastPayload, setLastPayload] = useState(null)

  const textareaRef = useRef(null)
  const responseRef = useRef(null)

  // Load published events for the filter dropdown
  useEffect(() => {
    let isMounted = true
    getAllEvents({ status: 'PUBLISHED', size: 50, sortBy: 'title', direction: 'asc' })
      .then((res) => {
        if (!isMounted) return
        const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : [])
        setPublishedEvents(list)
      })
      .catch(() => {
        // Non-blocking for dropdown
      })
      .finally(() => {
        if (isMounted) setIsLoadingEvents(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const handleEventFilterChange = (e) => {
    const newId = e.target.value
    const nextParams = new URLSearchParams(searchParams)
    if (newId) {
      nextParams.set('eventId', newId)
      const ev = publishedEvents.find((p) => String(p.id) === String(newId))
      if (ev?.title) {
        nextParams.set('eventTitle', ev.title)
      } else {
        nextParams.delete('eventTitle')
      }
    } else {
      nextParams.delete('eventId')
      nextParams.delete('eventTitle')
    }
    setSearchParams(nextParams)
  }

  const handleClearEventFilter = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('eventId')
    nextParams.delete('eventTitle')
    setSearchParams(nextParams)
  }

  const handleSend = useCallback(
    async (overrideQuestion) => {
      const q = (overrideQuestion !== undefined ? overrideQuestion : question).trim()
      if (!q || isLoading) return

      if (q.length > 1000) {
        setError({
          status: 400,
          message: 'Question exceeds the maximum allowed length of 1000 characters.',
        })
        return
      }

      if (isInvalidEventId) {
        setError({
          status: 400,
          message: `The event ID "${selectedEventId}" in the filter is invalid. Please clear the event filter or select a valid published event.`,
        })
        return
      }

      setIsLoading(true)
      setError(null)

      const payload = {
        question: q,
        eventId: selectedEventId || undefined,
        documentType: selectedDocType !== 'ALL' ? selectedDocType : undefined,
      }
      setLastPayload(payload)

      try {
        const res = await askAiAssistant(payload)
        setResponse({
          ...res.data,
          userQuestion: q,
        })
        // Scroll to response card gently
        setTimeout(() => {
          if (responseRef.current) {
            responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      } catch (err) {
        setError({
          status: err.status || 500,
          message: err.message || 'An error occurred while communicating with the AI Assistant.',
          validationErrors: err.validationErrors,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [question, isLoading, selectedEventId, selectedDocType, isInvalidEventId]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleApplyPrompt = (text) => {
    setQuestion(text)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    handleSend(text)
  }

  const handleRetry = () => {
    if (lastPayload) {
      handleSend(lastPayload.question)
    } else {
      handleSend()
    }
  }

  // Active event display helper
  const activeEvent = selectedEventId
    ? publishedEvents.find((e) => String(e.id) === String(selectedEventId))
    : null
  const activeEventName =
    activeEvent?.title || initialEventTitle || (selectedEventId ? `Event #${selectedEventId}` : null)

  return (
    <div className="landing-container">
      <Header />

      <main className="landing-content">
        <div className="ai-assistant-container">
          {/* Header & Description */}
          <section className="ai-assistant-header">
            <div className="ai-header-badge-row">
              <span className="badge badge-accent">
                <Sparkles size={13} className="inline-icon" aria-hidden="true" /> EventEase Assistant
              </span>
              <span className="badge badge-success">Verified Answers</span>
            </div>
            <h1 className="hero-title" style={{ fontSize: '2.4rem', textAlign: 'left', margin: '0.5rem 0' }}>
              AI Event Assistant
            </h1>
            <p className="hero-description" style={{ textAlign: 'left', margin: 0, maxWidth: '780px' }}>
              Ask questions about event rules, schedules, eligibility, and guidelines. Answers are
              strictly grounded in official published event documentation and include source citations.
            </p>
          </section>

          {/* Filter Bar */}
          <section className="ai-filter-card" aria-label="Assistant Filters">
            <div className="ai-filter-grid">
              <div className="ai-filter-item">
                <label htmlFor="ai-event-select" className="form-label" style={{ marginBottom: '0.3rem' }}>
                  Target Event Filter (Optional)
                </label>
                <select
                  id="ai-event-select"
                  className="form-input ai-select"
                  value={selectedEventId}
                  onChange={handleEventFilterChange}
                  disabled={isLoadingEvents || isLoading}
                >
                  <option value="">All Published Events (General Discovery)</option>
                  {publishedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} (ID: {ev.id})
                    </option>
                  ))}
                  {selectedEventId && !publishedEvents.some((p) => String(p.id) === String(selectedEventId)) && (
                    <option value={selectedEventId}>
                      {activeEventName}
                    </option>
                  )}
                </select>
              </div>

              <div className="ai-filter-item">
                <label htmlFor="ai-doc-type-select" className="form-label" style={{ marginBottom: '0.3rem' }}>
                  Document Type (Optional)
                </label>
                <select
                  id="ai-doc-type-select"
                  className="form-input ai-select"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  disabled={isLoading}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isInvalidEventId && (
              <div
                className="alert alert-error"
                style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', fontSize: '0.88rem' }}
                role="alert"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={15} className="inline-icon" aria-hidden="true" />
                    <span><strong>Invalid Event Filter:</strong> The event ID specified in the URL (<code>{selectedEventId}</code>) is invalid.</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClearEventFilter}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            )}

            {isStaleEventId && (
              <div
                className="alert alert-warning"
                style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', fontSize: '0.88rem' }}
                role="status"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={15} className="inline-icon" aria-hidden="true" />
                    <span><strong>Notice:</strong> Event #{selectedEventId} is not in the list of published events (it may be unpublished, cancelled, or not exist). Inquiries may return an error until cleared.</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClearEventFilter}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            )}

            {selectedEventId && !isInvalidEventId && (
              <div className="ai-active-filter-banner" role="status">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={15} className="inline-icon" aria-hidden="true" />
                  <span>
                    Focusing on: <strong>{activeEventName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary ai-btn-clear"
                  onClick={handleClearEventFilter}
                  disabled={isLoading}
                >
                  Clear Event Filter
                </button>
              </div>
            )}
          </section>

          {/* Input Box */}
          <section className="ai-chat-input-card">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="ai-form"
            >
              <label htmlFor="ai-question-input" className="form-label" style={{ fontWeight: 600 }}>
                Your Question
              </label>

              <div className="ai-textarea-wrapper">
                <textarea
                  id="ai-question-input"
                  ref={textareaRef}
                  className="ai-textarea"
                  rows={4}
                  maxLength={1000}
                  placeholder="Ask a question about event rules, eligibility, venue, or schedules... (Press Enter to send)"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 1000))}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  aria-describedby="ai-char-counter"
                  required
                />
              </div>

              <div className="ai-input-footer">
                <span id="ai-char-counter" className="ai-char-counter">
                  {question.length} / 1000 characters
                </span>

                <div className="ai-input-actions">
                  {question && !isLoading && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setQuestion('')}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!question.trim() || isLoading}
                    style={{ minWidth: '130px' }}
                  >
                    {isLoading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="auth-spinner" aria-hidden="true" style={{ width: 14, height: 14 }}></span>
                        Thinking...
                      </span>
                    ) : (
                      'Send Question →'
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Prompt Chips */}
            <div className="ai-prompts-section">
              <span className="ai-prompts-title">Suggested Inquiries:</span>
              <div className="ai-prompt-chips">
                {SUGGESTED_QUESTIONS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-chip-btn"
                    onClick={() => handleApplyPrompt(chip.text)}
                    disabled={isLoading}
                    title={chip.text}
                  >
                    <Sparkles size={13} className="inline-icon" aria-hidden="true" /> {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Loading State Indicator */}
          {isLoading && (
            <div className="ai-loading-card" role="status" aria-live="polite">
              <span className="auth-spinner" aria-hidden="true" style={{ width: 28, height: 28 }}></span>
              <div>
                <strong>Searching event knowledge base...</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--text)' }}>
                  Retrieving relevant document chunks and generating a grounded response.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert Box */}
          {!isLoading && error && (
            <div className="alert alert-error ai-error-card" role="alert">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={20} className="inline-icon" aria-hidden="true" style={{ color: 'var(--color-danger, #ef4444)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>
                    {error.status === 400
                      ? 'Invalid Question or Request'
                      : error.status === 401
                      ? 'Authentication Required'
                      : error.status === 404
                      ? 'Event Not Found'
                      : error.status === 429
                      ? 'AI Rate Limit Exceeded'
                      : 'AI Assistant Error'}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>{error.message}</div>
                  {error.validationErrors && (
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                      {Object.entries(error.validationErrors).map(([f, m]) => (
                        <li key={f}>
                          <strong>{f}</strong>: {m}
                        </li>
                      ))}
                    </ul>
                  )}
                  {error.status === 401 && (
                    <div style={{ marginTop: '0.6rem' }}>
                      <Link to="/login" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        Log In Again &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {selectedEventId && (error.status === 400 || error.status === 404) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      handleClearEventFilter()
                      setError(null)
                    }}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                  >
                    Clear Event Filter &amp; Search All Events
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setError(null)}
                  style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRetry}
                  style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
                >
                  Retry Question
                </button>
              </div>
            </div>
          )}

          {/* Response Section */}
          {!isLoading && response && (
            <article ref={responseRef} className="ai-response-card" aria-label="AI Assistant Answer">
              <div className="ai-response-header">
                <div className="ai-question-recap">
                  <MessageSquare size={16} className="inline-icon" aria-hidden="true" style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <span className="ai-recap-label">You Asked:</span>
                    <div className="ai-recap-text">"{response.userQuestion}"</div>
                  </div>
                </div>

                <div className="ai-status-badges">
                  {response.grounded ? (
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} className="inline-icon" aria-hidden="true" /> Grounded with Evidence
                    </span>
                  ) : response.fallbackReason === 'INSUFFICIENT_EVIDENCE' ? (
                    <span className="badge badge-warning">
                      <Info size={12} className="inline-icon" aria-hidden="true" /> Insufficient Evidence
                    </span>
                  ) : response.fallbackReason === 'AI_CLIENT_UNCONFIGURED' ? (
                    <span className="badge badge-secondary">AI Provider Offline</span>
                  ) : (
                    <span className="badge badge-error">AI Generation Unavailable</span>
                  )}

                  {response.modelUsed && (
                    <span className="badge badge-accent" title="AI Model">
                      {response.modelUsed}
                    </span>
                  )}

                  {response.topSimilarityScore > 0 && (
                    <span
                      className="badge badge-role"
                      title="Document match relevance based on official event materials"
                    >
                      Match: {(response.topSimilarityScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Answer Content */}
              <div className="ai-answer-body">
                <div className="ai-answer-label">Assistant Answer:</div>
                <div className="ai-answer-text">{response.answer}</div>
              </div>

              {/* Fallback Notice Cards */}
              {response.fallbackReason === 'INSUFFICIENT_EVIDENCE' && (
                <div className="ai-fallback-callout callout-warning">
                  <Info size={16} className="inline-icon" aria-hidden="true" />
                  <div>
                    <strong>Why did this happen?</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                      None of the published event documents contained sufficient information about this topic
                      (minimum relevance threshold not met). Consider checking the event description directly
                      or contacting the organizer.
                    </p>
                  </div>
                </div>
              )}

              {response.fallbackReason === 'AI_CLIENT_UNCONFIGURED' && (
                <div className="ai-fallback-callout callout-info">
                  <Info size={16} className="inline-icon" aria-hidden="true" />
                  <div>
                    <strong>AI Model Generation Offline</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                      The AI generative client is currently offline or unconfigured on the server. However,
                      relevant documentation was retrieved and is cited below.
                    </p>
                  </div>
                </div>
              )}

              {response.fallbackReason === 'AI_CLIENT_ERROR' && (
                <div className="ai-fallback-callout callout-error">
                  <AlertCircle size={16} className="inline-icon" aria-hidden="true" />
                  <div>
                    <strong>Temporary AI Provider Error</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                      The AI service encountered a temporary timeout or provider issue. You can retry your
                      inquiry below.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRetry}
                      style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
                    >
                      Retry Generation
                    </button>
                  </div>
                </div>
              )}

              {/* Source Citations Section */}
              {Array.isArray(response.sources) && response.sources.length > 0 && (
                <section className="ai-citations-container" aria-label="Source Citations">
                  <div className="ai-citations-title-bar">
                    <span className="ai-citations-title">
                      Source Citations &amp; Evidence ({response.sources.length})
                    </span>
                    <span className="ai-citations-hint">
                      Verified references from official event documentation
                    </span>
                  </div>

                  <div className="ai-citations-grid">
                    {response.sources.map((source, index) => (
                      <div key={source.chunkId || index} className="ai-citation-card">
                        <div className="ai-citation-card-header">
                          <span className="badge badge-accent">
                            {source.documentType || 'DOCUMENT'}
                          </span>
                          {source.similarityScore > 0 && (
                            <span
                              className="ai-match-score"
                              title="Document section relevance match"
                            >
                              Relevance: {(source.similarityScore * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <div className="ai-citation-doc-title">
                          <FileText size={13} className="inline-icon" aria-hidden="true" /> {source.documentTitle || 'Untitled Document'}
                        </div>

                        <div className="ai-citation-event-title">
                          Event:{' '}
                          {source.eventId ? (
                            <Link to={`/events/${source.eventId}`} className="event-title-link">
                              {source.eventTitle || `Event #${source.eventId}`}
                            </Link>
                          ) : (
                            source.eventTitle || 'Unknown Event'
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </article>
          )}

          {/* Friendly Empty State */}
          {!isLoading && !response && !error && (
            <section className="ai-empty-state-card">
              <Bot size={40} className="empty-icon-svg" aria-hidden="true" style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--accent)' }} />
              <h2 className="ai-empty-title">Ready for Your Questions</h2>
              <p className="ai-empty-desc">
                EventEase Assistant searches official published event schedules, guidelines, and
                announcements to provide instant, trustworthy answers with direct citations.
              </p>
              <div className="ai-empty-feature-grid">
                <div className="ai-feature-pill">
                  <ShieldCheck size={14} className="inline-icon" aria-hidden="true" />
                  <span>Strict public-event visibility</span>
                </div>
                <div className="ai-feature-pill">
                  <FileCheck size={14} className="inline-icon" aria-hidden="true" />
                  <span>Verifiable source citations</span>
                </div>
                <div className="ai-feature-pill">
                  <Lock size={14} className="inline-icon" aria-hidden="true" />
                  <span>Zero prompt injection leakage</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
