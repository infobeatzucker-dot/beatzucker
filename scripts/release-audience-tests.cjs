const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/releases.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,module:mod});
const {RELEASES,APP_VERSION}=mod.exports;
assert.equal(APP_VERSION,require('../package.json').version);
assert.equal(new Set(RELEASES.map(row=>row.version)).size,RELEASES.length);
assert.ok(!RELEASES.some(row=>row.version==='0.13.0'),'Admin-only release must not appear in public history');
for(const row of RELEASES)for(const lang of ['de','en']){
 assert.ok(row.title[lang]?.trim());assert.ok(row.summary[lang]?.trim());assert.ok(row.improvements[lang]?.length);
 const text=[row.title[lang],row.summary[lang],...row.improvements[lang]].join(' ');
 assert.doesNotMatch(text,/\b(admin|administrator|prisma|docker|regression|infrastructure|migration|deploy(?:ment)?|buildx|SQLite)\b/i,`${row.version}/${lang} contains internal details`);
}
assert.match(fs.readFileSync('RELEASING.md','utf8'),/Endnutzer/);
console.log('PASS complete DE/EN public history, synchronized version and end-user-only audience policy');
