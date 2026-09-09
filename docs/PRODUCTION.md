# SwachhCity Production & Deployment Guide (Phase 14)

## Overview
This document outlines the final production-readiness constraints, configuration parameters, and operational requirements to securely deploy and operate the SwachhCity municipal application.

## 1. Environment & Secrets Configuration

All database operations and server actions securely rely on Supabase Service Keys instantiated exclusively on the server. Next.js handles stripping `.env` contents from client bundles.

### Required Environment Variables

```env
# Exposed to Next.js Client
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Strictly Server-Side (Do NOT prefix with NEXT_PUBLIC)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
*   **Security Warning**: `SUPABASE_SERVICE_ROLE_KEY` has full bypass capabilities over Row Level Security (RLS). Ensure this is managed strictly through Vercel/Cloudflare secure environment vaults. Never commit to source control.

## 2. Rate Limiting & API Abuse Prevention

SwachhCity's architecture uses server-rendered React Server Actions. The application relies on infrastructure-level rate limiting rather than application-layer memory bounds.

**Recommended Infrastructure Configuration (e.g. Vercel / Cloudflare / NGINX):**
1.  **Strict Limits (`/login`, `/register`)**:
    *   Limit to ~5 requests / minute per IP to prevent credential stuffing.
2.  **Operational Limits (`/report`, `/pickup`)**:
    *   Limit form actions to ~10 requests / minute per IP to prevent spam while allowing legitimate bulk entries.
3.  **Supabase Auth Layer**:
    *   Enable Supabase’s built-in email/password rate limits and CAPTCHA integrations from the Supabase dashboard.

## 3. Database & Backup Readiness

The PostgreSQL database acts as the single source of truth for authorization, assignments, and operations.

**Operational Recommendations:**
*   **Backups**: Enable Supabase Point-in-Time Recovery (PITR) for at least 7 days of daily retention.
*   **Storage Retention**: The `complaint-evidence` bucket can grow quickly. Ensure you define a lifecycle hook within Supabase or AWS S3 to transition objects older than 365 days to cold storage.
*   **Migration Discipline**: Never run raw SQL directly in the production query editor. Use the provided migration scripts (`supabase/phaseX_schema.sql`) checked into version control.

## 4. Known Environmental Constraints

**Build Errors in Constrained Environments (Turbopack / Leaflet)**
*   If you encounter a `TurbopackInternalError` concerning `node_modules/leaflet/dist/leaflet.css` during `next build`, this is a known issue where constrained CI/sandbox environments terminate child processes during PostCSS evaluation. 
*   *Workaround*: Build on standard Vercel or local host systems without ultra-strict node-forking sandbox restrictions. The application logic is completely sound.

## 5. Security Smoke Test & Final Walkthrough Checklist

Before cutting a public municipal release, administrators should perform a final manual smoke test verifying:
- [x] Unauthenticated users are hard-redirected to `/login` when navigating to `/dashboard`.
- [x] A Citizen attempting to access `/admin/dashboard` is denied and safely redirected.
- [x] Collectors can only view maps and upload evidence for tasks matching their `assigned_collector_id`.
- [x] RLS explicitly blocks any `UPDATE` statements to the `profiles.role` column by non-admins.
- [x] `status = SUSPENDED` profiles receive a forced sign-out loop when hitting any API boundary.

## 6. Future Enhancements (Out of Scope for v1.0)
The following were identified but explicitly deferred to maintain system integrity for v1.0:
1.  **AI Image Recognition**: Verifying complaint evidence for actual waste classification.
2.  **Predictive Fleet Optimization**: Using ML to generate the most efficient pickup routes based on aggregated coordinates.
3.  **External Notifications**: Webhooks sending SMS / WhatsApp messages for citizen updates.
4.  **Gamification**: Citizen leaderboards for most "clean" submissions.
