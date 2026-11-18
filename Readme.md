# Banana Game

Banana Game is a full-stack puzzle game. The React frontend provides account,
gameplay, score, history, and settings pages. The Express backend provides the
API, stores users and games in MongoDB, and retrieves puzzles from a Banana
puzzle API.

## Technology

- Frontend: React 19, React Router, and Vite
- Backend: Node.js, Express 5, and Mongoose
- Database: MongoDB
- Authentication: JWT, email verification flows, and optional Google sign-in

## Project layout

```text
backend/
  config/        MongoDB connection
  controllers/   Authentication, user, and game handlers
  middleware/    Authentication middleware
  models/        Mongoose models
  routes/        Express API routes
  services/      External Banana puzzle API client
  templates/     Email templates
  utils/         Settings and backend helpers
  server.js      Backend entry point

frontend/
  src/
    components/  Shared UI components
    context/     Application settings context/provider
    pages/       Application screens
    utils/       Frontend settings and audio helpers
  public/        Static public files
  index.html     Vite HTML entry
```

## Requirements

- Node.js compatible with Vite 8
- npm
- A MongoDB database
- A Banana puzzle API that returns JSON containing `question` and `solution`

Install dependencies separately in both applications:

```powershell
Set-Location backend
npm ci

Set-Location ..\frontend
npm ci
```

## Environment configuration

Create local environment files from the examples:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Replace the example values with your own configuration. Do not commit `.env`
files or credentials.

### Backend: `backend/.env`

| Variable | Purpose |
| --- | --- |
| `MONGO_URL` | MongoDB connection string. Required to start the API. |
| `PORT` | API port; defaults to `4000`. |
| `JWT_SECRET` | Secret used to sign and verify authentication tokens. |
| `JWT_EXPIRES_IN` | Token lifetime understood by `jsonwebtoken`, for example `7d`. |
| `FRONTEND_URL` | Frontend origin for CORS and links in email messages, for example `http://localhost:5173`. |
| `BANANA_API_URL` | Puzzle endpoint. Its JSON response must include `question` and `solution`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP connection and credentials for email and verification flows. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in configuration when Google authentication is enabled. |

### Frontend: `frontend/.env`

| Variable | Purpose |
| --- | --- |
| `BACKEND_URL` | Backend origin, for example `http://localhost:4000`. The frontend appends its `/api/...` paths. |
| `GOOGLE_CLIENT_ID` | Google sign-in client ID, if enabled. |
| `GOOGLE_SCRIPT_URL` | Google sign-in client script URL, if enabled. |

Vite reads frontend environment values when starting or building the frontend.
The project explicitly allows `BACKEND_URL` and `GOOGLE_*` variables through
its Vite configuration.

## Run locally

Start MongoDB and configure `backend/.env` first. Then run each app in a
separate terminal:

```powershell
Set-Location backend
npm run dev
```

```powershell
Set-Location frontend
npm run dev
```

Vite prints the frontend URL when ready (normally `http://localhost:5173`).
The API listens on `http://localhost:4000` unless `PORT` is set. Its root
health endpoint is `GET /`.

## Frontend pages

The application is routed with React Router:

- `/` and `/landing`: landing page
- `/login`, `/register`, `/forgot-password`, `/reset-password`: account access
- `/dashboard`: player overview and recent games
- `/game-selection`, `/gameplay`, `/game-result`: game flow
- `/game-history`: past games
- `/score-summary`, `/score-statistics`: score reporting
- `/leaderboard`, `/my-rank`: leaderboard and player rank
- `/profile`, `/change-password`, `/settings`: account and preferences

The settings provider loads user preferences and shares them across the app.
Sound effects and background music can be adjusted in Settings. Background
music uses `frontend/src/assets/banana.mp3`; browsers may wait for a user
interaction before starting audio.

## Backend API

All API routes are under `/api`. Protected routes require a bearer token in the
`Authorization` header.

- `/api/auth`: registration, login, OTP verification, Google login, logout,
  and password recovery
- `/api/users`: profile, settings, password changes, avatar upload, and cookie
  consent
- `/api/games`: start/resume games, submit answers, game history, score
  summary/statistics, leaderboard, and player rank

See `backend/routes/` for the individual HTTP methods and route paths.

## Useful commands

Run commands from the relevant application directory.

| Directory | Command | Description |
| --- | --- | --- |
| `frontend` | `npm run dev` | Start the Vite development server. |
| `frontend` | `npm run build` | Create the production build in `frontend/dist`. |
| `frontend` | `npm run preview` | Preview the production build locally. |
| `frontend` | `npm run lint` | Run Oxlint. |
| `backend` | `npm run dev` | Start the API with Nodemon. |
| `backend` | `npm test` | Run Node's built-in test runner; no backend test cases are currently present. |