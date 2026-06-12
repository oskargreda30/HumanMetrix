---
name: Loading job specs / roles into dev AND prod
description: The only supported way to add a jobRoles row to both environments, given the prod DB is read-only to tooling.
---

# Loading a job spec / role into dev + prod

To load a new job spec/role so it exists in BOTH dev and production, add it to the
`CUSTOM_ROLES` array in `server/seed-custom-roles.ts`. `seedCustomRoles()` runs on app
startup (wired in `server/index.ts`) and inserts idempotently — it skips any role whose
`name` already exists, and it is INSERT-only (never updates an existing same-name row).

- **Dev**: restart the workflow → seeder runs → row appears in the dev DB.
- **Prod**: the row lands only on the next Publish/deploy, because the production app
  re-runs the startup seeder then.

**Why this is the mechanism:** the production database is READ-ONLY through agent tooling
(`executeSql` with `environment:"production"` allows SELECT only). So you cannot INSERT into
prod directly — code-seed-on-startup + publish is the supported cross-environment path for
loading data rows like job roles.

**How to apply:** each entry needs `name`, `domain` (a `JobRoleDomain` in shared/schema.ts:
technology|creative|business|healthcare|education|finance|operations|sales|other),
`description`, `competencies[]` (skillName/importance/minimumScore), and `requiredSkillScores`
with `fitSkills` (6 canonical FIT skills), `aiReadinessSkills` (9 canonical AI-readiness
skills), `skillCriticality` (all 15 keys, critical|standard), `promptArchitectureScore`,
`aiqScore`. Use the EXACT canonical skill names from existing entries — the role-fit engine
matches on them. To update an existing same-name role you cannot rely on the seeder; use an
admin update path instead.
