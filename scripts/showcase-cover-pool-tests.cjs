const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/showcaseCovers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports});
const {SHOWCASE_COVERS:pool,assignShowcaseCovers:assign,validCoverHistory:valid}=mod.exports;
assert.equal(pool.length,10);for(const url of pool){assert.ok(fs.existsSync('public'+url));assert.ok(fs.statSync('public'+url).size<180000);}
const ids=['one','two','three','four','future-fifth'];let previous={};
for(let visit=0;visit<200;visit++){const next=assign(ids,previous,()=>((visit*13)%97)/97);assert.equal(Object.keys(next).length,5);assert.equal(new Set(Object.values(next)).size,5);for(const id of ids){assert.ok(pool.includes(next[id]));assert.notEqual(next[id],previous[id]);}previous=next;}
const first=assign(ids.slice(0,4),{}),fifth=assign(ids,{},()=>0,first);for(const id of ids.slice(0,4))assert.equal(fifth[id],first[id],'Publication updates must not reshuffle existing cards');assert.ok(fifth['future-fifth']);
assert.equal(Object.keys(valid({'bad/id':'https://evil.invalid/a.webp',good:pool[0],other:'/not-a-cover'})).join(','),'good');assert.equal(Object.keys(valid(null)).length,0);
const view=fs.readFileSync('components/MasteringListeningShowcase.tsx','utf8');assert.ok(view.includes('sessionStorage'));assert.ok(view.includes('assignedCovers.current'));assert.ok(view.includes('useState<Record<string, string>>({})'),'SSR must remain deterministic');
console.log('PASS ten real covers, five unique assignments, no immediate same-track repeats across 200 visits, stable updates, safe storage and hydration');
