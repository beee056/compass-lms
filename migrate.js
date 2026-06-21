const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_u31aFhwRjAOW@ep-rapid-rain-a1v7vshn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

  try {
    await client.connect();
    console.log('Connected to database. Running migrations...');

    await client.query('ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "phone" TEXT;');
    await client.query('ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;');
    
    try {
      await client.query('UPDATE "StudentProfile" SET "phone" = "contactInfo" WHERE "phone" IS NULL AND "contactInfo" IS NOT NULL;');
      await client.query('ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "contactInfo";');
      console.log('Migrated contactInfo to phone and dropped contactInfo.');
    } catch (e) {
      console.log('contactInfo column might not exist or already dropped.', e.message);
    }

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
