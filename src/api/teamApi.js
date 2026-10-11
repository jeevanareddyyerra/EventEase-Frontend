import apiClient from './client.js'

/**
 * EventEase Team & Team Member API client module.
 */

// --- Team Endpoints ---

export const createTeam = (teamData) => {
  return apiClient.post('/teams', teamData)
}

export const getTeamById = (id) => {
  return apiClient.get(`/teams/${id}`)
}

export const getAllTeams = () => {
  return apiClient.get('/teams')
}

export const getTeamsByEvent = (eventId) => {
  return apiClient.get(`/teams/event/${eventId}`)
}

export const updateTeam = (id, teamData) => {
  return apiClient.put(`/teams/${id}`, teamData)
}

export const deleteTeam = (id) => {
  return apiClient.delete(`/teams/${id}`)
}

// --- Team Member Endpoints ---

export const createTeamMember = (memberData) => {
  return apiClient.post('/team-members', memberData)
}

export const getTeamMemberById = (id) => {
  return apiClient.get(`/team-members/${id}`)
}

export const getAllTeamMembers = () => {
  return apiClient.get('/team-members')
}

export const getTeamMembersByTeam = (teamId) => {
  return apiClient.get(`/team-members/team/${teamId}`)
}

export const updateTeamMember = (id, memberData) => {
  return apiClient.put(`/team-members/${id}`, memberData)
}

export const deleteTeamMember = (id) => {
  return apiClient.delete(`/team-members/${id}`)
}

export const teamApi = {
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
}

export default teamApi
