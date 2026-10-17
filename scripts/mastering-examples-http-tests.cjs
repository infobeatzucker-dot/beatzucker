/* Real local production-build HTTP, isolated fixture publication only. No production requests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PrismaClient}=require('@prisma/client');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA flag');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','tools-audit-20261011','runtime'),database=path.join(folder,'qa.sqlite');
if(!fs.existsSync(database)||fs.realpathSync(folder)!==folder)throw Error('Expected isolated SQLite fixture');
const db=new PrismaClient({datasources:{db:{url:'file:'+database.replaceAll('\\','/')}}}),base='http://127.0.0.1:3013';
const samples=require('../public/audio/showcase/manifest.json').tracks;
const schemaNodes=html=>[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match=>{const value=JSON.parse(match[1]);return value['@graph']||[value];});
async function page(route){const response=await fetch(base+route,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,route);return response.text();}
(async()=>{
 const previous=await db.showcasePublication.findUnique({where:{id:'public'}});
 try{
  const tracks=structuredClone(samples),extra=structuredClone(samples[0]);extra.id='isolated-seo-fifth';extra.title='Isolated fifth example';extra.genre='Synthetic metadata fixture';tracks.push(extra);
  await db.showcasePublication.upsert({where:{id:'public'},create:{id:'public',revision:1,tracksJson:JSON.stringify(tracks)},update:{revision:{increment:1},tracksJson:JSON.stringify(tracks)}});
  for(const [route,lang]of [['/hoervergleich','de'],['/en/mastering-examples','en']]){
   const html=await page(route);assert.equal((html.match(/<h1[^>]*>/g)||[]).length,1);assert.ok(html.includes(`class="mastering-examples-page" lang="${lang}"`));
   assert.ok(html.includes(extra.title));assert.ok(html.includes(extra.genre));assert.ok(html.includes(`id="example-${extra.id}"`));assert.ok(html.includes(extra.original.url));assert.ok(html.includes(extra.master.url));
   const nodes=schemaNodes(html),collection=nodes.find(node=>node['@type']==='CollectionPage'),list=nodes.find(node=>node['@type']==='ItemList'&&node['@id']?.endsWith('#examples'));
   assert.equal(collection.url,'https://beatzucker.de'+route);assert.equal(list.numberOfItems,5);assert.equal(list.itemListElement.length,5);assert.ok(nodes.some(node=>node['@type']==='BreadcrumbList'));
   assert.ok(!html.includes('noindex'));assert.ok(html.includes('href="/hoervergleich"'));assert.ok(html.includes('href="/en/mastering-examples"'));
   assert.ok(html.includes(lang==='de'?'Lautheit von Klang trennen':'Separate loudness from tone'));
   assert.ok(html.includes(lang==='de'?'Wiedergabe startet erst':'Playback starts only'));
   console.log('PASS actual '+lang+' server HTML: fifth example, real pair URLs, measurements, language and parseable matching schema');
  }
  tracks[4].title='Updated without rebuilding';await db.showcasePublication.update({where:{id:'public'},data:{revision:{increment:1},tracksJson:JSON.stringify(tracks)}});
  assert.ok((await page('/hoervergleich')).includes('Updated without rebuilding'));assert.ok((await page('/en/mastering-examples')).includes('Updated without rebuilding'));
  console.log('PASS actual publication changes visible in DE/EN server HTML without a new build');
  for(const [route,href]of [['/','/hoervergleich'],['/en','/en/mastering-examples'],['/ressourcen/lufs-erklaert','/hoervergleich'],['/en/knowledge/lufs-erklaert','/en/mastering-examples']])assert.ok((await page(route)).includes(`href="${href}"`),route);
  const xml=await page('/sitemap.xml');for(const route of ['/hoervergleich','/en/mastering-examples'])assert.ok(xml.includes('<loc>https://beatzucker.de'+route+'</loc>'));
  assert.equal((await fetch(base+'/api/admin/showcase')).status,403);
  console.log('PASS homepage, guides and sitemap link both public pages; admin publication remains protected');
 }finally{
  if(previous)await db.showcasePublication.update({where:{id:'public'},data:{revision:previous.revision,tracksJson:previous.tracksJson,updatedAt:previous.updatedAt}});
  else await db.showcasePublication.deleteMany({where:{id:'public'}});
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
