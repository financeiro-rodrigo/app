/* Guarda os arquivos do app no aparelho para abrir sem internet.
   Só guarda os arquivos do próprio app; nunca os seus dados.
   Ao publicar uma nova versão, mude o número abaixo. */
const VERSAO = 'financeiro-v53';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png', './icone-maskable-512.png', './topo.jpg', './no.png', './logos.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('financeiro-') && k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* Arquivo compartilhado de outro aplicativo (Itaú, Caixa…): guarda por um instante e abre o app para ler */
  if (e.request.method === 'POST' && url.origin === location.origin && url.searchParams.has('share')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const c = await caches.open('share-tmp');
        for (const k of await c.keys()) await c.delete(k);
        let i = 0;
        for (const v of fd.getAll('arquivos')) {
          if (v && v.name !== undefined) await c.put('/app/__share/' + (i++), new Response(v, { headers: { 'x-nome': encodeURIComponent(v.name || 'arquivo'), 'content-type': v.type || 'application/octet-stream' } }));
        }
      } catch (err) {}
      return Response.redirect('./?share=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const chave = url.origin + url.pathname;
  e.respondWith(fetch(url.href, { cache: 'no-cache' })
    .then(r => { if (r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(chave, copia)).catch(() => {}); } return r; })
    .catch(() => caches.open(VERSAO).then(c => c.match(chave, { ignoreSearch: true })).then(r => r || Response.error())));
});
