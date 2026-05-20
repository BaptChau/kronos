# Kronos

A multi-tenant time-tracking MVP. Companies register, admins manage employees, and employees clock in/out of their work day. Weekly timesheets and per-day summaries are available for both the employee and their admins.

## Stack

| Layer       | Technology                                                   |
| ----------- | ------------------------------------------------------------ |
| Backend     | Python 3.12 · FastAPI · SQLModel · Alembic · Pydantic v2     |
| Auth        | JWT (python-jose) · bcrypt (passlib)                         |
| Database    | PostgreSQL 16 · asyncpg                                      |
| Cache       | Redis 7                                                      |
| Frontend    | Next.js 14 (App Router) · Tailwind CSS · React Query         |
| Orchestration | Docker Compose                                             |

## Project layout

```
kronos/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/0001_initial.py
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py
│       ├── models/        # Company, User, TimeEntry
│       ├── schemas/       # Pydantic request/response
│       ├── services/      # auth, clock, timesheet
│       └── routers/       # auth, clock, timesheet, admin
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── app/               # App Router pages
    ├── components/        # ClockButton, TimesheetTable, WeeklySummary
    └── lib/               # api.ts, auth.ts
```

## Getting started

### Prerequisites

- Docker and Docker Compose
- Ports `3000`, `8000`, `5432`, `6379` free on the host

### First run

```bash
cp .env.example .env
docker compose up --build
```

This brings up:

- `db` — PostgreSQL 16 with persistent volume + healthcheck
- `redis` — Redis 7 alpine
- `api` — FastAPI on `http://localhost:8000` (runs `alembic upgrade head` then `uvicorn --reload`)
- `frontend` — Next.js dev server on `http://localhost:3000`

### First steps in the app

1. Open `http://localhost:3000`
2. Click **No account yet? Register a new company**
3. Fill in company name, slug, your name, email, and password
4. You land on the admin page. Use **New employee** to invite the rest of the team.

## Environment variables

| Variable                | Purpose                                          | Default                  |
| ----------------------- | ------------------------------------------------ | ------------------------ |
| `POSTGRES_USER`         | Postgres user                                    | `kronos`                 |
| `POSTGRES_PASSWORD`     | Postgres password                                | `kronos`                 |
| `POSTGRES_DB`           | Database name                                    | `kronos`                 |
| `POSTGRES_PORT`         | Host port for Postgres                           | `5432`                   |
| `REDIS_PORT`            | Host port for Redis                              | `6379`                   |
| `JWT_SECRET_KEY`        | HMAC secret for JWT — **change in prod**         | `please-change-me…`      |
| `JWT_ALGORITHM`         | JWT signing algorithm                            | `HS256`                  |
| `JWT_EXPIRE_MINUTES`    | Access token lifetime                            | `1440`                   |
| `CORS_ORIGINS`          | Comma-separated allowed origins                  | `http://localhost:3000`  |
| `NEXT_PUBLIC_API_URL`   | API base URL used by the frontend                | `http://localhost:8000`  |

## API reference

Base URL: `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Auth

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/register` | Create a company + first admin               |
| POST   | `/api/v1/auth/login`    | Returns `access_token`                       |
| GET    | `/api/v1/auth/me`       | Current user info (requires Bearer token)    |

### Clock (any authenticated user)

| Method | Path                   | Description                                       |
| ------ | ---------------------- | ------------------------------------------------- |
| POST   | `/api/v1/clock/in`     | Open a time entry. `409` if one is already open.  |
| POST   | `/api/v1/clock/out`    | Close the open entry and compute `duration_minutes`. |
| GET    | `/api/v1/clock/status` | The open entry, or `null`.                        |

### Timesheet (current user)

| Method | Path                                  | Query           | Description                                    |
| ------ | ------------------------------------- | --------------- | ---------------------------------------------- |
| GET    | `/api/v1/timesheet/me`                | `week=YYYY-Www` | Entries for the ISO week                       |
| GET    | `/api/v1/timesheet/me/summary`        | `week=YYYY-Www` | `{ "Mon": minutes, ..., total_minutes }`       |

### Admin (`role == "admin"`, filtered to your company)

| Method | Path                                                  | Description                                          |
| ------ | ----------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/v1/admin/users`                                 | Employees of the company with current clock status   |
| POST   | `/api/v1/admin/users`                                 | Create an employee                                   |
| GET    | `/api/v1/admin/users/{user_id}/timesheet?week=…`      | Entries for an employee's ISO week                   |
| GET    | `/api/v1/admin/users/{user_id}/summary?week=…`        | Weekly minute breakdown for an employee              |
| PATCH  | `/api/v1/admin/time-entries/{entry_id}`               | Correct `clocked_in_at`, `clocked_out_at`, or `note` |

## Business rules

- **Multi-tenant isolation.** Every query is scoped to the `company_id` from the JWT. Admins cannot reach other companies' data.
- **One open entry per user.** `POST /clock/in` returns `409 Conflict` if an unfinished entry exists.
- **Duration.** Computed at clock-out as `round((clocked_out_at - clocked_in_at) / 60)` minutes.
- **ISO weeks.** `week` parameters follow `YYYY-Www` (e.g. `2026-W21`).
- **Weekly summary.** Returns `{ "Mon": 480, "Tue": 462, ... }` keyed on ISO weekday short labels.

## Data model

```text
Company         User                       TimeEntry
─────────       ──────────────────────     ──────────────────────
id (UUID)       id (UUID)                  id (UUID)
name            company_id  ───┐           user_id      ───┐
slug (uniq)     email          │           company_id   ───┤
created_at      hashed_password│           clocked_in_at   │
                full_name      │           clocked_out_at? │
                role (enum)    │           duration_minutes│
                is_active      │           note?           │
                created_at     │                           │
                               └─── unique(company,email) ─┘
```

## Local development tips

- Hot reload is enabled on both services (uvicorn `--reload`, Next.js `dev`).
- The API container runs `alembic upgrade head` on every start.
- To create a new migration after editing models:
  ```bash
  docker compose exec api alembic revision --autogenerate -m "describe change"
  docker compose exec api alembic upgrade head
  ```
- To open a psql shell:
  ```bash
  docker compose exec db psql -U kronos -d kronos
  ```
- To reset the database:
  ```bash
  docker compose down -v
  docker compose up --build
  ```

## Out of scope for this MVP

- Export to PDF / Excel
- Email notifications
- Leave / absence management
- SSO / OAuth
- Automated tests (planned for a second pass)
