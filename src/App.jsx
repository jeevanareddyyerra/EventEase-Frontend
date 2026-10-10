import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context'
import { ProtectedRoute, RoleBasedRoute } from './components'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import EventsPage from './pages/EventsPage'
import EventDetailsPage from './pages/EventDetailsPage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import ProfilePage from './pages/ProfilePage'
import OrganizerDashboardPage from './pages/OrganizerDashboardPage'
import OrganizerEventFormPage from './pages/OrganizerEventFormPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AiAssistantPage from './pages/AiAssistantPage'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <AiAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AiAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-registrations"
            element={
              <ProtectedRoute>
                <MyRegistrationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/dashboard"
            element={
              <RoleBasedRoute allowedRoles={['ORGANIZER', 'ADMIN']} redirectTo="/home">
                <OrganizerDashboardPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <RoleBasedRoute allowedRoles={['ORGANIZER', 'ADMIN']} redirectTo="/home">
                <OrganizerEventFormPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/organizer/events/:id/edit"
            element={
              <RoleBasedRoute allowedRoles={['ORGANIZER', 'ADMIN']} redirectTo="/home">
                <OrganizerEventFormPage />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RoleBasedRoute allowedRoles={['ADMIN']} redirectTo="/home">
                <AdminDashboardPage />
              </RoleBasedRoute>
            }
          />
          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
