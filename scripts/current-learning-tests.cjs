const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,Date,URL,require:name=>{if(name==='next/link')return p=>React.createElement('a',p,p.children);if(name.startsWith('@/')||name.startsWith('./')){const p=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);return load(p+(fs.existsSync(p+'.ts')?'.ts':'.tsx'));}return require(name);}});cache.set(file,m.exports);return m.exports;}
const {ARTICLES}=load('app/data/ressourcen.ts'),copy=load('lib/masteringLearning.ts');
assert.ok(copy.RECENT_MASTERING_FAQS.length>0);for(const f of copy.RECENT_MASTERING_FAQS)for(const k of ['qDe','qEn','aDe','aEn'])assert.ok(f[k]?.length>10);
for (const article of ARTICLES) {
  assert.match(article.updatedAt, /^\d{4}-\d{2}-\d{2}$/, article.slug);
  assert.ok(article.updatedAt >= article.publishedAt, article.slug);
  for (const related of article.relatedSlugs) assert.ok(ARTICLES.some(candidate => candidate.slug === related), related);
  const links = article.content.sections.flatMap(section => section.links ?? []);
  assert.ok(links.length >= 2, article.slug + ' has contextual links');
  for (const lang of ['de', 'en']) {
    assert.ok(article.title[lang] && article.metaDescription[lang] && article.content.intro[lang]);
    for (const section of article.content.sections) assert.ok(section.h2[lang] && section.body[lang]);
    for (const link of links) {
      assert.ok(link.label[lang]?.trim(), article.slug + ' has a translated link label');
      assert.match(link.href[lang], lang === 'en' ? /^\/en(?:\/|#|$)/ : /^\/(?!en(?:\/|#|$))/);
      const { pathname } = new URL(link.href[lang], 'https://beatzucker.de');
      const parent = lang === 'en' ? '/en/knowledge/' : '/ressourcen/';
      if (pathname.startsWith(parent)) assert.ok(ARTICLES.some(candidate => candidate.slug === pathname.slice(parent.length)), pathname);
      else assert.ok(fs.existsSync(path.join('app', pathname, 'page.tsx')), pathname);
    }
  }
}
const platformArticle = ARTICLES.find(article => article.slug === 'mastering-plattformen-lufs');
const platformRows = platformArticle.content.sections.find(section => section.table).table.rows;
for (const [name, lufs] of Object.values(load('lib/masteringLab.ts').labPlatforms)) {
  if (lufs === null) continue;
  assert.ok(platformRows.some(([nameCell, lufsCell]) =>
    nameCell.en.includes(name) && lufsCell.en === String(lufs).replace('-', '−') + ' LUFS'
  ), name + ' preset matches the article');
}
const Guide=load('components/CurrentMasteringGuide.tsx').default;
for(const lang of ['de','en']){const html=renderToStaticMarkup(React.createElement(Guide,{lang}));assert.ok(html.includes(lang==='en'?'/en/tools':'/tools'));assert.ok(html.includes((lang==='en'?'/en/knowledge/':'/ressourcen/')+'referenz-mastering-character'));assert.ok(html.includes('Character'));assert.ok(html.includes(lang==='en'?'Report a problem':'Problem melden'));assert.ok(html.includes('/tools/album-consistency'));assert.ok(html.includes(lang==='en'?'PDF report':'PDF-Bericht'));}
for(const f of ['components/FeaturesSection.tsx','app/features/page.tsx','app/help/page.tsx'])assert.ok(fs.readFileSync(f,'utf8').includes('<CurrentMasteringGuide lang={lang}'));
const faq=fs.readFileSync('app/help/page.tsx','utf8');assert.ok(faq.includes('RECENT_MASTERING_FAQS'));assert.ok(!faq.includes('strips frequencies below 120 Hz'));assert.ok(!faq.includes('between 30 seconds and 3 minutes'));assert.ok(!faq.includes('right on the target LUFS'));
const spotify=JSON.stringify(ARTICLES.find(a=>a.slug==='song-klingt-leise-spotify'));assert.ok(!spotify.includes('will NOT boost'));assert.ok(spotify.includes('headroom'));assert.ok(spotify.includes('https://support.spotify.com/artists/article/loudness-normalization/'));
const map=load('app/sitemap.ts').default();for(const p of ['/help','/en/help','/features','/en/features'])assert.equal(map.find(r=>r.url==='https://beatzucker.de'+p).lastModified.toISOString().slice(0,10),'2026-11-21');for(const p of ['/ressourcen','/en/knowledge'])assert.equal(map.find(r=>r.url==='https://beatzucker.de'+p).lastModified.toISOString().slice(0,10),'2026-11-22');
console.log('PASS current bilingual FAQ/workflows/knowledge, real feature boundaries, legacy claim corrections, incoming links and truthful content dates');
