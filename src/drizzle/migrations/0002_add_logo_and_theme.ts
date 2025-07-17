import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export async function up(db: NodePgDatabase) {
  await db.execute(sql`
    ALTER TABLE "organization_settings" 
    ADD COLUMN IF NOT EXISTS "logo_url" varchar(255),
    ADD COLUMN IF NOT EXISTS "color_theme" varchar(50) DEFAULT 'default'
  `);
}

export async function down(db: NodePgDatabase) {
  await db.execute(sql`
    ALTER TABLE "organization_settings" 
    DROP COLUMN IF EXISTS "logo_url",
    DROP COLUMN IF EXISTS "color_theme"
  `);
}
