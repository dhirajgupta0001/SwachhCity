# SwachhCity Testing Guide (Phase 13)

This document describes the testing strategy and procedures for the SwachhCity municipal waste management application.

## 1. Testing Strategy

The application employs a comprehensive three-tier testing strategy ensuring robust security and role-based workflows:

*   **Unit & Integration Tests (Vitest & Testing Library)**: Rapid verification of pure utility functions, validations, layout logic, and Server Action boundaries (using mocked Supabase clients).
*   **End-to-End Tests (Playwright)**: Full browser-based simulation of user journeys (Citizen, Collector, Admin), strictly evaluating rendering, navigation, and protected routes.

## 2. Test Environment Setup

**WARNING**: Do NOT run end-to-end tests against the production database. Automated tests alter, insert, and delete data rapidly.

1.  **Local Supabase Environment**: Use `supabase start` to spin up a local instance. This provides an isolated local PostgreSQL database and Auth server.
2.  **Environment Variables**: Create a `.env.test.local` file containing the credentials to your isolated Supabase instance. Playwright or Vitest will automatically pick this up.
    ```env
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    SUPABASE_SERVICE_ROLE_KEY=...
    ```

## 3. Test User Accounts (Fixtures)

For executing manual and automated integration tests securely, seed your local test database with the following profiles. Passwords should be `TestPassword123!`.

*   **Citizen A** (`citizen_a@test.local`) - Standard `ACTIVE` citizen.
*   **Citizen B** (`citizen_b@test.local`) - For testing ownership boundaries (e.g. A cannot see B's data).
*   **Collector A** (`collector_a@test.local`) - Standard `ACTIVE` collector.
*   **Admin A** (`admin_a@test.local`) - Standard `ACTIVE` municipal administrator.
*   **Suspended Citizen** (`suspended@test.local`) - Testing `status = SUSPENDED` blocks.

## 4. How to Run Tests

### Unit and Integration Tests

Run Vitest to verify all localized utilities and server action logic:
```bash
npm run test
```
To run tests in watch mode during development:
```bash
npm run test:watch
```

### End-to-End Tests (E2E)

Playwright evaluates the actual UI rendered in Chrome/Safari/Firefox. Ensure your test local server is running or configure Playwright to start it:
```bash
npx playwright test
```
To run E2E tests in UI mode (interactive debugger):
```bash
npx playwright test --ui
```

## 5. Security & Authorization Coverage

Our integration testing heavily mocks the `SupabaseClient` to assert that:
*   Server Actions (`actions/complaint.ts`, `actions/admin.ts`) explicitly enforce `status` and `priority` fields.
*   `submitComplaint` ignores any client-injected fields and locks `citizen_id` to the server-authenticated session user.
*   `verifyAdmin` explicitly traps and denies non-administrative JWT tokens from executing sensitive analytics or user-management routines.
*   Next.js Middleware redirects unauthenticated users or those with `SUSPENDED` profiles before route rendering.

## 6. Continuous Integration (CI) Readiness

This repository is ready for CI pipelines (e.g. GitHub Actions, Vercel). A recommended CI workflow runs:
1. `npm ci`
2. `npm run lint`
3. `npm run test` (Vitest)
4. `npm run build`
5. *Optional*: `npx playwright test` if connecting to a seeded staging database.
