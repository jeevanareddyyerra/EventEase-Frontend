# EventEase — Frontend Web Application

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**EventEase Frontend** is a modern Single Page Application (SPA) designed for event discovery, ticket registration, volunteer coordination, hackathon team collaboration, digital certificate management, and interactive AI Assistant support.

Built with **React 19** and **Vite 8**, configured for seamless decoupled deployment or reverse-proxied production environments connecting to the [EventEase-Backend](https://github.com/jeevanayerra/EventEase-Backend) REST API.

---

## Architecture & Technology Stack

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8 with `@vitejs/plugin-react`
- **Routing**: React Router 7 (`react-router-dom`) with client-side SPA routing and fallback handling
- **HTTP Client**: Axios with centralized request/response interceptors and automated Bearer token attachment
- **Static Analysis & Linting**: Oxlint (`oxlint`)
- **Testing**: Node.js native test runner (`node --test`), Playwright (Chromium E2E)
- **Web Server & Containerization**: Nginx Alpine with gzip compression and strict security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`)

---

## Key Features & User Interfaces

1. **Role-Based Workspaces**:
   - **Attendee Portal**: Discover published events, filter by category/date, instant ticket registration, team creation/joining, and verifiable digital certificate downloads.
   - **Organizer Workspace**: Propose new events, manage attendee rosters, review volunteer applicants, record live attendance (`PRESENT`/`ABSENT`), and issue certificates.
   - **Admin Dashboard**: Review pending event proposals, approve/reject events, and inspect system-wide platform statistics.

2. **AI Assistant Interface**:
   - Conversational question-answering powered by local semantic document retrieval and generative synthesis.
   - Real-time display of multi-source document citations, vector similarity scores, and anti-hallucination guard notices.

3. **User Experience & Accessibility**:
   - Modern, responsive layout with mobile, tablet, and desktop breakpoints (`860px`, `768px`, `640px`).
   - Unified CSS variable theme supporting Light and Dark Mode.
   - Informative empty states, loading indicators, and contextual error banners with retry handlers.

---

## Prerequisites

- **Node.js**: 20 LTS or later
- **npm**: 10 or later
- **Backend API**: Running instance of [EventEase-Backend](https://github.com/jeevanayerra/EventEase-Backend)

---

## Configuration & Environment Variables

Copy the environment template before running locally:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Default (Dev) | Production Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8080/api` | `/api` | Base URL pointing to the EventEase REST API service |

#### Configurable API Resolution
The API client ([`src/api/client.js`](src/api/client.js)) dynamically resolves endpoints:
- In local development (`npm run dev`), it uses `http://localhost:8080/api` or your customized `VITE_API_BASE_URL`.
- In production (`npm run build`), it defaults to relative `/api` for same-origin reverse-proxy serving via Nginx, or honors an explicit external URL if configured.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will be accessible at [http://localhost:5173/](http://localhost:5173/).

---

## Code Quality & Automated Testing

### Static Analysis (Linter)
```bash
npm run lint
```
*Runs Oxlint across all 48 frontend source files with 0 warnings/errors.*

### Unit Tests
```bash
npm test
```
*Executes unit test suites covering the AI Assistant API, attendance state logic, and certificate issuance rules.*

### End-to-End User Journey Tests (Playwright)
```bash
npm run test:e2e
```
*Executes 15 comprehensive automated end-to-end user journeys against a running application.*

### Production Build
```bash
npm run build
```
*Generates optimized production assets in the `dist/` directory.*

---

## Docker Container Deployment

The frontend includes a multi-stage `Dockerfile`:
- **Stage 1 (Builder)**: Node 20 Alpine builds the React application with `npm ci` and `npm run build`.
- **Stage 2 (Server)**: Nginx Alpine serves compiled static assets and proxies API calls to the backend service.

### Build and Run Docker Container

```bash
docker build -t eventease-frontend .
docker run -d -p 3000:80 eventease-frontend
```

Access the application in your browser at [http://localhost:3000/](http://localhost:3000/).

---

## License

This project is licensed under the MIT License.
