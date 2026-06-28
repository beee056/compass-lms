const { execSync } = require('child_process');

try {
  console.log("Removing old envs...");
  try { execSync('npx vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production -y'); } catch(e){}
  try { execSync('npx vercel env rm CLERK_SECRET_KEY production -y'); } catch(e){}
  
  console.log("Adding new envs...");
  execSync('npx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production', {
    input: 'pk_test_c291bmQtbGVvcGFyZC0yOS5jbGVyay5hY2NvdW50cy5kZXYk'
  });
  execSync('npx vercel env add CLERK_SECRET_KEY production', {
    input: 'sk_test_ALzq4X8OsRdvs8fCDB2kchzY03pTV0dI5Bc3Qoa0nt'
  });
  console.log("Env added successfully.");
} catch(e) {
  console.error("Error setting env:", e);
}
