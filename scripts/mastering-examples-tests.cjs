/* Server-rendered content with a controlled current publication; no DB, audio or network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const defaults=require('../public/audio/showcase/manifest.json').tracks;
let current=structuredClone(defaults),fail=false,reads=0,playerProps;
function load(file,imports={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:mod.exports,module:mod,require:name=>name in imports?imports[name]:require(name),console});return mod.exports;}
const types=load('lib/showcaseTracks.ts',{'@/public/audio/showcase/manifest.json':require('../public/audio/showcase/manifest.json')});
const Page=load('components/MasteringExamplesPage.tsx',{
 'next/link':({children,...props})=>React.createElement('a',props,children),
 'lucide-react':Object.fromEntries(['ArrowRight','AudioLines','Headphones','ShieldCheck'].map(name=>[name,()=>null])),
 '@/components/Header':()=>null,'@/components/Footer':()=>null,
 '@/components/MasteringListeningShowcase':props=>{playerProps=props;return React.createElement('section',{id:'before-after','data-pair-count':props.initialTracks.length});},
 '@/lib/showcasePublication':{readShowcase:async()=>{reads++;if(fail)throw Error('isolated database unavailable');return {revision:2,tracks:current};}},
 '@/lib/showcaseTracks':types,'./mastering-examples.css':{},
}).default;
(async()=>{
 for(const lang of ['de','en']){
  const html=renderToStaticMarkup(await Page({lang}));assert.equal((html.match(/<h1>/g)||[]).length,1);assert.equal(playerProps.lang,lang);assert.deepEqual(playerProps.initialTracks,current);
  const schema=JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const list=schema['@graph'].find(item=>item['@type']==='ItemList');assert.equal(list.numberOfItems,current.length);assert.equal(list.itemListElement.length,current.length);
  for(const [index,track]of current.entries()){
   assert.ok(html.includes(track.title));assert.ok(html.includes(track.genre));assert.ok(html.includes(`id="example-${track.id}"`));
   for(const side of ['original','master'])assert.ok(html.includes(`href="${track[side].url}"`));
   assert.equal(list.itemListElement[index].item.associatedMedia.length,2);assert.equal(list.itemListElement[index].item.duration,'PT24S');
  }
  assert.ok(html.includes(lang==='de'?'Lautheit von Klang trennen':'Separate loudness from tone'));assert.ok(html.includes(lang==='de'?'kein verlustfreier Vergleich':'not a lossless comparison'));
  assert.ok(html.includes('href="/hoervergleich"'));assert.ok(html.includes('href="/en/mastering-examples"'));assert.ok(html.includes(lang==='de'?'/ressourcen/lufs-erklaert':'/en/knowledge/lufs-erklaert'));
  assert.ok(!JSON.stringify(schema).includes('aggregateRating'));assert.ok(!JSON.stringify(schema).includes('Review'));
 }
 assert.equal(reads,2);console.log('PASS DE/EN server HTML, live measurements and pair links, single H1, breadcrumbs and honest excerpt-only schema');
 current=structuredClone(defaults.slice(0,1));current[0].title='New title < / >';current[0].genre='New genre';
 let html=renderToStaticMarkup(await Page({lang:'en'}));assert.ok(html.includes('New genre'));assert.ok(!html.includes(defaults[1].title));assert.equal(playerProps.initialTracks.length,1);
 current[0].title='</script><script>alert(1)</script>';html=renderToStaticMarkup(await Page({lang:'en'}));assert.ok(!html.includes(current[0].title));assert.ok(html.includes('\\u003c/script>'));assert.equal((html.match(/<script/g)||[]).length,1);
 fail=true;await assert.rejects(Page({lang:'en'}),/unavailable/);fail=false;current=[];await assert.rejects(Page({lang:'de'}),/Invalid/);
 console.log('PASS updated publication and count visible immediately; safe JSON/text escaping; no stale fallback on database failure');
 const source=fs.readFileSync('components/MasteringListeningShowcase.tsx','utf8');assert.match(source,/if \(initialTracks\) return/);assert.ok(source.includes('useState(initialTracks ?? SHOWCASE_TRACKS)'));assert.ok(source.includes('[matched, setMatched] = useState(false)'));
 for(const [file,lang]of [['app/hoervergleich/page.tsx','de'],['app/en/mastering-examples/page.tsx','en']]){const text=fs.readFileSync(file,'utf8');assert.ok(text.includes('force-dynamic'));assert.ok(text.includes(`lang="${lang}"`));assert.ok(text.includes('pageMetadata('));assert.ok(text.includes('x-default'));}
 const footer=fs.readFileSync('components/Footer.tsx','utf8'),practice=fs.readFileSync('components/ToolPractice.tsx','utf8');for(const text of [footer,practice]){assert.ok(text.includes('/hoervergleich'));assert.ok(text.includes('/en/mastering-examples'));}
 console.log('PASS localized canonical route pairs, crawlable incoming links, current server-fed player and original-level default');
})().catch(error=>{console.error(error);process.exitCode=1;});
