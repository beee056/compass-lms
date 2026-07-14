const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM "User"');
  console.log("Users:", res.rows);
  
  const res2 = await client.query('SELECT * FROM "StudentProfile"');
  console.log("Profiles:", res2.rows);
  
  await client.end();
}
run().catch(console.error);
