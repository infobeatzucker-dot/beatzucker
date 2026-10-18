const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/ShowcaseGallery.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module:mod,exports:mod.exports,require:name=>name.endsWith('.css')?{}:require(name)});
const Gallery=mod.exports.default,art=mod.exports.ShowcaseArtwork,tracks=require('../public/audio/showcase/manifest.json').tracks;
for(const en of [false,true])for(const count of [1,2,4,5]){
 const selected=tracks.slice(0,Math.min(count,4));if(count===5)selected.push({...tracks[0],id:'admin-fifth',title:'User supplied <track>'});
 for(let index=0;index<selected.length;index++){
  const picks=[],sides=[];let toggles=0;const props={tracks:selected,index,side:'original',playing:false,loading:false,en,onSelect:i=>picks.push(i),onToggle:()=>toggles++,onSide:s=>sides.push(s)};
  const tree=Gallery(props),html=renderToStaticMarkup(tree);assert.ok(html.includes(en?'Original':'Original'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('undefined'));assert.ok(html.includes(selected[index].title.replace(/</g,'&lt;').replace(/>/g,'&gt;')));
  function walk(n){if(!n||typeof n!=='object')return;if(n.type==='button'){const p=n.props;if(p.className?.includes('gallery-next'))p.onClick();if(p.className?.includes('gallery-prev'))p.onClick();if(p.className==='gallery-play')p.onClick();if(p.children?.[1]===(en?'Mastered':'Gemastert'))p.onClick();}React.Children.forEach(n.props?.children,walk);}
  walk(tree);assert.equal(toggles,1);assert.ok(sides.includes('master'));assert.ok(picks.every(i=>i>=0&&i<selected.length));if(count===1)assert.equal(picks.length,0);else assert.equal(picks.length,2);
 }
}
for(const t of tracks){const html=renderToStaticMarkup(React.createElement(art,{track:t}));assert.ok(html.includes(`/images/showcase/${t.id}-v1.webp`));const p=`public/images/showcase/${t.id}-v1.webp`;assert.ok(fs.statSync(p).size<180000);assert.equal(fs.readFileSync(p).toString('ascii',8,12),'WEBP');}
assert.ok(!renderToStaticMarkup(React.createElement(art,{track:{...tracks[0],title:'Replacement song'}})).includes('<img'),'Do not show an old named cover for a renamed publication');
const view=fs.readFileSync('components/MasteringListeningShowcase.tsx','utf8');assert.ok(view.includes('onSide={selectSide}'));assert.ok(view.includes('onSelect={selectTrack}'));assert.ok(view.includes('onToggle={()=>void toggle()}'));assert.ok(view.includes('[matched, setMatched] = useState(false)'));
assert.ok(fs.readFileSync('components/showcase-gallery.css','utf8').includes('prefers-reduced-motion'));
console.log('PASS bilingual cover gallery for 1–5 tracks, wrapped navigation, A/B/play callbacks, renamed-track fallback, real compact artwork and reduced-motion styles');
