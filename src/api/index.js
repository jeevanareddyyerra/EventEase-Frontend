export { apiClient, API_BASE_URL, DEFAULT_BASE_URL } from './client.js'
export { signup, login, authApi } from './authApi.js'
export {
  getAllEvents,
  getEventById,
  getEventsByStatus,
  getVolunteerRequirements,
  eventApi,
} from './eventApi.js'
export {
  createRegistration,
  getUserRegistrations,
  getRegistrationById,
  getRegistrationsByEvent,
  getEventRegistrationSummary,
  updateVolunteerStatus,
  cancelRegistration,
  getParticipantCount,
  getVolunteerCount,
  registrationApi,
} from './registrationApi.js'
export {
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  userApi,
} from './userApi.js'
export {
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  createVolunteerRequirement,
  updateVolunteerRequirement,
  deleteVolunteerRequirement,
  uploadEventImage,
  deleteEventImage,
  organizerEventApi,
} from './organizerEventApi.js'
export {
  getPlatformSummary,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getOrganizerRequests,
  approveOrganizerRequest,
  rejectOrganizerRequest,
  adminApi,
} from './adminApi.js'
export {
  askAiAssistant,
  aiAssistantApi,
} from './aiAssistantApi.js'
export {
  markAttendance,
  updateAttendance,
  getAttendanceByRegistration,
  getAttendanceById,
  getAllAttendance,
  deleteAttendance,
  attendanceApi,
} from './attendanceApi.js'
export {
  issueCertificate,
  getCertificateByRegistration,
  getCertificateById,
  getAllCertificates,
  updateCertificate,
  deleteCertificate,
  certificateApi,
} from './certificateApi.js'
export {
  createTeam,
  getTeamById,
  getAllTeams,
  getTeamsByEvent,
  updateTeam,
  deleteTeam,
  createTeamMember,
  getTeamMemberById,
  getAllTeamMembers,
  getTeamMembersByTeam,
  updateTeamMember,
  deleteTeamMember,
  teamApi,
} from './teamApi.js'
export { default } from './client.js'

