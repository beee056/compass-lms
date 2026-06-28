const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_u31aFhwRjAOW@ep-rapid-rain-a1v7vshn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  });

  try {
    await client.connect();
    const usersRes = await client.query('SELECT * FROM "User"');
    const studentsRes = await client.query('SELECT * FROM "StudentProfile"');
    
    const out = `USERS: ${usersRes.rowCount}\nSTUDENTS: ${studentsRes.rowCount}\n`;
    fs.writeFileSync('pg-out.txt', out);
  } catch (err) {
    fs.writeFileSync('pg-out.txt', `ERROR: ${err.message}`);
  } finally {
    await client.end();
  }
}

main();
