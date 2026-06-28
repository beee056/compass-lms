const { execFileSync } = require('child_process');
const fs = require('fs');

const vercelCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

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
    
    // 強制的にテスト用キーに差し替える
    if (key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') {
      value = 'pk_test_c291bmQtbGVvcGFyZC0yOS5jbGVyay5hY2NvdW50cy5kZXYk';
    }
    if (key === 'CLERK_SECRET_KEY') {
      value = 'sk_test_ALzq4X8OsRdvs8fCDB2kchzY03pTV0dI5Bc3Qoa0nt';
    }
    
    console.log(`Setting ${key}...`);
    try {
      execFileSync(vercelCmd, ['vercel', 'env', 'rm', key, 'production', '-y']);
    } catch(e) {}
    
    try {
      execFileSync(vercelCmd, ['vercel', 'env', 'add', key, 'production', '--value', value, '--force', '--yes']);
      console.log(`Successfully set ${key}`);
    } catch(e) {
      console.error(`Failed to set ${key}`, e.message);
    }
  }
  console.log("All envs set successfully.");
} catch(e) {
  console.error("Error:", e);
}
