const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_94xTJHiygNMm@ep-empty-cake-atjbzk2h-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

client.connect()
  .then(() => {
    console.log('✅ Connection successful');
    return client.end();
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
