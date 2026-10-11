const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const moduleRef = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/boundedJson.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { module: moduleRef, exports: moduleRef.exports, TextDecoder, Uint8Array, Date, Error, Number, JSON, Promise,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 30000 ? 10 : ms), clearTimeout });
const { readBoundedJson } = moduleRef.exports;
async function main() {
  assert.equal((await readBoundedJson(new Request('http://localhost/test', { method: 'POST', body: '{"file_id":"fixture"}' }))).file_id, 'fixture');
  console.log('PASS valid master JSON without size header');
  await assert.rejects(readBoundedJson(new Request('http://localhost/test', { method: 'POST', body: JSON.stringify({ data: 'x'.repeat(65536) }) })), error => error.status === 413);
  for (const body of ['broken', 'null', '[]', '123']) await assert.rejects(readBoundedJson(new Request('http://localhost/test', { method: 'POST', body })), error => error.status === 400);
  console.log('PASS actual oversized and malformed master JSON rejected');
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  await assert.rejects(readBoundedJson(new Request('http://localhost/test', { method: 'POST', body, duplex: 'half' })), error => error.status === 408);
  assert.ok(cancelled); console.log('PASS stalled master request times out and cancels reader');
  console.log('3 bounded JSON tests passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
