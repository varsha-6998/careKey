# CareKey API — Phase 2 authentication and RBAC

CareKey is a research prototype. Phase 2 adds Firebase ID-token authentication, database-backed application users and roles, `/auth/me`, and role-gated probe endpoints. It does not implement Phase 3+ domain APIs, face verification, or frontend integration.

## Requirements

- Python 3.11+
- PostgreSQL 14+ for running the API
- A Firebase project with Firebase Authentication enabled

## Local setup

From the repository root, create and activate a virtual environment, install the backend dependencies, and create the local environment file:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `DATABASE_URL` in `.env` to a PostgreSQL database and configure these Firebase Admin SDK settings:

```dotenv
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS_PATH=./secrets/firebase-service-account.json
```

In Firebase Console, create a service-account key for the project and save the JSON file at the configured path (or update the path to its location). Keep the private key file and `.env` out of Git. The API verifies Firebase ID tokens using this service account; roles come from the application's `users.role` column, never from client claims.

Create the database, apply migrations, and start the API:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/auth/me` (requires `Authorization: Bearer <Firebase ID token>`)
- `GET http://localhost:8000/roles/patient`
- `GET http://localhost:8000/roles/doctor`
- `GET http://localhost:8000/roles/admin`
- OpenAPI: `http://localhost:8000/docs`

New verified users are created with the `patient` role. A trusted administrator must assign elevated `doctor` or `admin` roles in the database; a requested role from the client is ignored.

## Focused Phase 2 tests

From the `backend` directory, run:

```powershell
pytest tests/test_auth.py tests/test_roles.py tests/test_user_model.py
```

These authentication and RBAC tests mock Firebase token verification and use an in-memory fake database, so they do not need Firebase credentials, a Firebase project connection, or a running PostgreSQL server. `test_auth.py` covers missing and invalid tokens, verified identity, `/auth/me`, and patient bootstrap; `test_roles.py` covers patient, doctor, admin access and forbidden role access.

## Phase 2 functionality

- Firebase Admin verifies bearer ID tokens and handles invalid, expired, revoked, disabled, and unavailable-token cases.
- `/auth/me` returns the authenticated application user, creating a patient-role user on first verified login.
- Role-gated endpoints authorize from the stored application role and reject unauthorized access.
- Focused tests exercise authentication and role enforcement without external credentials or services.

## Environment variables

See [`.env.example`](.env.example) for the remaining application settings. `DATABASE_URL` is needed for the running API; `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS_PATH` are needed for real Firebase-authenticated API requests. OSRM and local file storage are outside the Phase 2 authentication scope.