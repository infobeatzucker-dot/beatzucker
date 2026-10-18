const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,Date,URL,require:name=>{if(name==='next/link')return props=>React.createElement('a',props,props.children);if(name.startsWith('@/')||name.startsWith('./')){const p=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);return load(p+(fs.existsSync(p+'.ts')?'.ts':'.tsx'));}return require(name);}});cache.set(file,mod.exports);return mod.exports;}
const articles=load('app/data/ressourcen.ts').ARTICLES;
assert.equal(articles.length,15);assert.equal(new Set(articles.map(a=>a.slug)).size,15);
for(const slug of ['lufs-erklaert','sample-rate-bit-depth']){const a=articles.find(a=>a.slug===slug);assert.equal(a.updatedAt,'2026-10-18');for(const lang of ['de','en']){assert.ok(a.content.intro[lang].length>150);assert.ok(a.metaDescription[lang]);assert.ok(a.content.sections.length>=5);for(const s of a.content.sections)assert.ok(s.h2[lang]&&s.body[lang]);}}
const {stereoAdvice,stereoStatus}=load('lib/stereoGuidance.ts');
const baseline={valid:true,widthDefined:true,width:0,correlation:1,monoLoss:0,balance:0,points:[],bands:[{name:'< 160 Hz',valid:true,correlation:1}]};
for(const lang of ['de','en']){
 assert.equal(stereoAdvice({...baseline,valid:false},lang)[0].id,'silent');
 assert.equal(stereoAdvice(baseline,lang)[0].id,'listen');
 assert.equal(stereoAdvice({...baseline,correlation:0,width:1,monoLoss:-3.01},lang)[0].id,'listen');
 const risk={...baseline,correlation:-1,widthDefined:false,monoLoss:-80,balance:4,bands:[{name:'< 160 Hz',valid:true,correlation:-.5}]};
 assert.equal(stereoAdvice(risk,lang).map(a=>a.id).join(','),'phase,bass,mono,balance');
 assert.equal(stereoAdvice({...baseline,bands:[{name:'< 160 Hz',valid:false,correlation:-1}]},lang)[0].id,'listen');
 assert.notEqual(stereoStatus({...baseline,bands:risk.bands},lang),stereoStatus(baseline,lang));
 const C=load('components/StereoInterpretation.tsx').default;
 for(const result of [undefined,baseline,risk,{...baseline,valid:false}]){const html=renderToStaticMarkup(React.createElement(C,{lang,result}));assert.ok(html.includes(lang==='en'?'/en/tools/reference-comparison':'/tools/reference-comparison'));assert.ok(!html.includes('NaN'));assert.ok(html.includes(lang==='en'?'not live playback':'nicht die laufende Wiedergabe'));}
}
const {APP_VERSION}=load('lib/releases.ts');assert.equal(APP_VERSION,'1.3.0');assert.equal(require('../package.json').version,APP_VERSION);const lock=require('../package-lock.json');assert.equal(lock.version,APP_VERSION);assert.equal(lock.packages[''].version,APP_VERSION);
for(const file of ['components/Header.tsx','components/ReleaseHistory.tsx'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/\bBeta\b/i);
const map=load('app/sitemap.ts').default();assert.equal(map.length,78);for(const prefix of ['/ressourcen/','/en/knowledge/'])for(const slug of ['lufs-erklaert','sample-rate-bit-depth'])assert.equal(map.find(r=>r.url.endsWith(prefix+slug)).lastModified.toISOString().slice(0,10),'2026-10-18');
console.log('PASS full-release/no-beta, bilingual revised guides, mono/phase/bass/balance/silence advice, rendered links and truthful sitemap dates');
