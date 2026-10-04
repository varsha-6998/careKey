# CareKey API — Phase 1 foundation

Research prototype backend. This phase provides configuration, PostgreSQL models, Alembic migrations, CORS, error handling, and a health check. It does **not** yet authenticate users, expose domain APIs, verify faces, or replace the frontend's current Supabase client.

The existing TanStack Start UI is unchanged. Until a later phase wires the frontend to this API, the two stacks are independent.

## Requirements

- Python 3.11+
- PostgreSQL 14+
- A virtual environment is recommended

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set `DATABASE_URL` to a real PostgreSQL database you control. Do not commit `.env`.

Create the database if it does not exist:

```sql
CREATE DATABASE carekey;
```

Run migrations:

```powershell
alembic upgrade head
```

Start the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

- Liveness: `GET http://localhost:8000/health`
- Readiness (requires PostgreSQL): `GET http://localhost:8000/health/ready`
- OpenAPI: `http://localhost:8000/docs`

## Tests

```powershell
pytest
```

Health tests do not require PostgreSQL. `/health/ready` is not asserted in the default suite because it needs a live database.

## Schema (aligned with the current frontend)

Tables use the same names and fields as the existing app: `profiles`, `user_roles`, `patients`, `allergies`, `conditions`, `medications`, `surgeries`, `documents`, `consents`, `access_logs`, `hospitals`.

Differences from the old Supabase schema (intentional):

- `profiles.id` is an application UUID, not `auth.users`.
- `profiles.firebase_uid` is nullable and unused until Firebase Auth is implemented.
- There is no Row Level Security here; authorization will live in FastAPI in later phases.
- Document files will use `LOCAL_STORAGE_DIR`, not Supabase Storage.

## What is not implemented yet

- Firebase ID token verification
- Role-protected endpoints
- Patient / record / consent / emergency / hospital HTTP APIs
- Face verification
- Frontend integration
- Hospital seed data and OSRM routing

`app/core/security.py` is an explicit placeholder. Do not treat this API as secured.

## Environment variables

See [`.env.example`](.env.example). Firebase and OSRM values are documented for later phases and are unused in Phase 1.
