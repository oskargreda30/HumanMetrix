# License Inventory

**Product**: HumanMetrix Assessment Platform  
**Legal Entity**: PT Human Metrix Assessments  
**Product License**: MIT (see [`LICENSE`](../LICENSE) at project root)  
**Inventory Date**: 2026-04-18  
**Inventory Scope**: All 134 direct npm dependencies declared in `package.json`
(dependencies, devDependencies, optionalDependencies)  
**Source of truth**: `license` field in `package-lock.json` entries  

> Packages whose `package-lock.json` entry omits the `license` field are listed
> as **UNDECLARED**. Their individual `package.json` files inside `node_modules/`
> may contain license information and should be reviewed separately.
>
> Transitive (indirect) dependency count: ~2,011 additional packages.
> A dedicated SBOM tool (e.g., `cyclonedx-npm`, `license-checker`) is recommended
> for a full transitive audit.

---

## Summary Table

| License (lockfile) | Direct Deps | Key Obligations |
|--------------------|-------------|-----------------|
| MIT | 73 | No obligations beyond preserving notices |
| UNDECLARED | 45 | Must audit individual package.json files |
| Apache-2.0 | 10 | Attribution notice required in distributions |
| MPL-2.0 | 2 | File-level source disclosure for modifications |
| ISC | 1 | No obligations beyond preserving notices |
| MIT-0 | 1 | No attribution required |
| BSD-3-Clause | 1 | Attribution; name may not be used for endorsement |
| Unlicense | 1 | Public domain dedication; no obligations |
| **Total** | **134** | |

---

## MIT — 73 Packages

**Obligations**: No special obligations beyond including the copyright notice and
license text when distributing the software or its source.

| Package | Version |
|---------|---------|
| @airwallex/components-sdk | 1.28.2 |
| @airwallex/node-sdk | 2.0.0-beta.4 |
| @jridgewell/trace-mapping | 0.3.31 |
| @neondatabase/serverless | 0.10.4 |
| @radix-ui/react-alert-dialog | 1.1.15 |
| @radix-ui/react-dialog | 1.1.15 |
| @radix-ui/react-slider | 1.3.6 |
| @radix-ui/react-slot | 1.2.4 |
| @radix-ui/react-toast | 1.2.7 |
| @sendgrid/eventwebhook | 8.0.0 |
| @sendgrid/mail | 8.1.3 |
| @stripe/react-stripe-js | 5.2.0 |
| @stripe/stripe-js | 8.1.0 |
| @tailwindcss/typography | 0.5.15 |
| @tanstack/react-query | 5.60.5 |
| @types/bcryptjs | 2.4.6 |
| @types/compression | 1.8.1 |
| @types/connect-pg-simple | 7.0.3 |
| @types/cookie-parser | 1.4.10 |
| @types/express | 4.17.21 |
| @types/express-session | 1.18.0 |
| @types/memoizee | 0.4.12 |
| @types/multer | 2.0.0 |
| @types/node | 20.16.11 |
| @types/nodemailer | 7.0.3 |
| @types/passport | 1.0.17 |
| @types/passport-local | 1.0.38 |
| @types/react | 18.3.12 |
| @types/react-dom | 18.3.1 |
| @types/supertest | 6.0.3 |
| @types/swagger-ui-react | 5.18.0 |
| @types/ws | 8.5.13 |
| @uppy/aws-s3 | 5.1.0 |
| @uppy/core | 5.2.0 |
| @uppy/dashboard | 5.1.0 |
| @uppy/react | 5.1.1 |
| @vitejs/plugin-react | 4.7.0 |
| @vitest/coverage-v8 | 1.6.0 |
| autocannon | 8.0.0 |
| autoprefixer | 10.4.20 |
| bufferutil | 4.0.8 |
| compression | 1.8.1 |
| connect-pg-simple | 10.0.0 |
| cookie-parser | 1.4.7 |
| drizzle-kit | 0.31.4 |
| esbuild | 0.25.9 |
| express | 4.21.2 |
| express-session | 1.18.1 |
| framer-motion | 11.13.1 |
| html2canvas | 1.4.1 |
| jsdom | 28.1.0 |
| jspdf | 3.0.3 |
| memorystore | 1.6.7 |
| multer | 2.0.2 |
| openid-client | 6.8.1 |
| p-limit | 7.3.0 |
| p-retry | 7.1.1 |
| passport | 0.7.0 |
| postcss | 8.4.47 |
| react | 18.3.1 |
| react-dom | 18.3.1 |
| react-flags-select | 2.5.0 |
| react-icons | 5.4.0 |
| react-phone-number-input | 3.4.14 |
| stripe | 19.1.0 |
| supertest | 7.2.2 |
| tsx | 4.20.5 |
| vite | 5.4.20 |
| vitest | 1.6.0 |
| ws | 8.19.0 |
| xero-node | 13.3.1 |
| zod | 3.25.76 |
| zod-validation-error | 3.5.4 |

