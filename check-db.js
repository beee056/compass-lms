const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://neondb_owner:npg_u31aFhwRjAOW@ep-rapid-rain-a1v7vshn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } } });

async function main() {
  try {
    const users = await prisma.user.findMany();
    const students = await prisma.studentProfile.findMany();
    fs.writeFileSync('db-output.txt', `USERS: ${users.length}\nSTUDENTS: ${students.length}\n`);
  } catch(e) {
    fs.writeFileSync('db-output.txt', `ERROR: ${e.message}\n${e.stack}`);
  }
}

main().finally(() => prisma.$disconnect());
