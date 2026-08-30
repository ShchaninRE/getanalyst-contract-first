import { cp, copyFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const swaggerUiDist = require('swagger-ui-dist');
const source = swaggerUiDist.absolutePath();
const target = path.resolve('dist/swagger');

await cp(source, target, { recursive: true });
await copyFile(path.join(target, 'index.html'), path.join(target, 'openapi.html'));
await mkdir(path.join(target, 'openapi'), { recursive: true });
await copyFile('openapi/openapi.yaml', path.join(target, 'openapi/openapi.yaml'));
await mkdir(path.resolve('dist/swagger/schemas'), { recursive: true });
await cp('schemas/openapi', path.resolve('dist/swagger/schemas/openapi'), { recursive: true });
await mkdir(path.resolve('dist/swagger/examples'), { recursive: true });
await cp('examples/openapi', path.resolve('dist/swagger/examples/openapi'), { recursive: true });

const initializer = `window.onload = function() {
  window.ui = SwaggerUIBundle({
    url: './openapi/openapi.yaml',
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayRequestDuration: true,
    persistAuthorization: true,
    tryItOutEnabled: true,
    filter: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: 'StandaloneLayout'
  });
};
`;

await writeFile(path.join(target, 'swagger-initializer.js'), initializer, 'utf8');
console.log('Swagger UI собран в dist/swagger; OpenAPI, схемы и примеры скопированы с сохранением относительных $ref');
