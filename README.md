# Kronos

A multi-tenant time-tracking MVP. Companies register, admins manage employees, and employees clock in/out of their work day. Weekly timesheets and per-day summaries are available for both the employee and their admins.

A platform **owner** role sits above all companies and can provision new ones from a dedicated console.

## Stack

| Layer       | Technology                                                   |
| ----------- | ------------------------------------------------------------ |
| Backend     | Python 3.12 · uv · FastAPI · SQLModel · Alembic · Pydantic v2 |
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
│   ├── pyproject.toml          # managed with uv
│   ├── uv.lock                 # generated on first `uv sync`
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 0001_initial.py
│   │       └── 0002_owner_role.py
│   ├── scripts/
│   │   └── create_owner.py    # bootstrap the first platform owner
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py    # get_current_user, require_admin, require_owner
│       ├── models/            # Company, User, TimeEntry
│       ├── schemas/           # Pydantic request/response
│       ├── services/          # auth, clock, timesheet, owner
│       └── routers/           # auth, clock, timesheet, admin, owner
├── frontend/                  # employee + company-admin app (port 3000)
│   ├── Dockerfile
│   ├── package.json
│   ├── app/                   # App Router pages
│   ├── components/            # ClockButton, TimesheetTable, WeeklySummary
│   └── lib/                   # api.ts, auth.ts
└── frontend-owner/            # platform-owner console (port 3001)
    ├── Dockerfile
    ├── package.json
    ├── app/
    └── lib/
```

## Getting started

### Prerequisites

- Docker and Docker Compose
- Ports `3000`, `3001`, `8000`, `5432`, `6379` free on the host

### First run

```bash
cp .env.example .env
docker compose up --build
```

This brings up:

- `db` — PostgreSQL 16 with persistent volume + healthcheck
- `redis` — Redis 7 alpine
- `api` — FastAPI on `http://localhost:8000` (runs `alembic upgrade head` then `uvicorn --reload`)
- `frontend` — employee + company-admin app on `http://localhost:3000`
- `frontend-owner` — platform-owner console on `http://localhost:3001`

### Bootstrap the first platform owner

The owner is created out-of-band (no public sign-up). Run the helper once the API container is up:

```bash
docker compose exec api python -m scripts.create_owner \
    --email owner@kronos.io --password "change-me-please" --name "Jane Doe"
```

Then open `http://localhost:3001`, sign in with those credentials, and use **New company** to provision a customer.

### First steps as a company admin

1. Open `http://localhost:3000`
2. Either sign in with the credentials the owner provisioned, or click **No account yet? Register a new company** to self-serve.
3. From the admin page, use **New employee** to invite the rest of the team.

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
| `CORS_ORIGINS`          | Comma-separated allowed origins                  | `http://localhost:3000,http://localhost:3001` |
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

### Owner (`role == "owner"`, cross-tenant)

| Method | Path                                                  | Description                                          |
| ------ | ----------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/v1/owner/companies`                             | List every company on the platform                   |
| POST   | `/api/v1/owner/companies`                             | Create a company + its first admin                   |
| GET    | `/api/v1/owner/companies/{company_id}/users`          | List users of a given company                        |
| POST   | `/api/v1/owner/companies/{company_id}/admins`         | Add another admin to a company                       |
| POST   | `/api/v1/owner/owners`                                | Create another platform owner                        |

Owners are not tied to a company (`company_id` is `NULL`). They cannot use the employee or company-admin endpoints — those reject anything other than the matching role.

### Admin (`role == "admin"`, filtered to your company)

| Method | Path                                                  | Description                                          |
| ------ | ----------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/v1/admin/users`                                 | Employees of the company with current clock status   |
| POST   | `/api/v1/admin/users`                                 | Create an employee                                   |
| GET    | `/api/v1/admin/users/{user_id}/timesheet?week=…`      | Entries for an employee's ISO week                   |
| GET    | `/api/v1/admin/users/{user_id}/summary?week=…`        | Weekly minute breakdown for an employee              |
| PATCH  | `/api/v1/admin/time-entries/{entry_id}`               | Correct `clocked_in_at`, `clocked_out_at`, or `note` |

## Business rules

- **Multi-tenant isolation.** Every query is scoped to the `company_id` from the JWT. Admins cannot reach other companies' data. Owners explicitly opt in to cross-tenant operations via `/api/v1/owner/...`.
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

### Python dependencies (uv)

The backend is managed with [uv](https://docs.astral.sh/uv/). Inside the `backend/` directory:

```bash
uv sync                          # install deps into .venv
uv add some-package              # add a runtime dependency
uv add --dev pytest              # add a dev-only dependency
uv lock --upgrade                # refresh the lock file
uv run uvicorn app.main:app --reload   # run a command in the project env
```

The Docker image installs deps into `/opt/venv` (outside the bind-mount) and puts it on `PATH`, so `uvicorn`, `alembic`, and `python` work directly inside the container.

### Other tips

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
