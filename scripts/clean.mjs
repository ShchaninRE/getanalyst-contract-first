import { rm, mkdir } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/redoc', { recursive: true });
await mkdir('dist/swagger', { recursive: true });
await mkdir('dist/specs', { recursive: true });
