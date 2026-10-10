import { test, expect } from '@playwright/test'

test.describe('Navigation, UI and Route Verification', () => {
  test('Landing page loads branding, status cards, and action links', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/EventEase/i)

    // Verify main header and brand element
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(page.locator('text=EventEase').first()).toBeVisible()

    // Verify presence of sign in / get started action buttons
    const loginLink = page.locator('a[href="/login"]').first()
    await expect(loginLink).toBeVisible()

    // Verify API target card is rendered
    const statusCard = page.locator('.status-card').first()
    await expect(statusCard).toBeVisible()

    // Click "Test Connection" button to test Nginx -> Spring Boot proxy
    const testConnBtn = page.locator('button:has-text("Test Connection")')
    if (await testConnBtn.isVisible()) {
      await testConnBtn.click()
      await expect(page.locator('text=Backend reachable')).toBeVisible({ timeout: 5000 })
    }
  })

  test('Direct navigation to frontend routes succeeds and works after page refresh (Nginx SPA fallback)', async ({ page }) => {
    const routesToTest = ['/login', '/signup', '/']

    for (const route of routesToTest) {
      await page.goto(route)
      await expect(page.locator('#root')).toBeVisible()

      // Reload the page directly to test Nginx try_files $uri $uri/ /index.html
      await page.reload()
      await expect(page.locator('#root')).toBeVisible()
      expect(page.url()).toContain(route)
    }
  })

  test('Catch-all 404 route renders NotFoundPage gracefully', async ({ page }) => {
    await page.goto('/some-unknown-path-that-does-not-exist')
    await expect(page.locator('text=404')).toBeVisible()
    await expect(page.locator('text=Page Not Found')).toBeVisible()
  })

  test('Signup form displays client-side validation errors on invalid input', async ({ page }) => {
    await page.goto('/signup')

    // Submit empty form
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Email address is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()

    // Test short password
    await page.fill('input[name="name"]', 'John Doe')
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="password"]', '123')
    await page.fill('input[name="confirmPassword"]', '123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible()

    // Test password mismatch
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'mismatch123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('Login form displays client-side validation errors on invalid input', async ({ page }) => {
    await page.goto('/login')

    // Submit empty form
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Email address is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()

    // Invalid email format
    await page.fill('input[name="email"]', 'not-an-email')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
  })

  test('Protected routes redirect unauthenticated users to /login', async ({ page }) => {
    const protectedRoutes = ['/home', '/events', '/my-registrations', '/profile', '/organizer/dashboard', '/admin/dashboard']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
