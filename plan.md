# LibreSociety signup moderation dashboard plan

## Implementation status

Implemented and deployed on November 14, 2026. The Worker now lists pending signup requests for admins and supports approve or deny decisions with server-side admin checks and audit fields. The React terminal has an `admin` panel with confirmation actions. Signup notification emails link to the panel instead of containing CLI decisions. The one-time initial admin bootstrap remains necessary because the database has no admin account.

## Scope

This is an investigation and implementation plan only. No application code, deployment, database rows, or account state was changed for this report.

## Findings

- The public app is a React SPA hosted on GitHub Pages. It calls a separate Cloudflare Worker API, which stores users and signup requests in D1.
- Signup requests are already stored in `signup_requests` with a salted password hash, username, request timestamp, and pending, approved, or rejected status.
- Signup notifications currently contain shell commands for approving or denying a request. This is the CLI work the dashboard should replace.
- `users.is_admin` already exists in the D1 schema. However, the Worker does not expose an endpoint for listing or reviewing signup requests. Its current admin endpoints only review game submissions.
- The app stores an opaque bearer session token in browser local storage. Existing Worker admin checks can use the session and `is_admin`, but every new admin API route must enforce that check on the server. Hiding dashboard controls in React is not authorization.
- GitHub Pages is static, so the dashboard should be part of the existing React app and use the existing Worker API. Do not add a second hosting service or expose an admin key in frontend code.
- A read-only count of the live D1 database showed one pending signup request, zero user accounts, and zero admins. No request details were read or changed.
- The current workspace already has a user deletion of `prompt.md`. It was left untouched.

## Recommended experience

Add a small owner-only moderation panel within the terminal app. Make it available through an `admin` command and a compact header link for signed-in administrators. Keep the existing terminal as the normal interface.

The panel should show pending signup requests with username, submission time, and request ID. Give each row clear **Approve** and **Deny** actions, with a confirmation before the decision is submitted. After an action, remove or update the row and show a short success or error message. Do not display the password hash, salt, or any other credential material.

Signup notification emails should become simple alerts with a link to the app's admin panel. The email should no longer include database commands. The notification remains useful as a prompt while the panel becomes the place to review and decide.

## Backend changes needed

Add authenticated admin routes to the Worker:

- `GET /api/admin/signup-requests` returns a bounded, ordered list of pending request metadata only.
- `POST /api/admin/signup-requests/:id/decision` accepts `approve` or `deny` and performs the change atomically.

For both routes, require a valid session and verify `users.is_admin = 1` on the server. Return `401` for signed-out users and `403` for non-admin users. Never trust a role or admin flag supplied by the browser.

Approval should create a user from the saved password hash only if the username is still available, then mark the matching request approved. Denial should mark only the matching pending request rejected. Decisions should be idempotent or return a clear conflict when a request is no longer pending. Record a decision timestamp and actor if the schema is extended for an audit trail.

## Initial admin bootstrap

There are currently no user accounts or admins, so an admin-only dashboard cannot bootstrap itself. Keep a one-time owner bootstrap step outside public signup. Recommended path:

1. Submit an account request using the public form.
2. Use one D1 command to approve that specific request and set its new user's `is_admin` value to `1`.
3. Sign in with that account. From then on, handle requests in the dashboard without Wrangler or D1 CLI commands.

Do not make the first public signup an administrator automatically. Do not add a bootstrap secret to frontend code. The one-time bootstrap statement should be documented and scoped to a single request ID.

## Security and reliability requirements

- Check administrator status in the Worker on every list and decision request.
- Return only request ID, username, and submitted timestamp to the dashboard.
- Keep the D1 password hash inaccessible to admin list responses and email content.
- Validate request IDs and decision values, and use parameterized SQL.
- Prevent approving a request if another account has claimed its username.
- Confirm approval and denial actions in the UI to avoid accidental clicks.
- Keep all API credentials and inbox configuration in Worker secrets.
- Add tests for signed-out access, non-admin access, admin listing, approve, deny, repeated decisions, and username collision.
- Preserve the current static GitHub Pages plus Cloudflare Worker and D1 architecture.

## Suggested implementation order

1. Add server-side list and decision endpoints with authorization and transactional D1 operations.
2. Add focused Worker tests for authorization and state transitions.
3. Add the terminal admin panel, loading and empty states, confirmation, and error handling.
4. Replace email SQL commands with a dashboard link and request summary.
5. Bootstrap the first administrator once, then verify the dashboard using that account.
6. Run build and tests, deploy the Worker, push the Pages update, and verify an approval and denial end to end.

## Open decision

The current inbox contains one pending request. The dashboard can display it after an administrator exists. No action has been taken on that request.
