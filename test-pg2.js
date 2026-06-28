const fs = require('fs');
const { Client } = require('pg');

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL="(.*)"$/m) || envContent.match(/^DATABASE_URL=(.*)$/m);
  let dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;
  
  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  // Remove quotes if present
  dbUrl = dbUrl.replace(/^"/, '').replace(/"$/, '');

  console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':***@'));

  const client = new Client({
    connectionString: dbUrl,
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
} catch (e) {
  console.error('Error reading .env or setting up client:', e);
  process.exit(1);
}
