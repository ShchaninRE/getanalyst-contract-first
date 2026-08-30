import { cp, copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/specs', { recursive: true });
await copyFile('openapi/openapi.yaml', 'dist/specs/openapi.yaml');
await copyFile('asyncapi/asyncapi.yaml', 'dist/specs/asyncapi.yaml');
await cp('schemas', 'dist/schemas', { recursive: true });
await cp('examples', 'dist/examples', { recursive: true });
console.log('Спецификации, внешние схемы и примеры скопированы в dist');
