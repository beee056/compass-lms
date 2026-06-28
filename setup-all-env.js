const { execSync } = require('child_process');
const fs = require('fs');

try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    const index = line.indexOf('=');
    if (index === -1) continue;
    
    const key = line.substring(0, index).trim();
    let value = line.substring(index + 1).trim();
    
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }
    
    console.log(`Setting ${key}...`);
    try {
      execSync(`npx vercel env add ${key} production --value "${value}" --force --yes`, { stdio: 'inherit' });
    } catch(e) {
      console.error(`Failed to set ${key}`, e.message);
    }
  }
  console.log("All envs set successfully.");
} catch(e) {
  console.error("Error:", e);
}
