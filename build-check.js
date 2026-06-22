const { spawn } = require('child_process');
const fs = require('fs');

const nextBuild = spawn('npx.cmd', ['next', 'build'], { shell: true });

let output = '';
nextBuild.stdout.on('data', (data) => output += data.toString());
nextBuild.stderr.on('data', (data) => output += data.toString());

nextBuild.on('close', (code) => {
  fs.writeFileSync('build-out.txt', `Exit code: ${code}\n${output}`);
});
