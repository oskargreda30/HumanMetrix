import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFileSync } from 'fs';
import { join } from 'path';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — skipping role seed.');
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedRoles() {
  const backupPath = join(process.cwd(), 'server', 'job_roles_backup.json');
  const roles: any[] = JSON.parse(readFileSync(backupPath, 'utf-8'));

  console.log(`Seeding ${roles.length} roles from backup...`);

  const client = await pool.connect();
  try {
    let upserted = 0;
    for (const role of roles) {
      await client.query(
        `INSERT INTO job_roles (id, name, description, domain, competencies, required_skill_scores, is_custom, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           domain = EXCLUDED.domain,
           required_skill_scores = EXCLUDED.required_skill_scores,
           updated_at = NOW()`,
        [
          role.id,
          role.name,
          role.description || null,
          role.domain || null,
          JSON.stringify(role.competencies || []),
          JSON.stringify(role.requiredSkillScores || {}),
          role.isCustom ?? false,
          role.createdBy || null,
        ]
      );
      upserted++;
    }
    console.log(`✅ Role seed complete: ${upserted} roles upserted.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRoles().catch((err) => {
  console.error('❌ Role seed failed:', err.message);
  process.exit(1);
});
