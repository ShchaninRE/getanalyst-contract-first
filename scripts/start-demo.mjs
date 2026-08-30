import { mkdir, open } from 'node:fs/promises';
import { spawnNpmSync, spawnNpm, stopProcessTree } from './platform.mjs';

const build = spawnNpmSync(['run', 'build']);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await mkdir('.demo-logs', { recursive: true });

async function start(name, npmScript, logFile) {
  const handle = await open(logFile, 'w');
  const child = spawnNpm(['run', npmScript], {
    stdio: ['ignore', handle.fd, handle.fd],
    windowsHide: true
  });
  child.once('exit', () => handle.close().catch(() => {}));
  console.log(`Запущен ${name} (PID ${child.pid})`);
  return child;
}

const processes = [
  await start('Prism mock', 'mock', '.demo-logs/prism.log'),
  await start('ReDoc', 'serve:redoc', '.demo-logs/redoc.log'),
  await start('Swagger UI', 'serve:swagger', '.demo-logs/swagger.log')
];

let stopping = false;
function cleanup(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\nОстановка сервисов демо...');
  for (const child of processes) stopProcessTree(child);
  process.exit(exitCode);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

for (const child of processes) {
  child.once('exit', code => {
    if (!stopping) {
      console.error(`Один из сервисов неожиданно завершился с кодом ${code}. Проверьте .demo-logs/.`);
      cleanup(code || 1);
    }
  });
}

async function waitFor(url, headers) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return;
    } catch {
      // Сервис ещё запускается.
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Сервис не запустился за 30 секунд: ${url}`);
}

try {
  await Promise.all([
    waitFor('http://localhost:8080'),
    waitFor('http://localhost:8081'),
    waitFor('http://localhost:4010/boards/board-001', { Authorization: 'Bearer demo-token' })
  ]);
} catch (error) {
  console.error(error.message);
  console.error('Проверьте логи в .demo-logs/.');
  cleanup(1);
}

console.log('\nДемо GetAnalyst запущено:');
console.log('  ReDoc + AsyncAPI:      http://localhost:8080');
console.log('  Swagger UI + AsyncAPI: http://localhost:8081');
console.log('  Prism mock:            http://localhost:4010');
console.log('\nНажмите Ctrl+C, чтобы остановить все сервисы.');
console.log('Логи находятся в .demo-logs/\n');

await new Promise(() => {});
