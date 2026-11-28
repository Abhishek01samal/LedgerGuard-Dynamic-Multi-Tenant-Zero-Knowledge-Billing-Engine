import { spawn } from 'node:child_process';

const targets = [
  ['backend', 'dev'],
  ['frontend', 'dev'],
];

const children = targets.map(([workspace, script]) =>
  spawn(`npm --prefix ${workspace} run ${script}`, {
    stdio: 'inherit',
    shell: true,
  }),
);

let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

for (const child of children) {
  child.on('exit', (code) => {
    if (stopping) return;
    stop();
    if (code) process.exitCode = code;
  });
}
