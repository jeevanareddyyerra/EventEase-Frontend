import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const BASE_URL = 'http://localhost:3000'

export function getDbPassword() {
  try {
    const envPath = path.resolve(process.cwd(), '../.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      const match = content.match(/DB_ROOT_PASSWORD=(.*)/)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  } catch {
    // fallback
  }
  return 'password'
}

export function execSql(sql) {
  const rootPw = getDbPassword()
  const dockerBin = path.join(os.homedir(), '.docker/bin/docker')
  const dockerCmd = `"${dockerBin}" exec eventease-db mysql -u root -p"${rootPw}" -e "USE eventease; ${sql}"`
  try {
    return execSync(dockerCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (err) {
    console.error('SQL Execution failed:', err.message)
    return null
  }
}

export function cleanupE2eData() {
  const cleanupSql = `
    DELETE c FROM certificates c INNER JOIN registrations r ON c.registration_id = r.id INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE a FROM attendances a INNER JOIN registrations r ON a.registration_id = r.id INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE tm FROM team_members tm INNER JOIN teams t ON tm.team_id = t.id INNER JOIN events e ON t.event_id = e.id INNER JOIN users u ON e.organizer_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE t FROM teams t INNER JOIN events e ON t.event_id = e.id INNER JOIN users u ON e.organizer_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE r FROM registrations r INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE vr FROM volunteer_requirements vr INNER JOIN events e ON vr.event_id = e.id INNER JOIN users u ON e.organizer_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE ed FROM event_documents ed INNER JOIN events e ON ed.event_id = e.id INNER JOIN users u ON e.organizer_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE e FROM events e INNER JOIN users u ON e.organizer_id = u.id WHERE u.email LIKE 'e2e_%';
    DELETE FROM users WHERE email LIKE 'e2e_%';
  `
  execSql(cleanupSql)
}
