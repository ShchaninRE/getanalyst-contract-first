import { spawn, spawnSync } from 'node:child_process';

export const isWindows = process.platform === 'win32';
export const npmCommand = isWindows ? 'npm.cmd' : 'npm';

export function spawnNpm(args, options = {}) {
  return spawn(npmCommand, args, {
    stdio: 'inherit',
    ...options
  });
}

export function spawnNpmSync(args, options = {}) {
  return spawnSync(npmCommand, args, {
    stdio: 'inherit',
    ...options
  });
}

export function stopProcessTree(child) {
  if (!child?.pid) return;
  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    });
    return;
  }
  try {
    child.kill('SIGTERM');
  } catch {
    // Процесс уже завершён.
  }
}