---

## Apache-2.0 — 10 Packages

**Obligations**: When distributing software that includes Apache-2.0 components:
1. Include a copy of the Apache License 2.0.
2. Include a `NOTICE` file preserving the attribution notices from each component.
3. Clearly identify any modifications made to Apache-2.0 files.

The full attribution notices for these packages are in [`NOTICE`](../NOTICE).

| Package | Version | Upstream |
|---------|---------|----------|
| @google-cloud/storage | 7.18.0 | Google LLC |
| drizzle-orm | 0.39.1 | Drizzle Team |
| drizzle-zod | 0.7.1 | Drizzle Team |
| google-auth-library | 10.5.0 | Google LLC |
| openai | 6.34.0 | OpenAI |
| pdf-parse | 2.4.5 | — |
| puppeteer | 24.36.1 | Google LLC |
| react-helmet-async | 2.0.5 | Scott Taylor |
| swagger-ui-react | 5.31.0 | SmartBear Software |
| typescript | 5.6.3 | Microsoft Corporation |

---

## MPL-2.0 — 2 Packages

**Obligations**: The Mozilla Public License 2.0 requires that if you modify any
file covered by MPL-2.0, you must make the modified source of that specific file
available under MPL-2.0. This is a **file-level** (not project-level) copyleft.
If these packages are used unmodified, no source disclosure is required.

| Package | Version | Source |
|---------|---------|--------|
| @artilleryio/int-core | 2.22.0 | https://github.com/artilleryio/artillery |
| artillery | 2.0.21 | https://github.com/artilleryio/artillery |

---

## ISC — 1 Package

**Obligations**: Functionally identical to MIT. No special obligations beyond
including the copyright notice and license text in distributions.

| Package | Version |
|---------|---------|
| memoizee | 0.4.17 |

---

## MIT-0 — 1 Package

**Obligations**: MIT No Attribution. This is a permissive license with **no
attribution requirement** — the copyright notice does not need to be reproduced
in distributions.

| Package | Version |
|---------|---------|
| nodemailer | 7.0.10 |

---

## BSD-3-Clause — 1 Package

**Obligations**: Must include the copyright notice and license text in
distributions. The name of the copyright holder must **not** be used to endorse
or promote products derived from this software without prior written permission.

| Package | Version |
|---------|---------|
| bcryptjs | 3.0.2 |

---

## Unlicense — 1 Package

**Obligations**: The Unlicense is a public-domain dedication. No obligations
whatsoever.

| Package | Version |
|---------|---------|
| wouter | 3.3.5 |

---

## UNDECLARED in package-lock.json — 45 Packages

The `license` field is absent from these packages' entries in `package-lock.json`.
Their individual `package.json` files inside `node_modules/` may contain license
declarations and must be reviewed to determine actual obligations. A tool such as
`license-checker` or `cyclonedx-npm` can automate this resolution.

Many of the packages below are well-known open-source projects (Radix UI, Tailwind
CSS ecosystem, date-fns, etc.) whose published licenses are widely documented,
but this inventory reflects only data verifiable in `package-lock.json`.

