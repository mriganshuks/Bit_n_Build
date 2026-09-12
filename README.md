# PRAMAAN

PRAMAAN is a Next.js application for skill verification and trusted hackathon
team discovery. The current implementation provides profile creation,
credential login, session-protected dashboard access, onboarding guards, and a
MongoDB health check. Assessment, verification, and team discovery features
are not implemented yet.

## Requirements

- Node.js 20.19 or newer
- npm
- A MongoDB deployment, such as MongoDB Atlas

The project uses Next.js 16, React 19, Auth.js 5 beta, Mongoose 9, TypeScript,
Tailwind CSS 4, and ESLint.

## Installation

From the repository root:

```bash
npm install
```

Create `.env.local` from `.env.example` and provide the required values:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
AUTH_SECRET=<long-random-secret>
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` remain in `.env.example` for future
Google authentication, but Google sign-in is currently commented out in
`src/auth.ts`. Never commit `.env.local` or expose database credentials,
OAuth secrets, or `AUTH_SECRET`.

Start development:

```bash
npm run dev
```

Open <http://localhost:3000>.

Production commands:

```bash
npm run lint
npm run build
npm run start
```

The MongoDB helper forces IPv4 and TLS because the development environment has
experienced Windows IPv6/TLS handshake failures. A failed connection promise
is cleared so a later request can retry.

## Folder Structure

```text
src/
	app/
		page.tsx                         Home page: /
		layout.tsx                       Root layout and metadata
		globals.css                      Global styles and Tailwind layers
		login/page.tsx                   Signup and login forms: /login
		onboarding/page.tsx              Incomplete-profile page: /onboarding
		dashboard/page.tsx               Protected workspace: /dashboard
		api/
			auth/[...nextauth]/route.ts    Auth.js GET/POST handlers
			health/db/route.ts             MongoDB GET health check
	auth.config.ts                     Shared Auth.js configuration
	auth.ts                             Auth.js Credentials provider and callbacks
	proxy.ts                            Route protection and redirects
	lib/
		mongodb.ts                        Cached Mongoose connection
		session.ts                        Session-user helpers
		users.ts                          User creation, lookup, and password hashing
	models/
		User.ts                           Mongoose User schema and indexes
	types/
		next-auth.d.ts                    Auth.js Session/JWT type extensions
public/                               Static assets
scripts/test-mongo.mjs                Direct MongoDB connection probe
```

## Browser Routes

### `GET /`

Renders the home page. It reads the current Auth.js session and shows:

- `Sign in` for an anonymous visitor, linking to `/login`.
- `Log in` for an anonymous visitor, linking to `/login?mode=login`.
- `Continue` for an authenticated user, linking to `/dashboard` when the
	profile is complete or `/onboarding` otherwise.

### `GET /login`

Renders the profile creation form. The form collects:

- Full name
- Unique username
- Unique phone number
- Unique email address
- Password, minimum 8 characters

Submission is a Next.js server action that calls Auth.js Credentials sign-in
with `mode=signup`. A successful submission creates the user, creates a JWT
session, and redirects to `/dashboard`. Duplicate username, phone, or email
values are shown as a message on the form.

### `GET /login?mode=login`

Renders the existing-user login form. The user submits one `identifier` value,
which may be a username, phone number, or email address, plus a password. A
successful login redirects to `/dashboard`. Invalid credentials return the
message `The login details are incorrect.`.

### `GET /onboarding`

Requires an authenticated session. It is intended for users whose
`profileCompleted` value is false. The current signup flow creates completed
profiles, so this route mainly supports existing or future incomplete-profile
flows. Completed users are redirected to `/dashboard`; anonymous users are
redirected to `/login`.

### `GET /dashboard`

Requires an authenticated session with `profileCompleted=true`. It displays
the session user ID, name, username, phone, email, and profile status. The
Sign out button is a server action that ends the Auth.js session and redirects
to `/login`.

## API Routes

### `GET /api/health/db`

Checks whether Mongoose can connect to MongoDB.

Success response, HTTP `200`:

```json
{
	"success": true,
	"message": "MongoDB connected successfully"
}
```

Failure response, HTTP `500`:

```json
{
	"success": false,
	"message": "MongoDB connection failed"
}
```

The server logs the underlying connection error, but the response intentionally
does not expose credentials or driver details.

### `/api/auth/[...nextauth]`

Auth.js owns this catch-all route and exports both `GET` and `POST` handlers.
It serves Auth.js session and credential-auth protocol requests. Application
code should use the server exports from `src/auth.ts` (`auth`, `signIn`, and
`signOut`) instead of calling this route directly.

The active provider is Credentials. Google provider code is retained as a
comment for future use but is not registered.

## Authentication Flow

1. The login page sends form data to a server action.
2. The server action calls `signIn("credentials", ...)`.
3. Auth.js calls `authorize` in `src/auth.ts`.
4. Signup uses `createUserFromProfile` to validate uniqueness, hash the
	 password with Node `scrypt`, and create a MongoDB user.
5. Login uses `findUserForLogin` to find by email, username, or phone and
	 verifies the password with `timingSafeEqual`.
6. The JWT callback stores the MongoDB user ID, completion status, username,
	 phone, and email-verification status in the token.
7. The session callback copies those values to `session.user`.
8. `src/proxy.ts` protects `/dashboard` and `/onboarding` before the page
	 renders.

Authentication uses JWT sessions. The application does not currently send
email verification messages; new users are stored with `emailVerified=false`.

## Database Model

`src/models/User.ts` defines the MongoDB `User` collection:

| Field | Type | Rules | Purpose |
| --- | --- | --- | --- |
| `_id` | ObjectId | Generated by MongoDB | Session user ID |
| `name` | String | Optional | Full name |
| `username` | String | Required, unique, lowercase | Login identifier |
| `phone` | String | Required, unique | Login identifier |
| `email` | String | Required, unique, lowercase | Login identifier and future verification target |
| `passwordHash` | String | Optional for legacy/provider users | Salted `scrypt` password hash |
| `provider` | String | Required | Currently `credentials` |
| `providerAccountId` | String | Required, unique with provider | Provider identity key |
| `profileCompleted` | Boolean | Required, default false | Route guard state |
| `emailVerified` | Boolean | Required, default false | Future email verification state |
| `createdAt` / `updatedAt` | Date | Automatic | Mongoose timestamps |

Unique indexes exist on `email`, `username`, `phone`, and the compound
`provider + providerAccountId` pair. Application-level duplicate checks provide
friendly messages; database indexes remain the final uniqueness protection.

## AI Coding Notes

When extending this project:

- Use the App Router under `src/app`.
- Keep database reads and writes on the server. Do not expose `MONGODB_URI` or
	password hashes to client components.
- Reuse `connectToDatabase()` from `src/lib/mongodb.ts`; do not create a new
	connection per request.
- Reuse `auth`, `signIn`, and `signOut` from `src/auth.ts` for Auth.js work.
- Use `requireSessionUser()` for pages that need an authenticated user.
- Add route handlers under `src/app/api/**/route.ts` and export explicit HTTP
	methods such as `GET` or `POST`.
- Update `src/types/next-auth.d.ts` whenever adding fields to the session or
	JWT token.
- Preserve unique database constraints when adding alternate login fields.
- Return safe, stable JSON messages from API routes; log detailed server-only
	errors with care.

## Current Limitations

- Email verification is represented in the model but not implemented.
- Google sign-in is disabled.
- Onboarding does not yet update profile data.
- Skill assessments, verification, and team discovery are placeholders.
- There are no automated tests in the current package scripts.
