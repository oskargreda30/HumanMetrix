# HumanMetrix Pricing Tiers — Quick Explainer

**Source of truth:** `shared/currencies.ts`
**Base currency:** GBP (£). Every price starts as a GBP amount, then a per-country
**PPP (Purchasing Power Parity) multiplier** is applied and the result is converted
into the buyer's local currency for display and checkout.

---

## How it works (in one line)

> `local price = base GBP price × PPP multiplier × exchange rate` → rounded up for clean display.

The buyer's country is detected automatically, which determines (a) their pricing
tier and (b) their local currency.

---

## The three PPP tiers

| Tier | Multiplier | Effective discount | Market type |
|------|-----------|--------------------|-------------|
| **Tier 1** | 1.0× | Full price | Western / high-income |
| **Tier 2** | 0.5× | 50% off | Middle markets |
| **Tier 3** | 0.25× | 75% off | Emerging markets |

Any country **not** explicitly listed defaults to **Tier 1 (full price)**.

---

## Country groupings

**Tier 1 — full price**
UK, US, Canada, Australia, New Zealand, Western Europe (Germany, France, Italy,
Spain, Netherlands, Belgium, Ireland, Portugal, Austria, Finland, Luxembourg),
Switzerland, the Nordics (Sweden, Norway, Denmark), Japan, Singapore, Hong Kong,
South Korea, Taiwan, Israel, and the Gulf states (UAE, Saudi Arabia, Qatar,
Kuwait, Bahrain, Oman).

**Tier 2 — 50% off**
Central & Eastern Europe (Poland, Czechia, Hungary, Romania, Bulgaria, Croatia,
Greece, Slovakia, Slovenia, the Baltics, Malta, Cyprus), Russia, Ukraine, Turkey,
Latin America (Brazil, Mexico, Argentina, Chile, Colombia, Peru), South Africa,
and China.

**Tier 3 — 75% off**
Southeast & South Asia (Philippines, Vietnam, Indonesia, Malaysia, Thailand,
India, Pakistan, Bangladesh, Sri Lanka, Nepal) and much of Africa (Nigeria,
Egypt, Kenya, Ghana, Tanzania, Uganda, Morocco), plus Ecuador.

---

## Worked example

Using an illustrative **£20** base price (actual prices round up for clean display
and convert at the stored/live exchange rate):

| Country | Tier | Multiplier | GBP after PPP | ~Local price |
|---------|------|-----------|---------------|--------------|
| United Kingdom | 1 | 1.0× | £20 | **£20** |
| United States | 1 | 1.0× | £20 | **~$25** |
| Poland | 2 | 0.5× | £10 | **~51 zł** |
| India | 3 | 0.25× | £5 | **~₹530** |
| Philippines | 3 | 0.25× | £5 | **~₱358** |

So a buyer in India or the Philippines pays roughly a quarter of the UK price,
and a buyer in Poland pays half.

---

## Notes & caveats

1. **SEA flat-rate promo pricing (currently dormant).** A separate
   `SEA_LAUNCH_COUNTRIES` block defines flat ~$1 local prices for the Philippines
   (₱59), Vietnam (30,000₫), Indonesia (Rp18,000) and Malaysia (RM8). Those four
   countries have since been reassigned to **Tier 3** in the country-tier map, so
   the standard PPP path (75% off) applies unless the SEA flat-rate lookup is
   explicitly called first at checkout.

2. **Stale code comments.** Inline comments in the country-tier map describe
   Tier 2 as "0.7× / 30% off" and Tier 3 as "0.5× / 50% off". These do **not**
   match the live multipliers (`0.5×` and `0.25×`). The table above reflects the
   values the system actually uses; the comments should be corrected.

3. **Exchange rates** are stored as approximate GBP→local rates in
   `shared/currencies.ts` and can be overridden by live rates
   (`server/exchange-rates.ts`). They should be refreshed periodically.
