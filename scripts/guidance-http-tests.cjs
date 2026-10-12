/* Read-only production-build checks against the isolated local QA server. */
const assert = require('node:assert/strict');
if (process.env.BEATZUCKER_ISOLATED_QA !== '1') throw Error('Requires isolated QA flag');
const base = 'http://127.0.0.1:3013';
(async () => {
  const response = await fetch(base + '/sitemap.xml'); assert.equal(response.status, 200);
  const xml = await response.text(), urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, new Set(urls).size); assert.ok(urls.length > 60);
  assert.match(xml, /hreflang="de-DE"/); assert.match(xml, /hreflang="en"/); assert.doesNotMatch(xml, /\/dashboard|\/api\//);
  for (const url of urls) { const result = await fetch(base + new URL(url).pathname); assert.equal(result.status, 200, url); }
  console.log('PASS all ' + urls.length + ' sitemap targets return HTTP 200 in the final production build.');
  for (const [prefix, example, bridge] of [['', 'PRAXISBEISPIEL', 'VON DER THEORIE ZUR PRAXIS'], ['/en', 'PRACTICAL EXAMPLE', 'FROM THEORY TO PRACTICE']]) {
    const tool = await (await fetch(base + prefix + '/tools/streaming-preview')).text(); assert.ok(tool.includes(example));
    const article = await (await fetch(base + (prefix ? '/en/knowledge/' : '/ressourcen/') + 'stereo-breite-mastering')).text();
    assert.ok(article.includes(bridge)); assert.ok(article.includes(prefix + '/tools/stereo-phase'));
  }
  console.log('PASS practical examples and knowledge-to-tool links render in German and English.');
})().catch(error => { console.error(error); process.exitCode = 1; });
