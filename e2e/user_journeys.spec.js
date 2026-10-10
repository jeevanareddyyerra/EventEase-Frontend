import { test, expect } from '@playwright/test'
import { BASE_URL, execSql, cleanupE2eData } from './test_helper.js'

test.describe('Comprehensive End-to-End User Journeys', () => {
  test.describe.configure({ mode: 'serial' })
  const timestamp = Date.now()
  const userEmail = `e2e_user_${timestamp}@example.com`
  const orgEmail = `e2e_org_${timestamp}@example.com`
  const adminEmail = `e2e_admin_${timestamp}@example.com`
  const password = 'Password123!'

  let userToken = ''
  let userId = null
  let orgToken = ''
  let orgId = null
  let adminToken = ''
  let adminId = null

  let createdEventId = null
  let createdRegistrationId = null
  let createdVolunteerRegId = null

  test.beforeAll(async ({ request }) => {
    // 1. Initial cleanup of any stale test data
    cleanupE2eData()

    // 2. Provision regular User
    const userRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Test User', email: userEmail, password: password, phone: '1234567890' },
    })
    const userData = await userRes.json()
    userToken = userData.token
    userId = userData.userId

    // 3. Provision Organizer
    const orgRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Organizer', email: orgEmail, password: password },
    })
    const orgData = await orgRes.json()
    orgId = orgData.userId

    // Promote Organizer in database
    execSql(`UPDATE users SET role = 'ORGANIZER' WHERE id = ${orgId};`)

    // Obtain refreshed token with ROLE_ORGANIZER
    const orgLogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: orgEmail, password: password },
    })
    const orgLoginData = await orgLogin.json()
    orgToken = orgLoginData.token

    // 4. Provision Administrator
    const adminRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Administrator', email: adminEmail, password: password },
    })
    const adminData = await adminRes.json()
    adminId = adminData.userId

    execSql(`UPDATE users SET role = 'ADMIN' WHERE id = ${adminId};`)

    const adminLogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: adminEmail, password: password },
    })
    const adminLoginData = await adminLogin.json()
    adminToken = adminLoginData.token
  })

  test.afterAll(async () => {
    // Strictly clean up disposable test data created during this test run
    cleanupE2eData()
  })

  test('1. Signup and Login workflow with credential verification', async ({ request, page }) => {
    // Duplicate signup should be rejected with 409 Conflict
    const dupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'Duplicate User', email: userEmail, password: password },
    })
    expect(dupRes.status()).toBe(409)

    // Invalid credentials login should be rejected with 401 Bad Credentials
    const badLoginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: userEmail, password: 'WrongPassword!' },
    })
    expect(badLoginRes.status()).toBe(401)

    // Successful login via UI
    await page.goto('/login')
    await page.fill('input[name="email"]', userEmail)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Should redirect to /home upon successful login
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })
    await expect(page.locator('text=E2E Test User').first()).toBeVisible()
  })

  test('2. Role-based access control prevents unauthorized access', async ({ request, page }) => {
    // Regular USER cannot access Admin summary (403 Forbidden)
    const userAdminRes = await request.get(`${BASE_URL}/api/admin/summary`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(userAdminRes.status()).toBe(403)

    // Regular USER cannot create events (403 Forbidden)
    const userCreateEventRes = await request.post(`${BASE_URL}/api/events`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        title: 'Unauthorized Event',
        description: 'Should fail',
        category: 'WORKSHOP',
        date: '2026-12-01',
        startTime: '10:00:00',
        endTime: '12:00:00',
        venue: 'Room 101',
        capacity: 50,
        registrationDeadline: '2026-11-30T23:59:59',
        organizerId: userId,
      },
    })
    expect(userCreateEventRes.status()).toBe(403)

    // Unauthenticated request cannot access events (401 Unauthorized)
    const unauthRes = await request.get(`${BASE_URL}/api/events`)
    expect(unauthRes.status()).toBe(401)

    // UI Role-based route guard: Regular USER navigating to /admin/dashboard redirected to /home
    await page.goto('/login')
    await page.fill('input[name="email"]', userEmail)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/)

    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/home/)
  })

  test('3. Event management workflow (Creation, Update, Lifecycle Transitions)', async ({ request }) => {
    // Organizer creates event (starts in PENDING status)
    const createEventRes = await request.post(`${BASE_URL}/api/events`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        title: `Docker Tech Summit ${timestamp}`,
        description: 'Comprehensive tech conference on containerization and microservices.',
        category: 'CONFERENCE',
        date: '2026-11-20',
        startTime: '09:00:00',
        endTime: '17:00:00',
        venue: 'Convention Center Hall A',
        capacity: 100,
        eligibility: 'Open to all engineers',
        registrationDeadline: '2026-11-15T23:59:59',
        organizerId: orgId,
      },
    })
    expect(createEventRes.status()).toBe(201)
    const eventData = await createEventRes.json()
    expect(eventData.id).toBeTruthy()
    expect(eventData.status).toBe('PENDING')
    createdEventId = eventData.id

    // Organizer updates event details
    const updateEventRes = await request.put(`${BASE_URL}/api/events/${createdEventId}`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        title: `Docker Tech Summit ${timestamp} (Updated)`,
        description: 'Updated conference description.',
        category: 'CONFERENCE',
        date: '2026-11-20',
        startTime: '09:00:00',
        endTime: '17:00:00',
        venue: 'Convention Center Hall A & B',
        capacity: 150,
        registrationDeadline: '2026-11-15T23:59:59',
        organizerId: orgId,
      },
    })
    expect(updateEventRes.status()).toBe(200)
    const updatedData = await updateEventRes.json()
    expect(updatedData.capacity).toBe(150)

    // Admin approves the event: PENDING -> APPROVED
    const approveEventRes = await request.patch(`${BASE_URL}/api/events/${createdEventId}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'APPROVED' },
    })
    expect(approveEventRes.status()).toBe(200)

    // Organizer publishes the event: APPROVED -> PUBLISHED
    const publishRes = await request.patch(`${BASE_URL}/api/events/${createdEventId}/status`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: { status: 'PUBLISHED' },
    })
    expect(publishRes.status()).toBe(200)
    const publishedData = await publishRes.json()
    expect(publishedData.status).toBe('PUBLISHED')

    // Regular USER can search and list published events
    const listRes = await request.get(`${BASE_URL}/api/events?keyword=Docker`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(listRes.status()).toBe(200)
    const listData = await listRes.json()
    expect(listData.content.some((e) => e.id === createdEventId)).toBe(true)
  })

  test('4. Participant Registration & Cancellation workflow', async ({ request }) => {
    // 1. Primary User registers for published event
    const regRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        eventId: createdEventId,
        userId: userId,
        type: 'PARTICIPANT',
      },
    })
    expect(regRes.status()).toBe(201)
    const regData = await regRes.json()
    expect(regData.status).toBe('REGISTERED')
    createdRegistrationId = regData.id

    // 2. Duplicate registration rejected with 409 Conflict
    const dupRegRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        eventId: createdEventId,
        userId: userId,
        type: 'PARTICIPANT',
      },
    })
    expect(dupRegRes.status()).toBe(409)

    // 3. Provision a secondary attendee to test cancellation workflow
    const attendee2Email = `e2e_cancelling_${timestamp}@example.com`
    const attendee2Signup = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Cancelling Attendee', email: attendee2Email, password: password },
    })
    const attendee2Data = await attendee2Signup.json()
    const attendee2Token = attendee2Data.token
    const attendee2Id = attendee2Data.userId

    // Attendee 2 registers
    const attendee2RegRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${attendee2Token}` },
      data: {
        eventId: createdEventId,
        userId: attendee2Id,
        type: 'PARTICIPANT',
      },
    })
    expect(attendee2RegRes.status()).toBe(201)
    const attendee2RegData = await attendee2RegRes.json()
    expect(attendee2RegData.status).toBe('REGISTERED')

    // Attendee 2 cancels registration
    const cancelRes = await request.patch(`${BASE_URL}/api/registrations/${attendee2RegData.id}/cancel`, {
      headers: { Authorization: `Bearer ${attendee2Token}` },
    })
    expect(cancelRes.status()).toBe(200)
    const cancelData = await cancelRes.json()
    expect(cancelData.status).toBe('CANCELLED')

    // Cancelled attendee attempts to re-register (rejected with 409 Conflict)
    const reRegRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${attendee2Token}` },
      data: {
        eventId: createdEventId,
        userId: attendee2Id,
        type: 'PARTICIPANT',
      },
    })
    expect(reRegRes.status()).toBe(409)
  })

  test('5. Volunteer Requirement & Volunteer Assignment workflow', async ({ request }) => {
    // Organizer creates volunteer requirement
    const reqRes = await request.post(`${BASE_URL}/api/volunteer-requirements`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        eventId: createdEventId,
        requiredCount: 5,
        description: 'Registration desk logistics and attendee badge distribution.',
      },
    })
    expect(reqRes.status()).toBe(201)
    const reqData = await reqRes.json()
    expect(reqData.id).toBeTruthy()
    expect(reqData.requiredCount).toBe(5)

    // Dedicated volunteer user registers
    const volEmail = `e2e_vol_${timestamp}@example.com`
    const volSignup = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Volunteer', email: volEmail, password: password },
    })
    const volUserData = await volSignup.json()
    const volToken = volUserData.token
    const volUserId = volUserData.userId

    const volRegRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${volToken}` },
      data: {
        eventId: createdEventId,
        userId: volUserId,
        type: 'VOLUNTEER',
      },
    })
    expect(volRegRes.status()).toBe(201)
    const volRegData = await volRegRes.json()
    expect(volRegData.type).toBe('VOLUNTEER')
    expect(volRegData.status).toBe('REGISTERED')
    createdVolunteerRegId = volRegData.id

    // Organizer accepts volunteer
    const approveRes = await request.patch(`${BASE_URL}/api/registrations/${createdVolunteerRegId}/volunteer-status`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: { status: 'ACCEPTED' },
    })
    expect(approveRes.status()).toBe(200)
    const approvedData = await approveRes.json()
    expect(approvedData.status).toBe('ACCEPTED')
  })

  test('6. Team and Team-Member registration workflow', async ({ request }) => {
    // Create team for the event
    const teamRes = await request.post(`${BASE_URL}/api/teams`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        name: `Team Alpha ${timestamp}`,
        eventId: createdEventId,
        leaderId: userId,
      },
    })
    expect(teamRes.status()).toBe(201)
    const teamData = await teamRes.json()
    expect(teamData.id).toBeTruthy()
    expect(teamData.name).toContain('Team Alpha')

    // Provision secondary participant for the team
    const memberEmail = `e2e_member_${timestamp}@example.com`
    const memberSignup = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { name: 'E2E Team Member', email: memberEmail, password: password },
    })
    const memberUserData = await memberSignup.json()
    const memberToken = memberUserData.token
    const memberUserId = memberUserData.userId

    // Secondary participant registers for the event
    const memberRegRes = await request.post(`${BASE_URL}/api/registrations`, {
      headers: { Authorization: `Bearer ${memberToken}` },
      data: {
        eventId: createdEventId,
        userId: memberUserId,
        type: 'PARTICIPANT',
      },
    })
    expect(memberRegRes.status()).toBe(201)

    // Leader attempts to add themselves as member (rejected with 409 Conflict)
    const selfMemberRes = await request.post(`${BASE_URL}/api/team-members`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        teamId: teamData.id,
        userId: userId,
      },
    })
    expect(selfMemberRes.status()).toBe(409)

    // Add eligible secondary participant as team member
    const memberRes = await request.post(`${BASE_URL}/api/team-members`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        teamId: teamData.id,
        userId: memberUserId,
      },
    })
    expect(memberRes.status()).toBe(201)
    const memberData = await memberRes.json()
    expect(memberData.id).toBeTruthy()

    // Get teams by event
    const eventTeamsRes = await request.get(`${BASE_URL}/api/teams/event/${createdEventId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(eventTeamsRes.status()).toBe(200)
    const eventTeams = await eventTeamsRes.json()
    expect(eventTeams.some((t) => t.id === teamData.id)).toBe(true)
  })

  test('7. Attendance and Certificate issuance workflow with business rules', async ({ request }) => {
    // Organizer marks participant attendance as PRESENT
    const markAttRes = await request.post(`${BASE_URL}/api/attendance`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        registrationId: createdRegistrationId,
        attended: true,
      },
    })
    expect(markAttRes.status()).toBe(201)
    const attData = await markAttRes.json()
    expect(attData.attended).toBe(true)

    // Business rule: Certificate CANNOT be issued if event is not COMPLETED
    const certPrematureRes = await request.post(`${BASE_URL}/api/certificates`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        registrationId: createdRegistrationId,
        certificateUrl: 'https://eventease.io/certs/test-cert.pdf',
      },
    })
    expect(certPrematureRes.status()).toBe(400)

    // Organizer transitions event: PUBLISHED -> COMPLETED
    const completeEventRes = await request.patch(`${BASE_URL}/api/events/${createdEventId}/status`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: { status: 'COMPLETED' },
    })
    expect(completeEventRes.status()).toBe(200)

    // Organizer issues certificate for attendee with PRESENT attendance
    const certRes = await request.post(`${BASE_URL}/api/certificates`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        registrationId: createdRegistrationId,
        certificateUrl: 'https://eventease.io/certs/test-cert.pdf',
      },
    })
    expect(certRes.status()).toBe(201)
    const certData = await certRes.json()
    expect(certData.id).toBeTruthy()
    expect(certData.status).toBe('ISSUED')

    // Duplicate certificate issuance prevented with 409 Conflict
    const certDupRes = await request.post(`${BASE_URL}/api/certificates`, {
      headers: { Authorization: `Bearer ${orgToken}` },
      data: {
        registrationId: createdRegistrationId,
      },
    })
    expect(certDupRes.status()).toBe(409)

    // Participant retrieves certificate
    const getCertRes = await request.get(`${BASE_URL}/api/certificates/registration/${createdRegistrationId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(getCertRes.status()).toBe(200)
    const retrievedCert = await getCertRes.json()
    expect(retrievedCert.id).toBe(certData.id)
  })

  test('8. Admin Dashboard platform statistics and Organizer roster UI', async ({ request, page }) => {
    // Admin accesses platform summary API
    const adminSummaryRes = await request.get(`${BASE_URL}/api/admin/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(adminSummaryRes.status()).toBe(200)
    const summary = await adminSummaryRes.json()
    expect(summary.totalUsers).toBeGreaterThanOrEqual(1)
    expect(summary.totalEvents).toBeGreaterThanOrEqual(1)

    // Admin UI dashboard verification
    await page.goto('/login')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/)

    // Direct navigate to /admin/dashboard
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.locator('text=Platform Governance Dashboard')).toBeVisible()

    // Organizer UI dashboard verification
    await page.goto('/login')
    await page.fill('input[name="email"]', orgEmail)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/home/)

    await page.goto('/organizer/dashboard')
    await expect(page).toHaveURL(/\/organizer\/dashboard/)
    await expect(page.locator('text=Organizer Event Workspace')).toBeVisible()
  })

  test('9. AI Assistant RAG endpoint validation and graceful error handling', async ({ request }) => {
    // Empty question should be rejected with 400 Bad Request
    const emptyQRes = await request.post(`${BASE_URL}/api/ai/assistant/chat`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { question: '   ' },
    })
    expect(emptyQRes.status()).toBe(400)

    // Asking question for COMPLETED event is rejected by business rule
    const completedEventAiRes = await request.post(`${BASE_URL}/api/ai/assistant/chat`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        question: 'What is the schedule for this event?',
        eventId: createdEventId,
      },
    })
    expect(completedEventAiRes.status()).toBe(400)

    // Valid platform-wide question to AI Assistant
    const aiRes = await request.post(`${BASE_URL}/api/ai/assistant/chat`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        question: 'What are the main topics and events available on EventEase?',
      },
    })
    expect(aiRes.status()).toBe(200)
    const aiData = await aiRes.json()
    expect(aiData.answer).toBeTruthy()
    // Returns structured response with boolean flags
    expect(typeof aiData.grounded).toBe('boolean')
    expect(typeof aiData.evidenceFound).toBe('boolean')
  })
})
