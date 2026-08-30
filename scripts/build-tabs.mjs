import { writeFile, cp, rm } from 'node:fs/promises';

function shell({ title, openapiSrc, asyncapiSrc }) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *{box-sizing:border-box} html,body{height:100%;margin:0;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff}
    body{overflow:hidden}.topbar{height:58px;border-bottom:1px solid #e4e7ec;display:flex;align-items:center;padding:0 24px;gap:8px;background:#fff;position:relative;z-index:5}
    .brand{font-weight:700;margin-right:18px;color:#101828}.tab{border:0;background:transparent;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:650;color:#667085;cursor:pointer}.tab:hover{background:#f8fafc;color:#344054}.tab.active{background:#f2f4f7;color:#101828}
    .frame{display:none;width:100%;height:calc(100vh - 58px);border:0}.frame.active{display:block}
  </style>
</head>
<body>
  <nav class="topbar">
    <div class="brand">GetAnalyst API Demo</div>
    <button class="tab active" data-target="openapi">OpenAPI</button>
    <button class="tab" data-target="asyncapi">AsyncAPI</button>
  </nav>
  <iframe id="openapi" class="frame active" src="${openapiSrc}" title="OpenAPI"></iframe>
  <iframe id="asyncapi" class="frame" src="${asyncapiSrc}" title="AsyncAPI"></iframe>
  <script>
    const tabs=[...document.querySelectorAll('.tab')];
    const frames=[...document.querySelectorAll('.frame')];
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.toggle('active',t===tab));
      frames.forEach(f=>f.classList.toggle('active',f.id===tab.dataset.target));
      history.replaceState(null,'','#'+tab.dataset.target);
    }));
    const requested=location.hash.slice(1);
    if(requested){document.querySelector('.tab[data-target="'+requested+'"]')?.click();}
  </script>
</body>
</html>`;
}

// AsyncAPI Generator создаёт полноценный сайт с собственными asset-файлами.
// Копируем весь результат под каждый интерфейс, а не только index.html.
await rm('dist/redoc/asyncapi-docs', { recursive: true, force: true });
await rm('dist/swagger/asyncapi-docs', { recursive: true, force: true });
await cp('dist/asyncapi', 'dist/redoc/asyncapi-docs', { recursive: true });
await cp('dist/asyncapi', 'dist/swagger/asyncapi-docs', { recursive: true });

await writeFile('dist/redoc/index.html', shell({
  title:'GetAnalyst — ReDoc / AsyncAPI',
  openapiSrc:'./openapi.html',
  asyncapiSrc:'./asyncapi-docs/index.html'
}), 'utf8');

await writeFile('dist/swagger/index.html', shell({
  title:'GetAnalyst — Swagger / AsyncAPI',
  openapiSrc:'./openapi.html',
  asyncapiSrc:'./asyncapi-docs/index.html'
}), 'utf8');

console.log('В ReDoc и Swagger добавлены вкладки OpenAPI / AsyncAPI; AsyncAPI отображается локально сгенерированной HTML-документацией');
