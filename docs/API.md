# HumanMetrix — API Reference

> Cross-links: [Architecture](./ARCHITECTURE.md) · [Deployment Guide](./DEPLOYMENT.md)

---

## Overview

All endpoints are served from the same origin as the web application (Express + Vite on the same port). There are two distinct authentication mechanisms:

| Auth type | Used by | Header / Mechanism |
|---|---|---|
| **Session cookie** | Candidates, partner portal users, admins | `Cookie: connect.sid=…` (set on login) |
| **API key (Bearer)** | B2B partner server-to-server integrations | `Authorization: Bearer <api_key>` |

Unless noted, all request bodies are `Content-Type: application/json`.

> **Schema accuracy note**: Request and response examples throughout this document are illustrative reference shapes derived from the current implementation. For machine-readable strict contracts on partner-facing endpoints, the canonical source is the live `GET /api/partner/openapi.json` endpoint. All `super_admin`-only routes under `/api/admin/` are out of scope for this document and are intentionally omitted.

Webhook endpoints consume `application/json` or `application/octet-stream` (raw body) as noted.

---

## Table of Contents

1. [System](#1-system)
2. [Authentication](#2-authentication)
3. [Assessments — Candidate](#3-assessments--candidate)
4. [Payments — B2C](#4-payments--b2c)
5. [Results — Candidate](#5-results--candidate)
6. [Invitations](#6-invitations)
7. [B2B Candidate Flow (unauthenticated)](#7-b2b-candidate-flow-unauthenticated)
8. [Partner API (Bearer Auth)](#8-partner-api-bearer-auth)
9. [Partner Portal (Session Auth)](#9-partner-portal-session-auth)
10. [Ecosystem Index](#10-ecosystem-index)
11. [Admin Endpoints (Excluded)](#11-admin-endpoints)
12. [Webhook Endpoints](#12-webhook-endpoints)
13. [File / Object Storage](#13-file--object-storage)
14. [Public / Unauthenticated](#14-public--unauthenticated)

---

## 1. System

### `GET /api/version`

Returns the running server version and scoring logic identifier.

**Auth**: None

**Response**
```json
{
  "version": "2.0-normalized-scoring",
  "deployed": "2026-04-18T12:00:00.000Z",
  "scoringLogic": "normalized"
}
```

---

### `GET /api/geolocation`

Returns the caller's geolocation and a VPN detection flag. Used by the frontend to set the default currency.

**Auth**: None  
**Cache**: `no-store` (always fresh)

**Response**
```json
{
  "countryCode": "GB",
  "country": "United Kingdom",
  "detected": true,
  "source": "ip-api",
  "isVPN": false
}
```

---

### `GET /api/exchange-rates`

Returns cached foreign-exchange rates relative to GBP.

**Auth**: None

**Response**
```json
{
  "USD": 1.27,
  "EUR": 1.18,
  "SGD": 1.71
}
```

---

## 2. Authentication

All auth endpoints are registered in `server/auth.ts`.

### `POST /api/signup`

Create a new candidate account.

**Auth**: None

**Request body**
```json
{
  "email": "jane@example.com",
  "password": "min-8-chars",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response `200`**
```json
{ "id": "uuid", "email": "jane@example.com", "firstName": "Jane", "lastName": "Doe", "role": "candidate" }
```

**Errors**: `400` validation failed or email already registered · `429` too many signup attempts

---

### `POST /api/login`

Authenticate and receive a session cookie.

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com", "password": "secret" }
```

**Response `200`**
```json
{ "id": "uuid", "email": "jane@example.com", "role": "candidate" }
```
Sets `Set-Cookie: connect.sid=…`

**Errors**: `401` invalid credentials · `429` too many attempts

---

### `POST /api/logout`

Destroy the current session.

**Auth**: Session cookie

**Response `200`**
```json
{ "message": "Logged out successfully" }
```

---

### `POST /api/request-password-reset`

Send a password-reset link to the given email.

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response `200`** (always, to prevent email enumeration)
```json
{ "message": "If an account exists, a reset email has been sent." }
```

---

### `POST /api/reset-password`

Reset password using a token from the reset email.

**Auth**: None

**Request body**
```json
{ "token": "hex-token", "newPassword": "newSecret123" }
```

**Response `200`**
```json
{ "message": "Password reset successfully" }
```

---

### `POST /api/change-password`

Change password while logged in.

**Auth**: Session cookie

**Request body**
```json
{ "currentPassword": "old", "newPassword": "new" }
```

**Response `200`**
```json
{ "message": "Password changed successfully" }
```

---

### `GET /api/auth/user`

Returns the currently authenticated user profile.

**Auth**: Session cookie

**Response `200`**
```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "candidate",
  "organizationId": null
}
```

---

### `POST /api/auth/auto-login`

One-click login via a single-use auto-login token (emailed to the candidate).

**Auth**: None

**Request body**
```json
{ "token": "hex-token" }
```

**Response `200`**: Same shape as `GET /api/auth/user`. Sets session cookie.

---

## 3. Assessments — Candidate

Candidates must have a paid (or free) purchase item before starting an assessment.

### `GET /api/available-assessments`

Lists assessments the authenticated candidate has access to (paid or free via invitation).

**Auth**: Session cookie

**Response `200`**
```json
[
  {
    "assessmentType": "fit",
    "status": "not_started",
    "purchaseItemId": "uuid"
  }
]
```

---

### `POST /api/assessments/start`

Creates an `assessmentResults` record and starts the timer.

**Auth**: Session cookie

**Request body**
```json
{
  "assessmentType": "fit",
  "purchaseItemId": "uuid"
}
```

**Response `201`**
```json
{
  "resultId": "uuid",
  "timeLimitSeconds": 1200,
  "questionLocale": "default"
}
```

---

### `POST /api/assessments/:id/submit`

Submit answers and trigger scoring. For `prompt_architecture`, scoring is asynchronous (GPT-4o evaluation).

**Auth**: Session cookie

**Request body**
```json
{
  "answers": { "q1": "A", "q2": "B" }
}
```

**Response `200`**
```json
{
  "status": "completed",
  "scores": { "HA": 72, "IC": 65 },
  "totalScore": 68
}
```

For `prompt_architecture`, returns `status: "evaluating"`. Poll `GET /api/assessments/:id/status`.

---

### `POST /api/assessments/:id/heartbeat`

Sync remaining timer to the server. Server rejects updates that increase time.

**Auth**: Session cookie

**Request body**
```json
{ "timeRemainingMs": 540000 }
```

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/assessments/:id/pause`

Pause the assessment (stores remaining time; 30-minute grace period begins).

**Auth**: Session cookie

**Request body**
```json
{ "timeRemainingMs": 300000 }
```

**Response `200`**
```json
{
  "paused": true,
  "graceExpiresAt": "2026-04-18T13:00:00.000Z"
}
```

---

### `POST /api/assessments/:id/resume`

Resume a paused assessment. Allowed once per assessment.

**Auth**: Session cookie

**Response `200`**
```json
{
  "resumed": true,
  "timeRemainingMs": 300000
}
```

---

### `POST /api/assessments/:id/abandon`

Mark an assessment as abandoned.

**Auth**: Session cookie

**Response `200`**
```json
{ "abandoned": true }
```

---

### `GET /api/assessments/:id/status`

Poll the evaluation status of a submitted assessment.

**Auth**: Session cookie

**Response `200`**
```json
{
  "status": "evaluating",
  "progress": { "levelsCompleted": 4, "totalLevels": 7 }
}
```

Possible status values: `in_progress` · `evaluating` · `completed` · `evaluation_failed`

---

## 4. Payments — B2C

### `POST /api/validate-discount`

Validate a discount code before checkout.

**Auth**: None

**Request body**
```json
{ "code": "FREE" }
```

**Response `200`**
```json
{
  "valid": true,
  "discountPercent": 100,
  "message": "100% discount applied"
}
```

---

### `POST /api/create-checkout-session`

Creates a Stripe or Airwallex checkout session for one or more assessments.

**Auth**: Session cookie

**Request body**
```json
{
  "assessmentIds": ["fit", "ai_readiness"],
  "countryCode": "GB",
  "discountCode": "20OFFPRICE"
}
```

**Response `200`**
```json
{
  "url": "https://checkout.stripe.com/…",
  "provider": "stripe"
}
```

---

### `POST /api/checkout-free`

Create a new candidate account and free purchase without payment (used for 0-cost promotional flows). Creates the account, issues assessments, and sends login credentials via email.

**Auth**: None

**Request body**
```json
{
  "assessmentIds": ["fit", "ai_readiness"],
  "customerEmail": "jane@example.com",
  "customerName": "Jane Doe",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response `200`**
```json
{ "success": true, "message": "Account created successfully! Check your email for login credentials." }
```

**Errors**: `400` email already registered (use login instead) · `400` missing required fields

---

### `POST /api/create-free-purchase`

Grant the authenticated user access to one or more assessments at no cost (used for promotional or partner-funded access).

**Auth**: Session cookie

**Request body**
```json
{ "assessmentIds": ["fit", "ai_readiness"] }
```

**Response `200`**
```json
{
  "success": true,
  "message": "Assessments added to your account! You can now take them for free.",
  "purchaseId": "uuid"
}
```

**Errors**: `400` invalid/empty `assessmentIds` array

---

### `POST /api/process-payment-success`

Called by the frontend after Stripe redirects back to confirm payment completion.

**Auth**: None (uses Stripe session ID to verify)

**Request body**
```json
{ "sessionId": "cs_live_…" }
```

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/create-free-invitation`

Create or extend a free assessment purchase for a candidate (self-service or invitation-linked). Accepts both authenticated users and unauthenticated guests; will create a new account if the email is unrecognised.

**Auth**: None (or session cookie for already-logged-in users)

**Request body**
```json
{
  "assessmentIds": ["fit", "ai_readiness"],
  "email": "candidate@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "hunter2"
}
```
> `password` is only required for existing-user login from an unauthenticated context.  
> `firstName` / `lastName` are required for new-user account creation only.

**Response `200`**
```json
{
  "success": true,
  "message": "Account created! Check your email for login instructions.",
  "requiresLogin": true
}
```
> `requiresLogin: false` when the caller is already authenticated or successfully auto-authenticated via `password`.

---

## 5. Results — Candidate

### `GET /api/results`

List all completed assessment results for the current user.

**Auth**: Session cookie

**Response `200`**
```json
[
  {
    "id": "uuid",
    "assessmentType": "fit",
    "status": "completed",
    "totalScore": 72,
    "completedAt": "2026-04-18T10:00:00.000Z"
  }
]
```

---

### `GET /api/results/:id`

Retrieve a single assessment result including full scores and evaluations.

**Auth**: Session cookie (must own the result)

**Response `200`**
```json
{
  "id": "uuid",
  "assessmentType": "fit",
  "status": "completed",
  "scores": { "HA": 72, "IC": 65, "RA": 80 },
  "totalScore": 72,
  "evaluations": []
}
```

---

### `GET /api/prompt-evaluations/:resultId`

Retrieve per-level Prompt Architecture evaluations.

**Auth**: Session cookie

**Response `200`**
```json
[
  {
    "level": 1,
    "totalScore": 18,
    "feedback": "Good context-setting…",
    "status": "completed"
  }
]
```

---

### `POST /api/results-retention-consent`

Record the candidate's consent to retain their results.

**Auth**: Session cookie

**Request body**
```json
{ "consent": true }
```

**Response `200`**
```json
{ "saved": true }
```

---

### `GET /api/my-candidate-data`

Returns the candidate's complete profile data (for GDPR data export).

**Auth**: Session cookie

**Response `200`**: Full user + results + purchases JSON object.

---

### `GET /api/user/my-data-export`

Download a full GDPR data export (alias of the above, JSON format).

**Auth**: Session cookie

**Response `200`**: JSON object with all user data.

---

### `DELETE /api/user/account`

Immediately delete the current user account and all associated data.

**Auth**: Session cookie

**Response `200`**
```json
{ "message": "Account deleted" }
```

---

### `POST /api/user/request-account-deletion`

Request scheduled account deletion (30-day grace period).

**Auth**: Session cookie

**Response `200`**
```json
{ "message": "Deletion scheduled", "scheduledAt": "2026-05-18T12:00:00.000Z" }
```

---

### `POST /api/user/accept-terms`

Record that the current user has accepted the latest terms of service.

**Auth**: Session cookie

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/user/onboarding-preferences`

Save the user's onboarding preferences (role, industry, goals) collected at first login.

**Auth**: Session cookie

**Request body**
```json
{ "role": "hiring_manager", "industry": "tech", "goals": ["speed", "quality"] }
```

**Response `200`**
```json
{ "success": true }
```

---

### `GET /api/user/notification-preferences`

Retrieve the current user's notification preferences.

**Auth**: Session cookie

**Response `200`**: Object with boolean flags for each notification type.

---

### `PATCH /api/user/notification-preferences`

Update notification preferences.

**Auth**: Session cookie

**Request body**: Partial object with boolean notification flags.

**Response `200`**: Updated preferences object.

---

### `POST /api/unlock-results`

Create or retrieve a pending purchase to unlock assessment results (authenticated checkout initiation).

**Auth**: Session cookie

**Request body**
```json
{
  "discountCode": "PROMO10",
  "purchaseId": "uuid-optional",
  "countryCode": "GB",
  "isVPN": false
}
```

**Response `200`**: Pending purchase details with pricing and currency.

---

### `POST /api/process-results-payment`

Confirm a completed Stripe or Airwallex payment for a results purchase. Session cookie is not required — the payment session acts as authentication.

**Auth**: None (payment session validates the request)

**Request body**
```json
{ "sessionId": "cs_live_…", "intentId": null, "provider": "stripe" }
```

For Airwallex, pass `intentId` instead of `sessionId` and set `provider: "airwallex"`.

**Response `200`**
```json
{ "success": true }
```

**Errors**: `400` payment not completed

---

## 6. Invitations

### `GET /api/invitation-status`

Check whether the current user has an active invitation.

**Auth**: Session cookie

**Response `200`**
```json
{
  "hasInvitation": true,
  "invitation": {
    "id": "uuid",
    "assessmentTypes": ["fit"],
    "status": "sent"
  }
}
```

---

### `POST /api/check-email-exists`

Check whether an email is already registered (used pre-invite).

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response `200`**
```json
{ "exists": true }
```

---

### `POST /api/submit-reference`

Submit a written reference.

**Auth**: Session cookie

**Request body**
```json
{ "referenceText": "At least 50 words…" }
```

**Response `200`**
```json
{ "success": true, "reference": { "id": "ref_abc", "text": "At least 50 words…" } }
```

---

### `GET /api/reference-status`

Check whether the current user has already submitted a reference.

**Auth**: Session cookie

**Response `200`**
```json
{ "hasSubmitted": true }
```

---

## 7. B2B Candidate Flow (Unauthenticated)

These endpoints are accessed by candidates completing assessments embedded in partner applications. No session cookie required for most; some use a one-time invite token.

### `GET /api/b2b/session-results/:sessionId`

Get basic session result data (used in the results landing page embed).

**Auth**: None (sessionId acts as token)

**Response `200`**
```json
{
  "sessionId": "uuid",
  "assessmentType": "fit",
  "status": "completed",
  "scores": { "HA": 72 },
  "isPaid": false
}
```

---

### `GET /api/b2b/results/:sessionId`

Get full B2B results including AI report (requires paid or partner-covered session).

**Auth**: None

**Response `200`**
```json
{
  "sessionId": "uuid",
  "scores": { "HA": 72, "IC": 65 },
  "aiInsights": "…",
  "reportUrl": null
}
```

---

### `POST /api/b2b/results/:sessionId/checkout`

Create a payment checkout to purchase access to B2B results.

**Auth**: None

**Request body**
```json
{ "countryCode": "SG" }
```

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/…" }
```

---

### `POST /api/b2b/process-payment`

Confirm payment for a B2B results session.

**Auth**: None

**Request body**
```json
{ "sessionId": "stripe-cs_…", "assessmentSessionId": "uuid" }
```

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/b2b/create-account`

Create a candidate account from the B2B results page (so results are saved to the candidate's profile).

**Auth**: None

**Request body**
```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "sessionId": "uuid"
}
```

**Response `201`**
```json
{ "userId": "uuid", "autoLoginToken": "hex" }
```

---

### `POST /api/b2b/results/:sessionId/generate-pdf`

Trigger server-side Puppeteer PDF generation for a B2B results session.

**Auth**: None (sessionId acts as token)

**Response `200`**
```json
{ "pdfUrl": "https://…/report.pdf" }
```

---

### `POST /api/b2b/results/:sessionId/resend-email`

Resend the B2B results email to the candidate.

**Auth**: None (sessionId acts as token)

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/b2b/results/:sessionId/send-pdf-email`

Generate and email the PDF report to the candidate.

**Auth**: None (sessionId acts as token)

**Response `200`**
```json
{ "success": true }
```

---

### `GET /api/b2b/results-bundle`

Get a bundled set of results for a group invite token.

**Auth**: None

**Query params**: `token=<inviteToken>`

**Response `200`**: Array of session result summaries.

---

### Embed Session Endpoints (used by partner widget)

These endpoints are called by the JavaScript embed widget (`/embed/widget.js`) to drive the in-iframe assessment flow.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/embed/session/:sessionId` | None | Get session metadata for the embed |
| `POST` | `/api/embed/session/:sessionId/send-verification-code` | None | Send OTP to candidate email |
| `POST` | `/api/embed/session/:sessionId/verify-email` | None | Verify OTP code |
| `POST` | `/api/embed/session/:sessionId/start` | None | Start the embedded assessment |
| `POST` | `/api/embed/session/:sessionId/submit` | None | Submit answers from the embed |
| `POST` | `/api/embed/session/:sessionId/progress` | None | Save in-progress answers |
| `PATCH` | `/api/embed/session/:sessionId/progress` | None | Update in-progress answers |

---

### `POST /api/b2b/results-bundle/checkout`

Create a checkout session to purchase access to a full group results bundle.

**Auth**: None

**Request body**
```json
{ "token": "bundleToken", "countryCode": "GB" }
```

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/…" }
```

---

### `POST /api/b2b/results-bundle/process-payment`

Confirm payment for a results bundle.

**Auth**: None

**Response `200`**
```json
{ "success": true }
```

---

### `GET /embed/widget.js`

JavaScript embed widget for partners. Load in a `<script>` tag on the partner's page to render the assessment iframe.

**Auth**: None

---

### `GET /embed/sdk.js`

Partner JavaScript SDK. Provides a higher-level API for session management around the embed widget.

**Auth**: None

---

### `GET /api/invite/:token`

Look up an invitation by token (used to prefill the candidate's landing page).

**Auth**: None

**Response `200`**
```json
{
  "candidateName": "Jane Doe",
  "assessmentTypes": ["fit"],
  "partnerName": "Acme Corp",
  "expiresAt": "2026-05-01T00:00:00.000Z"
}
```

---

### `POST /api/invite/:token/start`

Start an assessment from an invite link (creates or finds the candidate account).

**Auth**: None (may set session cookie)

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response `200`**
```json
{ "resultId": "uuid" }
```

---

### `POST /api/invite/:token/complete`

Mark the invite as completed after all assessments are submitted.

**Auth**: None

**Response `200`**
```json
{ "success": true }
```

---

### `GET /api/guest/invite/:token`

Look up a guest invitation (partner-issued, no existing account required).

**Auth**: None

**Response `200`**
```json
{
  "partnerName": "Acme Corp",
  "assessmentType": "fit",
  "candidateEmail": "jane@example.com"
}
```

---

### `POST /api/guest/invite/:token/create-account`

Create a guest account from a partner invite and begin the session.

**Auth**: None

**Request body**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "secret"
}
```

**Response `201`**
```json
{ "userId": "uuid", "sessionId": "uuid" }
```

---

### `POST /api/guest/invite/:token/session`

Start an assessment session for an existing guest account.

**Auth**: None

**Response `200`**
```json
{ "sessionId": "uuid", "widgetUrl": "https://…" }
```

---

### `GET /api/public/join/:token`

Look up a shareable public assessment link.

**Auth**: None

**Response `200`**
```json
{
  "partnerName": "Acme Corp",
  "assessmentType": "fit",
  "isActive": true
}
```

---

### `POST /api/public/join/:token/send-otp`

Send a one-time password to the candidate's email to begin a shareable link assessment.

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response `200`**
```json
{ "message": "OTP sent" }
```

---

### `POST /api/public/join/:token/verify-otp`

Verify the OTP and start the assessment session.

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com", "otp": "123456" }
```

**Response `200`**
```json
{ "sessionId": "uuid", "widgetUrl": "https://…" }
```

---

### `GET /api/unlock-results`

Check whether a shareable results link is valid and unpaid/paid.

**Auth**: None

**Query params**: `token=<shareToken>`

**Response `200`**
```json
{
  "isPaid": false,
  "assessmentType": "fit",
  "candidateName": "Jane Doe"
}
```

---

### `POST /api/unlock-results/checkout`

Create a checkout to purchase access to a shared results page.

**Auth**: None

**Request body**
```json
{ "token": "shareToken", "countryCode": "US" }
```

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/…" }
```

---

### `POST /api/unlock-results/process-payment`

Confirm a completed Stripe or Airwallex payment for a B2B results unlock. Called from the payment success redirect page. No authentication required — the Stripe session or Airwallex intent ID validates the request.

**Auth**: None

**Request body (Stripe)**
```json
{ "stripeSessionId": "cs_live_…" }
```

**Request body (Airwallex)**
```json
{ "intentId": "int_…", "provider": "airwallex" }
```

**Response `200`**
```json
{ "success": true, "inviteToken": "…" }
```

**Errors**: `400` payment not completed · `400` invalid payment metadata

---

### `GET /api/purchases`

List all purchases made by the current authenticated user.

**Auth**: Session cookie

**Response `200`**: Array of purchase objects with status, amount, items, and dates.

---

### `GET /api/purchases-with-results`

List all purchases that include assessment results (for the results library).

**Auth**: Session cookie

**Response `200`**: Array of purchase + embedded results objects.

---

### `GET /api/purchase-items/:purchaseId`

List individual line items for a given purchase.

**Auth**: Session cookie

**Response `200`**: Array of purchase item objects.

---

### `POST /api/purchase-items/add`

Add an assessment type to the user's cart / pending purchase.

**Auth**: Session cookie

**Request body**
```json
{ "assessmentType": "ai_readiness" }
```

**Response `200`**: Updated cart state.

---

### `DELETE /api/purchase-items/:itemId`

Remove an item from the pending purchase.

**Auth**: Session cookie

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/create-checkout-session-guest`

Create a Stripe checkout session for an unauthenticated (guest) user purchasing an assessment. Server verifies the email is not already registered and creates the account after payment.

**Auth**: None

**Request body**
```json
{
  "assessmentIds": ["fit"],
  "customerEmail": "guest@example.com",
  "customerName": "Jane Doe",
  "firstName": "Jane",
  "lastName": "Doe",
  "countryCode": "GB"
}
```

All fields except `countryCode` are required.

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/…" }
```

**Errors**: `400` email already registered (log in instead) · `400` missing required fields · `400` invalid assessment ID

---

### `GET /api/partner-results-pricing/:invitationId`

Get pricing for purchasing partner-issued results (used on the candidate view-results page).

**Auth**: Session cookie

**Response `200`**
```json
{ "price": 1500, "currency": "GBP", "vatRate": 0.20 }
```

---

### `POST /api/create-partner-results-checkout`

Create a Stripe checkout to buy a partner results report.

**Auth**: Session cookie

**Request body**
```json
{ "invitationId": "uuid", "countryCode": "GB" }
```

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/…" }
```

---

### `POST /api/confirm-partner-results-purchase`

Confirm a completed Stripe payment for a partner results report.

**Auth**: Session cookie

**Request body**
```json
{ "sessionId": "cs_live_…" }
```

**Response `200`**
```json
{ "success": true }
```

---

## 8. Partner API (Bearer Auth)

All endpoints in this section require `Authorization: Bearer <api_key>`.

Partner API keys are created in the Partner Dashboard and are scoped to permissions and environments (`live` / `test`).

A machine-readable OpenAPI spec is also available at `GET /api/partner/openapi.json`.

---

### `GET /api/partner/health`

Health check — no auth required.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2026-04-18T12:00:00.000Z" }
```

---

### `GET /api/partner/me`

Get the authenticated partner's account summary.

**Auth**: Bearer (any scope)

**Response `200`**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "companyName": "Acme Corp",
  "email": "api@acmecorp.com",
  "monthlyQuota": 500,
  "pricePerAssessment": 400,
  "isActive": true
}
```

---

### `POST /api/partner/sessions`

Create an assessment session for a candidate. Consumes one credit from the partner quota.

**Auth**: Bearer (`assessments:write`)

**Request body**
```json
{
  "assessmentType": "fit",
  "externalUserId": "user-123",
  "externalEmail": "candidate@client.com",
  "metadata": { "jobRef": "JR-001" },
  "webhookUrl": "https://client.com/webhook",
  "expiresInMinutes": 1440,
  "country": "SG"
}
```

**Response `201`**
```json
{
  "sessionId": "uuid",
  "assessmentType": "fit",
  "status": "created",
  "expiresAt": "2026-04-19T12:00:00.000Z",
  "widgetUrl": "https://app.humanmetrix.co.uk/embed/assessment?session=uuid",
  "metadata": { "jobRef": "JR-001" }
}
```

**Errors**: `402` no credits or quota exhausted · `400` validation error

---

### `GET /api/partner/sessions/:sessionId`

Get session state.

**Auth**: Bearer (`assessments:read`)

**Response `200`**
```json
{
  "sessionId": "uuid",
  "assessmentType": "fit",
  "status": "completed",
  "externalUserId": "user-123",
  "externalEmail": "candidate@client.com",
  "metadata": {},
  "createdAt": "…",
  "startedAt": "…",
  "completedAt": "…",
  "expiresAt": "…"
}
```

---

### `GET /api/partner/sessions/:sessionId/results`

Get full results for a completed session.

**Auth**: Bearer (`results:read`)

**Response `200`**
```json
{
  "sessionId": "uuid",
  "assessmentType": "fit",
  "status": "completed",
  "scores": {
    "HA": 72, "IC": 65, "RA": 80, "EE": 58, "GM": 77, "IA": 63
  },
  "totalScore": 69,
  "percentile": 71,
  "evaluations": [],
  "completedAt": "2026-04-18T10:30:00.000Z"
}
```

---

### `GET /api/partner/sessions`

List sessions created by the partner (most recent first, max 200).

**Auth**: Bearer (`assessments:read`)

**Query params**: `limit` (integer, max 200, default 50)

**Response `200`**
```json
{
  "sessions": [
    {
      "sessionId": "uuid",
      "assessmentType": "fit",
      "status": "completed",
      "externalUserId": "user-123",
      "createdAt": "…",
      "completedAt": "…"
    }
  ],
  "count": 12
}
```

---

### `GET /api/partner/me/quota`

Get current credit balance. This route uses `partnerAuth` (Bearer API key), not a session cookie.

**Auth**: Bearer (any scope)

**Response `200`**
```json
{
  "testsPurchased": 100,
  "testsConsumed": 23,
  "remaining": 77
}
```

---

### `GET /api/partner/quota`

Get current credit balance.

**Auth**: Bearer (any scope)

**Response `200`**
```json
{
  "testsPurchased": 100,
  "testsConsumed": 23,
  "remaining": 77,
  "percentageUsed": 23.0
}
```

---

### `GET /api/partner/usage`

Get partner usage statistics for the current calendar month.

**Auth**: Bearer (any scope)

**Response `200`**
```json
{
  "period": {
    "start": "2026-04-01T00:00:00.000Z",
    "end": "2026-04-30T23:59:59.000Z"
  },
  "summary": {
    "completedAssessments": 39,
    "totalBilledPence": 15600,
    "totalBilledGBP": "156.00",
    "quota": 500,
    "quotaUsedPercent": "7.8"
  },
  "breakdown": [ … ]
}
```

---

### `GET /api/partner/assessment-types`

List all available assessment types.

**Auth**: None

**Response `200`**
```json
{
  "types": [
    {
      "id": "fit",
      "name": "FIT Assessment",
      "description": "Measures behavioural skills and workplace fit",
      "questionCount": 40,
      "estimatedMinutes": 15
    },
    {
      "id": "ai_readiness",
      "name": "AI Readiness Assessment",
      "description": "Evaluates preparedness for AI-driven work environments",
      "questionCount": 30,
      "estimatedMinutes": 12
    },
    {
      "id": "prompt_architecture",
      "name": "Prompt Architecture Assessment",
      "description": "Tests ability to craft effective AI prompts",
      "questionCount": 7,
      "estimatedMinutes": 25
    },
    {
      "id": "aiq",
      "name": "AIQ Assessment",
      "description": "Measures AI ethics and integrity quotient",
      "questionCount": 15,
      "estimatedMinutes": 10
    }
  ]
}
```

---

### `GET /api/partner/openapi.json`

Machine-readable OpenAPI 3.0 specification for the Partner API.

**Auth**: None

---

## 9. Partner Portal (Session Auth)

These endpoints are used by the Partner Dashboard SPA. Users must be logged in as `partner_admin` or `organization_admin`. **All routes in this section require a valid session cookie unless stated otherwise.** Responses follow standard REST conventions: `200` with the updated or created resource on success, `400` for validation errors, `401` if unauthenticated, and `403` if the user lacks the required role.

The sections below use tables for the full path inventory. Selected high-traffic operations include expanded request/response schemas.

### Webhook Management — Expanded Schemas

#### `POST /api/partner/me/webhooks` — Register webhook

**Request body**
```json
{
  "url": "https://partner.com/hm-events",
  "events": ["session.completed", "session.expired"],
  "isActive": true
}
```

**Response `201`**
```json
{
  "id": "uuid",
  "url": "https://partner.com/hm-events",
  "events": ["session.completed", "session.expired"],
  "secret": "whsec_…",
  "isActive": true,
  "createdAt": "…"
}
```

#### `PATCH /api/partner/me/webhooks/:id` — Update webhook

**Request body** (all fields optional)
```json
{ "url": "https://new-endpoint.com", "events": ["session.completed"], "isActive": false }
```

**Response `200`**: Updated webhook object.

#### `POST /api/partner/me/webhooks/:id/rotate-secret`

**Response `200`**
```json
{ "secret": "whsec_new_…" }
```

#### `POST /api/partner/me/webhooks/:id/test` — Send test event

**Response `200`**
```json
{ "success": true, "statusCode": 200, "latencyMs": 142 }
```

---

### ATS Integration — Expanded Schemas

#### `POST /api/partner/me/ats-integrations` — Connect ATS

**Request body**
```json
{
  "provider": "greenhouse",
  "apiKey": "gh_api_key_…",
  "webhookEnabled": true
}
```

**Response `201`**
```json
{ "id": "uuid", "provider": "greenhouse", "status": "active", "createdAt": "…" }
```

#### `PATCH /api/partner/me/ats-integrations/:id`

**Request body** (fields to update)
```json
{ "webhookEnabled": false }
```

**Response `200`**: Updated ATS integration object.

---

### Team Invite — Expanded Schema

#### `POST /api/partner/me/team/invite`

**Request body**
```json
{ "email": "colleague@company.com", "role": "partner_admin" }
```

**Response `200`**
```json
{ "success": true, "message": "Invitation sent" }
```

---

### Scheduled Export — Expanded Schema

#### `POST /api/partner/me/scheduled-exports`

**Request body**
```json
{
  "name": "Weekly results export",
  "frequency": "weekly",
  "format": "csv",
  "exportType": "results",
  "recipients": ["reports@company.com"]
}
```

**Response `201`**: Scheduled export object with `id` and next run time.

---

### Account & Billing

All routes in this section require session cookie auth (`partner_admin` or `organization_admin`).

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/account` | — | `{ id, name, email, role, organizationId, monthlyQuota, pricePerAssessment, isActive }` |
| GET | `/api/partner/me/billing` | — | `{ plan, status, invoices[], nextBillingDate, currentBalance }` |
| GET | `/api/partner/me/pricing` | — | `{ packages: [{ id, credits, price, currency }] }` |
| GET | `/api/partner/me/billing-info` | — | `{ companyName, address, vatNumber, country }` |
| POST | `/api/partner/me/billing-info` | `{ companyName, address, vatNumber, country }` | `{ success: true }` |
| GET | `/api/partner/me/usage` | — | See Bearer `GET /api/partner/usage` — same shape |
| GET | `/api/partner/me/credit-history` | — | `{ history: [{ date, type, amount, balance }] }` |
| GET | `/api/partner/me/billing-change-request` | — | `{ requests: [{ id, plan, status, createdAt }] }` |
| POST | `/api/partner/me/billing-change-request` | `{ requestedPlan, notes }` | `{ id, status: "pending" }` |
| DELETE | `/api/partner/me/billing-change-request/:requestId` | — | `{ success: true }` |
| POST | `/api/partner/me/airwallex-consent/create` | `{ returnUrl }` | `{ consentUrl }` |
| POST | `/api/partner/me/airwallex-consent/confirm` | `{ code }` | `{ success: true }` |
| POST | `/api/partner/subscription-enquiry` | `{ plan, message }` | `{ success: true }` |
| POST | `/api/partner/validate-promo` | `{ code, packageId }` | `{ valid, discountPercent, finalPrice }` |
| GET | `/api/partner/me/receipt/:type/:id` | — | PDF binary or `{ url }` |
| GET | `/api/partner/overage-history` | — | `{ history: [{ month, overageCount, overageCharge }] }` |
| GET | `/api/partners/packages/tiers` | — | `{ tiers: [{ id, credits, price, currency }] }` |

### Settings & API Keys

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/settings` | — | `{ emailNotifications, weeklyDigest, candidateAlerts, … }` |
| PATCH | `/api/partner/me/settings` | `{ emailNotifications?, weeklyDigest?, … }` | Updated settings object |
| GET | `/api/partner/me/api-keys` | — | `{ keys: [{ id, name, prefix, scopes, createdAt, lastUsedAt }] }` |
| POST | `/api/partner/me/api-keys` | `{ name, scopes: ["assessments:read", …] }` | `{ id, key: "hm_live_…", name, scopes }` — key shown once only |
| POST | `/api/partner/me/api-keys/:keyId/rotate` | — | `{ key: "hm_live_new_…" }` — new key shown once only |
| DELETE | `/api/partner/me/api-keys/:keyId` | — | `{ success: true }` |
| POST | `/api/partner/me/tour-completed` | — | `{ success: true }` |
| POST | `/api/partner/me/accept-terms` | — | `{ success: true }` |

### Webhooks

| Method | Path | Request Body | Response `200/201` |
|---|---|---|---|
| GET | `/api/partner/me/webhooks` | — | `{ webhooks: [{ id, url, events[], isActive, createdAt }] }` |
| POST | `/api/partner/me/webhooks` | `{ url, events[], isActive }` | `201` `{ id, url, events[], secret, isActive }` |
| PATCH | `/api/partner/me/webhooks/:id` | `{ url?, events?, isActive? }` | Updated webhook object |
| DELETE | `/api/partner/me/webhooks/:id` | — | `{ success: true }` |
| GET | `/api/partner/me/webhooks/:id/logs` | — | `{ logs: [{ id, event, statusCode, latencyMs, createdAt }] }` |
| POST | `/api/partner/me/webhooks/:id/rotate-secret` | — | `{ secret: "whsec_new_…" }` |
| POST | `/api/partner/me/webhooks/:id/test` | — | `{ success: true, statusCode: 200, latencyMs: 142 }` |

### ATS Integrations

| Method | Path | Request Body | Response `200/201` |
|---|---|---|---|
| GET | `/api/partner/me/ats-integrations` | — | `{ integrations: [{ id, provider, status, createdAt }] }` |
| POST | `/api/partner/me/ats-integrations` | `{ provider, apiKey, webhookEnabled }` | `201` `{ id, provider, status: "active" }` |
| PATCH | `/api/partner/me/ats-integrations/:id` | `{ apiKey?, webhookEnabled? }` | Updated integration object |
| DELETE | `/api/partner/me/ats-integrations/:id` | — | `{ success: true }` |

### Scheduled Exports

| Method | Path | Request Body | Response `200/201` |
|---|---|---|---|
| GET | `/api/partner/me/scheduled-exports` | — | `{ exports: [{ id, name, frequency, format, exportType, recipients[], nextRunAt }] }` |
| POST | `/api/partner/me/scheduled-exports` | `{ name, frequency, format, exportType, recipients[] }` | `201` Scheduled export object with `id` and `nextRunAt` |
| PATCH | `/api/partner/me/scheduled-exports/:id` | `{ frequency?, format?, recipients? }` | Updated export object |
| DELETE | `/api/partner/me/scheduled-exports/:id` | — | `{ success: true }` |

### Invitations & Candidates

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/invitations` | — | `{ invitations: [{ id, email, status, assessmentType, createdAt }] }` |
| POST | `/api/partner/me/invitations/bulk` | `multipart/form-data: csv` file | `{ importId, queued: N }` |
| GET | `/api/partner/me/invitations/imports` | — | `{ imports: [{ id, status, total, processed, failed }] }` |
| GET | `/api/partner/me/invitations/imports/:importId` | — | `{ id, status, total, processed, failed, errors[] }` |
| POST | `/api/partner/me/invitations/:invitationId/send-email` | — | `{ success: true }` |
| DELETE | `/api/partner/me/invitations/:invitationId` | — | `{ success: true }` |
| GET | `/api/partner/me/assessment-links` | — | `{ links: [{ id, slug, assessmentType, isActive, usageCount }] }` |
| PATCH | `/api/partner/me/assessment-links/:id/toggle` | — | `{ isActive: boolean }` |
| GET | `/api/partner/me/candidates` | — | `{ candidates: [{ id, email, name, assessmentsCompleted }] }` |
| POST | `/api/partner/me/candidates/notes` | `{ candidateId, note }` | `{ id, note, createdAt }` |
| POST | `/api/partner/me/candidates/:candidateId/recommendations` | `{ outcome, notes, tags[] }` | `{ success: true }` |

### Results & Analysis

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/results` | — | `{ results: [{ sessionId, candidateEmail, assessmentType, totalScore, completedAt }] }` |
| GET | `/api/partner/me/results/:sessionId` | — | Full result object with `scores`, `percentile`, `evaluations[]` |
| GET | `/api/partner/me/compare` | — | `{ comparison: [{ sessionId, candidateEmail, scores }] }` — uses query params |
| POST | `/api/partner/me/multi-candidate-comparison` | `{ sessionIds: [] }` | `{ id, comparison }` |
| GET | `/api/partner/me/cohort-benchmark` | — | `{ averages: { HA, IC, RA, EE, GM, IA }, percentile50, percentile90 }` |
| GET | `/api/partner/me/platform-averages` | — | `{ averages: { fit: {…}, ai_readiness: {…} } }` |
| GET | `/api/partner/me/role-alignment` | — | `{ roles: [], weights: {} }` |
| POST | `/api/partner/me/role-alignment` | `{ roleId, weights: { HA, IC, RA, EE, GM, IA } }` | `{ success: true }` |
| GET | `/api/partner/me/roles` | — | `{ roles: [{ id, name, weights }] }` |
| GET | `/api/partner/me/analysis-reports` | — | `{ reports: [{ id, type, createdAt }] }` |
| GET | `/api/partner/me/analysis-reports/:reportId` | — | `{ id, type, content, createdAt }` |
| DELETE | `/api/partner/me/analysis-reports/:reportId` | — | `{ success: true }` |

### Data Exports

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/export/results` | — | CSV/XLSX file download — use `?format=csv` or `?format=xlsx` |
| GET | `/api/partner/me/export/usage` | — | CSV file download |
| GET | `/api/partner/me/export/billing` | — | CSV file download |

### Analytics

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/analytics` | — | `{ completedThisMonth, completionRate, avgScore, recentActivity[] }` |
| GET | `/api/partner/me/activity-log` | — | `{ events: [{ type, description, createdAt }] }` |

### Notifications

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/notifications` | — | `{ notifications: [{ id, type, title, body, isRead, createdAt }] }` |
| POST | `/api/partner/me/notifications/:id/read` | — | `{ success: true }` |
| POST | `/api/partner/me/notifications/read-all` | — | `{ success: true }` |
| GET | `/api/partner/me/notification-preferences` | — | `{ emailOnComplete, emailOnExpiry, weeklyDigest, … }` |
| PATCH | `/api/partner/me/notification-preferences` | `{ emailOnComplete?, emailOnExpiry?, weeklyDigest? }` | Updated preferences object |

### Team Management

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/me/team` | — | `{ members: [{ id, email, name, role, status, joinedAt }] }` |
| POST | `/api/partner/me/team/invite` | `{ email, role }` | `{ success: true, message: "Invitation sent" }` |
| PATCH | `/api/partner/me/team/:id` | `{ role }` | Updated member object |
| DELETE | `/api/partner/me/team/:id` | — | `{ success: true }` |
| POST | `/api/partner/me/team/:id/resend` | — | `{ success: true }` |
| POST | `/api/partner/team/accept/:token` | — (token = auth) | `{ success: true }` |

### Organizations (Sub-Orgs)

| Method | Path | Request Body | Response `200/201` |
|---|---|---|---|
| GET | `/api/partner/me/organizations` | — | `{ organizations: [{ id, name, createdAt }] }` |
| POST | `/api/partner/me/organizations` | `{ name, description? }` | `201` `{ id, name, createdAt }` |
| GET | `/api/partner/me/organizations/:id` | — | `{ id, name, members[], usage }` |
| PATCH | `/api/partner/me/organizations/:id` | `{ name?, description? }` | Updated organization object |
| DELETE | `/api/partner/me/organizations/:id` | — | `{ success: true }` |

### Hiring Pipeline

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| GET | `/api/partner/pipeline` | — | `{ stages: { applied: [], screening: [], interview: [], offer: [] } }` |
| PATCH | `/api/partner/sessions/:sessionId/pipeline` | `{ stage }` | `{ sessionId, stage }` |
| POST | `/api/partner/pipeline/bulk-update` | `{ sessionIds: [], stage }` | `{ updated: N }` |
| POST | `/api/partner/pipeline/archive` | `{ sessionIds: [] }` | `{ archived: N }` |

### Card Management

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| POST | `/api/partner/card/setup-intent` | — | `{ clientSecret }` (Stripe SetupIntent) |
| POST | `/api/partner/card/confirm` | `{ setupIntentId }` | `{ success: true }` |
| GET | `/api/partner/card/status` | — | `{ hasCard, last4, brand, expMonth, expYear }` |
| DELETE | `/api/partner/card` | — | `{ success: true }` |

### Package Purchases

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| POST | `/api/partner/purchase/checkout` | `{ packageId, countryCode }` | `{ url }` (Stripe checkout URL) |
| POST | `/api/partner/package/callback` | `{ sessionId }` | `{ success: true, creditsAdded: N }` |
| POST | `/api/partner/package/airwallex-callback` | `{ intentId }` | `{ success: true, creditsAdded: N }` |
| GET | `/api/partner-testing-series` | — | `{ series: [{ id, name, assessmentTypes[] }] }` |

### PDF Import

| Method | Path | Request Body | Response `200` |
|---|---|---|---|
| POST | `/api/partner/import-pdf` | `multipart/form-data: pdf` file | `{ parsed: { name, email, scores }, importId }` |
| POST | `/api/partner/parse-pdf` | `multipart/form-data: pdf` file | `{ parsed: { name, email, scores } }` |
| POST | `/api/partner/confirm-import` | `{ importId }` | `{ success: true, sessionId }` |



## 10. Ecosystem Index

**Auth**: Session cookie (partner admin or organization admin)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ecosystem/projects` | Create a team diagnostic project |
| `GET` | `/api/ecosystem/projects` | List projects (user-owned) |
| `GET` | `/api/ecosystem/projects/:id` | Get project details |
| `PATCH` | `/api/ecosystem/projects/:id` | Update project metadata |
| `DELETE` | `/api/ecosystem/projects/:id` | Delete project |
| `POST` | `/api/ecosystem/projects/:id/save-mission` | Save mission statement |
| `POST` | `/api/ecosystem/projects/:id/analyze-mission` | GPT-4o mission analysis |
| `POST` | `/api/ecosystem/projects/:id/organization-context` | Save deep-dive org context |
| `GET` | `/api/ecosystem/projects/:id/team-members` | List team members |
| `POST` | `/api/ecosystem/projects/:id/team-members` | Add team member |
| `PATCH` | `/api/ecosystem/projects/:id/team-members/:memberId` | Update member |
| `DELETE` | `/api/ecosystem/projects/:id/team-members/:memberId` | Remove member |
| `POST` | `/api/ecosystem/parse-fit-pdf` | Parse FIT PDF to extract scores |
| `POST` | `/api/ecosystem/projects/:id/generate-analysis` | Generate strategic AI analysis (costs 20 credits) |
| `GET` | `/api/ecosystem/partner/projects` | List all partner org's projects |
| `GET` | `/api/ecosystem/projects/:id/searchable-candidates` | Search linked candidates |
| `POST` | `/api/ecosystem/projects/:id/create-checkout` | Pay for an analysis |
| `POST` | `/api/ecosystem/projects/:id/verify-payment` | Confirm analysis payment |
| `POST` | `/api/ecosystem/projects/:id/consume-credits` | Deduct partner credits for analysis |

---

## 11. Admin Endpoints

> Admin-only endpoints (rooted under `/api/admin/`, requiring `super_admin` session auth) are **out of scope** for this external API reference document. They are intentionally excluded from the documented contract to avoid maintenance burden and accidental external dependency.


## 12. Webhook Endpoints

These endpoints receive asynchronous events from external payment and email providers.

### `POST /api/webhooks/stripe`

Processes Stripe checkout and subscription events.

**Auth**: Stripe-Signature header (HMAC-SHA256). Secret: `STRIPE_WEBHOOK_SECRET`.  
**Content-Type**: `application/json` (raw body, registered with `express.raw({ type: 'application/json' })`)

**Events handled**:
- `checkout.session.completed` — completes B2C purchase, triggers receipt email + PDF
- `payment_intent.payment_failed` — records failure, notifies admin
- `customer.subscription.deleted` — cancels partner subscription
- `payment_method.updated` — updates card expiry metadata

---

### `POST /api/webhooks/airwallex`

Processes Airwallex payment events.

**Auth**: Airwallex-Signature header. Secret: `AIRWALLEX_WEBHOOK_SECRET`.  
**Content-Type**: `application/json`

**Events handled**:
- `payment_intent.succeeded` — completes B2C, B2B top-up, or ecosystem payment
- `payment_intent.failed` — records failure

---

### `POST /api/webhooks/sendgrid`

Processes SendGrid email event notifications.

**Auth**: SendGrid webhook signature (optional; controlled by `SENDGRID_ALLOW_UNSIGNED_WEBHOOKS`).  
**Content-Type**: `application/json` (raw body, registered with `express.raw({ type: 'application/json' })`)

**Events handled**:
- `bounce`, `dropped`, `blocked`, `deferred` — marks `invitations.emailBounced = true`

---

## 13. File / Object Storage

### `POST /api/uploads/request-url`

Generate a presigned URL for direct-to-cloud upload. The client sends JSON metadata only, then uploads the file directly to the returned presigned URL — do not send the file to this endpoint.

**Auth**: None (route is open; callers are responsible for their own access control)

**Request body**
```json
{
  "name": "screenshot.png",
  "size": 12345,
  "contentType": "image/png"
}
```

**Response `200`**
```json
{
  "uploadURL": "https://storage.googleapis.com/…/presigned",
  "objectPath": "/objects/uploads/uuid",
  "metadata": { "name": "screenshot.png", "size": 12345, "contentType": "image/png" }
}
```

---

### `GET /objects/:objectPath`

Proxy endpoint that streams objects from Replit Object Storage. There are no built-in ACL checks on this route — access control must be managed by the path structure (private paths begin with `.private/` and are not publicly guessable).

**Auth**: None (no auth middleware attached to this route)

---

## 14. Public / Unauthenticated

### `POST /api/contact`

Submit a contact form (demo / sales intent).

**Auth**: None (rate-limited: 5 req/hour per IP)

**Request body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Corp",
  "message": "We'd like a demo.",
  "intent": "demo"
}
```

**Response `200`**
```json
{ "message": "Message sent successfully" }
```

---

### `POST /api/general-enquiry`

General footer enquiry form (distinct from `/api/contact` — all four fields required).

**Auth**: None  
**Rate limit**: 5 requests per IP per hour

**Request body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Partnership enquiry",
  "message": "I am interested in partnering with you."
}
```

**Response `200`**
```json
{ "success": true, "message": "Message sent successfully" }
```

---

### `POST /api/enterprise-enquiry`

Enterprise plan enquiry.

**Auth**: None

**Request body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Corp",
  "teamSize": "50-200",
  "message": "Looking for enterprise pricing."
}
```

**Response `200`**
```json
{ "message": "Enquiry received" }
```

---

### `POST /api/marketing-optin`

Subscribe to marketing updates.

**Auth**: None

**Request body**
```json
{ "email": "jane@example.com" }
```

**Response `200`**
```json
{ "success": true }
```

---

### `POST /api/send-cv`

Submit a CV for a careers position.

**Auth**: None  
**Content-Type**: `multipart/form-data`

**Fields**:
- `name` (required) — applicant full name
- `email` (required) — applicant email address
- `message` (optional) — cover message
- `cv` (required) — PDF or Word document (`.pdf`, `.doc`, `.docx`), max 10 MB

**Response `200`**
```json
{ "success": true, "message": "CV sent successfully" }
```

**Errors**: `400` missing name/email/file or invalid email · `400` unsupported file type

---

## Coverage Validation Checklist

The endpoint inventory in this document was derived by scanning the following source files. Any new routes added to these files should be reflected here.

| Source File | Section(s) in this doc | Last scanned |
|---|---|---|
| `server/auth.ts` | 2. Authentication | 2026-04-18 |
| `server/routes.ts` | 3–7, 11–14 | 2026-04-18 |
| `server/partner-routes.ts` | 8–9 | 2026-04-18 |
| `server/ecosystem-routes.ts` | 10 | 2026-04-18 |
| `server/payment-routes.ts` | 4 (B2C payments) | 2026-04-18 |
| `server/webhook-routes.ts` | 12 | 2026-04-18 |
| `server/cv-routes.ts` | 14 (Public — `POST /api/send-cv`) | 2026-04-18 |
| `server/replit_integrations/object_storage/routes.ts` | 13 | 2026-04-18 |

**Exclusions**: Vite dev-server middleware paths (served only in development mode), Express internal error-handler routes, and all `super_admin`-only routes under `/api/admin/` are excluded. All public-facing candidate, partner, B2B, ecosystem, and webhook endpoints are included.
