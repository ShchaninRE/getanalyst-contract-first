import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const sourceSpec = path.resolve('asyncapi/asyncapi.yaml');
const outputDir = path.resolve('dist/asyncapi');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markdownish(value = '') {
  return escapeHtml(value).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
}

function decodePointerPart(value) {
  return value.replace(/~1/g, '/').replace(/~0/g, '~');
}

function getByPointer(document, pointer) {
  if (!pointer || pointer === '#') return document;
  const raw = pointer.startsWith('#') ? pointer.slice(1) : pointer;
  if (!raw) return document;
  if (!raw.startsWith('/')) throw new Error(`Неподдерживаемый JSON Pointer: ${pointer}`);
  return raw.slice(1).split('/').map(decodePointerPart).reduce((acc, key) => {
    if (acc == null || !(key in acc)) throw new Error(`Не найден фрагмент ${pointer}`);
    return acc[key];
  }, document);
}

const parsedCache = new Map();
async function loadYaml(filePath) {
  const absolute = path.resolve(filePath);
  if (!parsedCache.has(absolute)) {
    parsedCache.set(absolute, YAML.parse(await readFile(absolute, 'utf8')));
  }
  return structuredClone(parsedCache.get(absolute));
}

async function dereference(value, currentFile, stack = []) {
  if (Array.isArray(value)) return Promise.all(value.map(item => dereference(item, currentFile, stack)));
  if (!value || typeof value !== 'object') return value;

  if (typeof value.$ref === 'string') {
    const [filePart, fragmentPart = ''] = value.$ref.split('#', 2);
    const targetFile = filePart ? path.resolve(path.dirname(currentFile), filePart) : currentFile;
    const pointer = fragmentPart ? `#${fragmentPart}` : '#';
    const key = `${targetFile}${pointer}`;
    if (stack.includes(key)) throw new Error(`Циклическая ссылка $ref: ${[...stack, key].join(' -> ')}`);
    const targetDoc = await loadYaml(targetFile);
    const targetValue = getByPointer(targetDoc, pointer);
    const resolved = await dereference(targetValue, targetFile, [...stack, key]);
    const siblings = Object.fromEntries(Object.entries(value).filter(([k]) => k !== '$ref'));
    return Object.keys(siblings).length ? { ...resolved, ...(await dereference(siblings, currentFile, stack)) } : resolved;
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) result[key] = await dereference(child, currentFile, stack);
  return result;
}

