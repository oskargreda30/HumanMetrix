---
name: B2B candidate result-unlock pricing
description: How partner-invited candidates are priced for unlocking their own results, and the fee-determination quirk in the shared unlock endpoint.
---

# B2B partner-invited candidate result-unlock pricing

Partner-INVITED candidates pay ONLY the per-test price (`ASSESSMENT_PRICES`, ~£4–5) to unlock
their own results — NO platform/base fee. This is encoded via `B2B_CANDIDATE_BASE_FEE = 0`
(shared/schema.ts), passed as the base-fee arg to `calculateCandidatePricing` /
`calculateBundlePricing`. B2C self-service purchases still pay the £15 `BASE_FEE`.

**Why:** invited candidates were being charged ~£20 all-in (£15 fee + ~£5 test); the partner
expected the per-test number shown on the public site assessment cards. The site card price is
the test portion only.

**How to apply:** the candidate-facing price is computed in MANY call sites that must all agree,
or the email price won't match the actual charge:
- `server/partner-routes.ts` — every `calculateCandidatePricing`/`calculateBundlePricing` call
  (congratulatory / all-complete / invite-complete emails, GET+checkout `/api/unlock-results`,
  GET+checkout `/api/b2b/results/:sessionId`, GET+checkout `/api/b2b/results-bundle`). All B2B
  candidate-facing; none are B2C.
- `server/routes.ts` — `/api/create-partner-results-checkout` and
  `/api/partner-results-pricing/:invitationId` (authenticated invitationId flow).
- KEEP `BASE_FEE`: B2C self-service in `server/payment-routes.ts` (guest + create-checkout-session)
  and the B2C branches of `server/routes.ts`.

**Quirk / trap:** the shared authenticated `POST /api/unlock-results` serves BOTH B2C self-service
and invited candidates who created accounts. It loads `linkedInvitation` only in the
`else if (unpaidPurchase.invitationId)` branch — i.e. only when the purchase has no items. A
partner-linked purchase that ALSO carries items would skip that branch, leave `linkedInvitation`
null, and overcharge the £15 fee. Fee determination must resolve the invitation INDEPENDENTLY of
whether purchase items exist: `if (!linkedInvitation && unpaidPurchase.invitationId) fetch it`,
then `effectiveBaseFee = linkedInvitation?.partnerId ? 0 : BASE_FEE`. Only partner-bearing
invitations skip the fee; admin/B2C invitations (no partnerId) keep `BASE_FEE`.
