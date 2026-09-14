# PRAMAAN

PRAMAAN turns technical skill claims into evidence-backed profiles and helps hackathon teams find complementary participants. Authentication is intentionally not part of this product: a secure, HTTP-only browser cookie selects the active local profile and is not identity verification.

## Start locally

1. Install Node.js 20.9 or later and MongoDB Atlas (or a local MongoDB instance).
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `MONGODB_URI`.
4. Optionally set `GEMINI_API_KEY` to generate fresh assessment questions. Without it, PRAMAAN uses a vetted fallback question bank.
5. Run `npm run dev`, then open `http://localhost:3000`.
6. Create a local profile at `/onboarding`, add skills and evidence, take an assessment, then create or join a hackathon.

## Environment variables

- `MONGODB_URI` — MongoDB Atlas connection string.
- `GEMINI_API_KEY` — server-only Gemini key for question generation.
- `GEMINI_MODEL` — optional Gemini model override.
- `CODE_EXECUTION_API_URL` — optional URL of a separately deployed sandboxed evaluator.
- `CODE_EXECUTION_API_KEY` — optional server-only evaluator credential.

Never expose any of these values with a `NEXT_PUBLIC_` prefix or commit `.env.local`.

## Assessments and integrity

Assessment time limits are enforced by the server, question answer keys and hidden tests never reach the browser, and submissions can only be finalized once. Camera and microphone use is explicit, preview-only, and is cleaned up after the session; neither video nor audio is stored. Browser visibility, focus, fullscreen, and permission events create integrity-risk signals. They are not proof that someone cheated.

Candidate code is never executed in the Next.js server. A coding submission is evaluated only when `CODE_EXECUTION_API_URL` points to a separately secured sandbox service; otherwise it is stored and the UI clearly reports that it was not executed.

## Test and deploy

Run:

```bash
npm run lint
npx tsc --noEmit
npm run test:mongodb
npm run test:integration
npm run test:api # with npm run dev running in another terminal
npm run build
```

For Vercel, import the repository, add the environment variable names above in Project Settings → Environment Variables, and deploy. Use a MongoDB Atlas network-access rule compatible with Vercel and create a database user with only the required database permissions. Browser camera, microphone, and fullscreen APIs require HTTPS in production.

## Current no-auth boundary

The active profile is scoped to a browser cookie so the product can operate without an authentication framework. For a multi-person demonstration, create different local profiles in separate browsers/browser profiles. This deliberately does not verify real-world identity.