function renderSchema(schema, level = 0) {
  if (!schema || typeof schema !== 'object') return '';
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  if (!Object.keys(properties).length) {
    return `<pre>${escapeHtml(YAML.stringify(schema))}</pre>`;
  }
  const rows = Object.entries(properties).map(([name, prop]) => {
    const type = prop.type ?? (prop.enum ? 'string' : 'object');
    const constraints = [
      prop.format ? `format: ${prop.format}` : '',
      prop.enum ? `enum: ${prop.enum.join(', ')}` : ''
    ].filter(Boolean).join(' · ');
    return `<tr>
      <td><code>${escapeHtml(name)}</code>${required.has(name) ? ' <span class="required">обяз.</span>' : ''}</td>
      <td>${escapeHtml(type)}</td>
      <td>${markdownish(prop.description ?? '')}${constraints ? `<div class="muted">${escapeHtml(constraints)}</div>` : ''}</td>
    </tr>`;
  }).join('');
  return `<table><thead><tr><th>Поле</th><th>Тип</th><th>Описание</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderExamples(message) {
  const examples = message?.examples ?? message?.payload?.examples ?? [];
  if (!examples.length) return '';
  return `<section><h3>Пример сообщения</h3>${examples.map(example => `<pre>${escapeHtml(JSON.stringify(example.payload ?? example, null, 2))}</pre>`).join('')}</section>`;
}

function getOperations(channel) {
  return ['publish', 'subscribe'].flatMap(direction => channel?.[direction] ? [{ direction, operation: channel[direction] }] : []);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const root = await loadYaml(sourceSpec);
const doc = await dereference(root, sourceSpec);
const channels = doc.channels ?? {};
const tags = doc.tags ?? [];
const operations = [];
for (const [channelName, channel] of Object.entries(channels)) {
  for (const { direction, operation } of getOperations(channel)) {
    operations.push({ channelName, channel, direction, operation });
  }
}

const tagNames = [...new Set([
  ...tags.map(t => t.name),
  ...operations.flatMap(x => (x.operation.tags ?? []).map(t => t.name))
].filter(Boolean))];

const sidebarGroups = tagNames.length ? tagNames.map(tag => {
  const links = operations.filter(x => (x.operation.tags ?? []).some(t => t.name === tag)).map(x =>
    `<a href="#${escapeHtml(x.operation.operationId ?? x.channelName)}">${escapeHtml(x.operation.summary ?? x.channelName)}</a>`
  ).join('');
  return `<div class="group"><div class="group-title">${escapeHtml(tag)}</div>${links}</div>`;
}).join('') : operations.map(x => `<a href="#${escapeHtml(x.operation.operationId ?? x.channelName)}">${escapeHtml(x.operation.summary ?? x.channelName)}</a>`).join('');

const serverCards = Object.entries(doc.servers ?? {}).map(([name, server]) => `
  <div class="server-card"><div><strong>${escapeHtml(name)}</strong></div><code>${escapeHtml(server.url ?? server.host ?? '')}</code><div class="muted">${escapeHtml(server.protocol ?? '')}</div><p>${markdownish(server.description ?? '')}</p></div>`).join('');

const operationSections = operations.map(({ channelName, channel, direction, operation }) => {
  const message = operation.message ?? {};
  const binding = channel.bindings ? `<h3>Bindings</h3><pre>${escapeHtml(YAML.stringify(channel.bindings))}</pre>` : '';
  return `<article id="${escapeHtml(operation.operationId ?? channelName)}" class="operation">
    <div class="eyebrow">${direction === 'publish' ? 'PUBLISH' : 'SUBSCRIBE'}</div>
    <h2>${escapeHtml(operation.summary ?? channelName)}</h2>
    <p>${markdownish(operation.description ?? '')}</p>
    <div class="meta"><span>Channel</span><code>${escapeHtml(channelName)}</code></div>
    ${operation.operationId ? `<div class="meta"><span>operationId</span><code>${escapeHtml(operation.operationId)}</code></div>` : ''}
    ${message.name ? `<h3>Сообщение: ${escapeHtml(message.name)}</h3>` : '<h3>Сообщение</h3>'}
    ${message.description ? `<p>${markdownish(message.description)}</p>` : ''}
    <h3>Payload</h3>
    ${renderSchema(message.payload)}
    ${renderExamples(message)}
    ${binding}
  </article>`;
}).join('');

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(doc.info?.title ?? 'AsyncAPI')}</title>
<style>
:root{--text:#1d2939;--muted:#667085;--line:#e4e7ec;--bg:#fff;--side:#f8fafc;--accent:#6c5ce7;--code:#101828}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:var(--bg)}
.layout{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;overflow:auto;background:var(--side);border-right:1px solid var(--line);padding:28px 20px}.brand{font-weight:800;font-size:18px;margin-bottom:6px}.version{font-size:12px;color:var(--muted);margin-bottom:26px}.group{margin:20px 0}.group-title{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin-bottom:8px}.sidebar a{display:block;color:#344054;text-decoration:none;padding:8px 10px;border-radius:7px;font-size:14px}.sidebar a:hover{background:#eef2f6}.content{max-width:1050px;padding:48px 64px 100px}.intro{padding-bottom:36px;border-bottom:1px solid var(--line)}h1{font-size:34px;margin:0 0 14px}h2{font-size:26px;margin:8px 0 14px}h3{font-size:17px;margin:28px 0 10px}p{line-height:1.65;color:#475467}.servers{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:18px}.server-card{border:1px solid var(--line);border-radius:10px;padding:16px}.operation{padding:48px 0;border-bottom:1px solid var(--line)}.eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;background:#ede9fe;color:#5b21b6;padding:5px 8px;border-radius:5px}.meta{display:flex;gap:18px;align-items:center;margin:8px 0}.meta span{width:90px;color:var(--muted);font-size:13px}code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;color:var(--code);background:#f2f4f7;border-radius:4px;padding:2px 5px}pre{background:#101828;color:#f9fafb;padding:18px;border-radius:9px;overflow:auto;line-height:1.45}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:12px 10px}th{color:var(--muted);font-size:12px;text-transform:uppercase}.required{font-size:10px;background:#fee4e2;color:#b42318;padding:2px 4px;border-radius:4px}.muted{font-size:12px;color:var(--muted);margin-top:5px}
@media(max-width:800px){.layout{display:block}.sidebar{position:relative;width:100%;height:auto}.content{padding:30px 22px}}
</style>
</head>
<body><div class="layout"><aside class="sidebar"><div class="brand">AsyncAPI</div><div class="version">${escapeHtml(doc.info?.version ?? '')}</div>${sidebarGroups}</aside><main class="content"><section class="intro"><h1>${escapeHtml(doc.info?.title ?? 'AsyncAPI')}</h1><p>${markdownish(doc.info?.description ?? '')}</p>${serverCards ? `<h3>Серверы</h3><div class="servers">${serverCards}</div>` : ''}</section>${operationSections}</main></div></body></html>`;

await writeFile(path.join(outputDir, 'index.html'), html, 'utf8');
console.log('AsyncAPI-документация собрана в dist/asyncapi без внешнего Generator/CLI');
