import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commands = [
  spawn(npm, ['run', 'worker:dev'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn(npm, ['run', 'dev:web'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of commands) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of commands) {
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', code => { if (!stopping && code !== 0) stop(code ?? 1); });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