| Package | Version |
|---------|---------|
| @hookform/resolvers | 3.10.0 |
| @radix-ui/react-accordion | 1.2.4 |
| @radix-ui/react-aspect-ratio | 1.1.3 |
| @radix-ui/react-avatar | 1.1.4 |
| @radix-ui/react-checkbox | 1.1.5 |
| @radix-ui/react-collapsible | 1.1.4 |
| @radix-ui/react-context-menu | 2.2.7 |
| @radix-ui/react-dropdown-menu | 2.1.7 |
| @radix-ui/react-hover-card | 1.1.7 |
| @radix-ui/react-label | 2.1.3 |
| @radix-ui/react-menubar | 1.1.7 |
| @radix-ui/react-navigation-menu | 1.2.6 |
| @radix-ui/react-popover | 1.1.7 |
| @radix-ui/react-progress | 1.1.3 |
| @radix-ui/react-radio-group | 1.2.4 |
| @radix-ui/react-scroll-area | 1.2.4 |
| @radix-ui/react-select | 2.1.7 |
| @radix-ui/react-separator | 1.1.3 |
| @radix-ui/react-switch | 1.1.4 |
| @radix-ui/react-tabs | 1.1.4 |
| @radix-ui/react-toggle | 1.1.3 |
| @radix-ui/react-toggle-group | 1.1.3 |
| @radix-ui/react-tooltip | 1.2.0 |
| @replit/vite-plugin-cartographer | 0.3.1 |
| @replit/vite-plugin-dev-banner | 0.1.1 |
| @replit/vite-plugin-runtime-error-modal | 0.0.3 |
| @tailwindcss/vite | 4.1.3 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| cmdk | 1.1.1 |
| date-fns | 3.6.0 |
| embla-carousel-react | 8.6.0 |
| input-otp | 1.4.2 |
| lucide-react | 0.453.0 |
| next-themes | 0.4.6 |
| passport-local | 1.0.0 |
| react-day-picker | 8.10.1 |
| react-hook-form | 7.55.0 |
| react-resizable-panels | 2.1.7 |
| recharts | 2.15.2 |
| tailwind-merge | 2.6.0 |
| tailwindcss | 3.4.17 |
| tailwindcss-animate | 1.0.7 |
| tw-animate-css | 1.2.5 |
| vaul | 1.1.2 |

> **Note**: The three `@replit/*` packages above are Replit-published build-time
> plugins that carry no `license` field. They are used exclusively at development
> time and are not bundled into production artifacts. Legal counsel should confirm
> acceptable use terms with Replit before any redistribution.

---

## Transitive Dependency — WTFPL Notice

> **Legal counsel should review this dependency.**

One transitive (indirect) dependency carries a WTFPL (Do What The F*ck You Want
to Public License) identifier:

| Package | Version | License | Notes |
|---------|---------|---------|-------|
| yaml-js | 0.2.3 | WTFPL | Transitive; pulled in via artillery chain |

An additional transitive dependency uses a dual `(WTFPL OR MIT)` expression:

| Package | Version | License | Notes |
|---------|---------|---------|-------|
| opener | 1.5.2 | WTFPL OR MIT | Transitive |

WTFPL is generally considered permissive and compatible with commercial use.
However, some legal teams flag it due to its informal language and absence of
a formal warranty disclaimer. For M&A due diligence, legal counsel should confirm
that WTFPL is acceptable under the applicable IP policy. Neither package is a
direct dependency — both can be replaced at the transitive level if required.

---

## Transitive Dependency License Distribution

For reference, the full transitive closure (~2,146 total packages including directs)
breaks down as follows per `package-lock.json`:

| License (lockfile) | Package Count |
|--------------------|--------------|
| MIT | 1,318 |
| Apache-2.0 | 345 |
| ISC | 193 |
| Not declared in lockfile | 135 |
| BlueOak-1.0.0 | 40 |
| BSD-3-Clause | 40 |
| BSD-2-Clause | 30 |
| MPL-2.0 | 13 |
| MIT-0 | 3 |
| Unlicense | 3 |
| Python-2.0 | 3 |
| CC0-1.0 | 3 |
| (MIT OR CC0-1.0) | 3 |
| Other / mixed expressions | 13 |

---

## Regenerating This Inventory

To reproduce this inventory after dependency changes, run:

```bash
node scripts/generate-notices.js
```

If that script is not yet present, a quick ad-hoc regeneration is:

```bash
npx license-checker --production --out docs/LICENSES.md
# or for a full CycloneDX SBOM:
npx @cyclonedx/cyclonedx-npm --output-file bom.json
```

The `package-lock.json` file is the authoritative data source. Re-run after every
significant dependency update.

> **Verbatim Apache-2.0 NOTICE text**: The Apache License 2.0 (Section 4d) requires
> reproducing the NOTICE file of each upstream Apache-2.0 package, if present. The
> packages listed above use `NOTICE` files that, at time of inventory, contain only
> machine-generated header text (package name, version, copyright line) matching the
> metadata already recorded above. Legal counsel should verify each upstream
> repository's NOTICE file before redistribution to ensure no additional verbatim
> text has been added.

*Inventory sourced from `package-lock.json` on 2026-04-18 (lockfile-declared
licenses only). Re-run the inventory after any major dependency update, or
generate a CycloneDX SBOM with `cyclonedx-npm` for automated tooling integration.*
