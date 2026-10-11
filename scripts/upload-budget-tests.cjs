const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const state = {}, moduleRef = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../lib/boundedMultipart.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: moduleRef, exports: moduleRef.exports, require: () => ({ NextResponse: require("next/server").NextResponse }),
  globalThis: state, process: { env: { NEXTAUTH_URL: "https://beatzucker.de" } }, Error, Number, URL, Blob, File, Response, Uint8Array,
  setTimeout: (fn, ms) => setTimeout(fn, ms === 30000 ? 15 : ms), clearTimeout });
const { readBoundedMultipart } = moduleRef.exports;
function request(url = "https://beatzucker.de/api/mix-check") {
  const form = new FormData(); form.append("file", new File([new Uint8Array(44)], "test.wav"));
  return new Request(url, { method: "POST", body: form });
}
let passed = 0;
async function test(name, run) { await run(); assert.equal(state.__uploadBudget?.bytes ?? 0, 0); assert.equal(state.__uploadBudget?.requests ?? 0, 0); passed++; console.log(`PASS ${name}`); }
async function main() {
  await test("reservation persists while multipart File is used and release is idempotent", async () => {
    const result = await readBoundedMultipart(request(), 40 * 1024 * 1024);
    assert.equal(result.form.get("file").size, 44); assert.ok(state.__uploadBudget.bytes > 0);
    result.release(); result.release();
  });
  await test("one 200 MB upload and one public upload fit, third exceeds shared byte budget", async () => {
    const large = await readBoundedMultipart(request("https://beatzucker.de/api/upload"), 200 * 1024 * 1024);
    const small = await readBoundedMultipart(request(), 40 * 1024 * 1024);
    try { await assert.rejects(readBoundedMultipart(request(), 40 * 1024 * 1024), error => error.status === 503); }
    finally { large.release(); small.release(); }
  });
  await test("three public requests maximum across different audio routes", async () => {
    const leases = [];
    for (const name of ["mix-check", "codec-preview", "silence-normalize"]) leases.push(await readBoundedMultipart(request(`https://beatzucker.de/api/${name}`), 40 * 1024 * 1024));
    try { await assert.rejects(readBoundedMultipart(request(), 40 * 1024 * 1024), error => error.status === 503); }
    finally { leases.forEach(lease => lease.release()); }
  });
  await test("actual oversized body releases reservation", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024)); controller.close(); } });
    const req = new Request("https://beatzucker.de/api/upload", { method: "POST", duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body });
    await assert.rejects(readBoundedMultipart(req, 100), error => error.status === 413);
  });
  await test("malformed body and foreign origin do not leak budget", async () => {
    for (const headers of [{ "Content-Type": "multipart/form-data; boundary=x" }, { Origin: "https://foreign.invalid", "Content-Type": "multipart/form-data; boundary=x" }]) {
      const req = new Request("https://beatzucker.de/api/upload", { method: "POST", headers, body: "broken" });
      await assert.rejects(readBoundedMultipart(req, 100), error => [400, 403].includes(error.status));
    }
  });
  await test("idle upload timeout releases slot and cancels reader", async () => {
    let cancelled = false;
    const body = new ReadableStream({ cancel() { cancelled = true; } });
    const req = new Request("https://beatzucker.de/api/upload", { method: "POST", duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body });
    await assert.rejects(readBoundedMultipart(req, 100), error => error.status === 408);
    assert.equal(cancelled, true);
  });
  console.log(`${passed} upload-budget tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
