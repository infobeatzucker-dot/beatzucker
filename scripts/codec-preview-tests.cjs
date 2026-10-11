/* Isolated API regressions: no network, accounts or real filesystem writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { PassThrough } = require("node:stream");
let removed, calls, allow, workerStatus, headers, hold;
const state = {};
const boundedModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../lib/boundedMultipart.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: boundedModule, exports: boundedModule.exports, require: () => ({ NextResponse: require("next/server").NextResponse }),
  globalThis: state, process: { env: { NEXTAUTH_URL: "https://beatzucker.de" } }, Error, Number, URL, Blob, File, Response, Uint8Array, setTimeout, clearTimeout });
const mocks = {
  crypto: { ...require("node:crypto"), randomUUID: () => "test-only-id" },
  "fs/promises": { mkdir: async () => {}, unlink: async file => removed.push(file) },
  fs: { createWriteStream: () => { const stream = new PassThrough(); stream.resume(); return stream; } },
  path: require("node:path"), stream: require("node:stream"), "stream/promises": require("node:stream/promises"),
  "next/server": { NextResponse: require("next/server").NextResponse },
  "@/lib/rateLimit": { rateLimit: () => allow },
  "@/lib/pythonService": { pythonServiceHeaders: () => ({ "X-Service-Token": "test-only" }) },
  "@/lib/boundedMultipart": boundedModule.exports,
};
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../app/api/codec-preview/route.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const moduleRef = { exports: {} };
vm.runInNewContext(code, { module: moduleRef, exports: moduleRef.exports, require: name => {
  if (!(name in mocks)) throw Error(`Unmocked dependency: ${name}`);
  return mocks[name];
}, console: { error() {} }, process: { env: { NEXTAUTH_URL: "https://beatzucker.de", TEMP_UPLOAD_DIR: "/mock/uploads" } },
globalThis: state, Number, URL, Blob, File, Response, Buffer, Uint8Array, AbortSignal, Error,
fetch: async (url, options) => {
  assert.equal(url, "http://localhost:8001/codec-preview");
  assert.equal(options.headers["X-Service-Token"], "test-only");
  const data = JSON.parse(options.body); calls.push(data);
  if (hold) await hold.promise;
  return new Response(new Uint8Array(64), { status: workerStatus, headers: headers ?? {
    "Content-Type": data.codec === "aac256" ? "audio/mp4" : "audio/mpeg",
    "X-Codec-Format": data.codec, "X-Encoded-True-Peak": "-1.42", "X-Encoded-LUFS": "-15.30",
  } });
} }, { filename: "codec-preview/route.ts" });
function request({ codec = "aac256", origin = "https://beatzucker.de", magic = true } = {}) {
  const bytes = new Uint8Array(44);
  if (magic) { bytes.set(Buffer.from("RIFF")); bytes.set(Buffer.from("WAVE"), 8); }
  const form = new FormData(); form.append("file", new File([bytes], "track.wav", { type: "audio/wav" }));
  form.append("codec", codec);
  return new Request("https://beatzucker.de/api/codec-preview", { method: "POST", headers: { Origin: origin }, body: form });
}
let passed = 0;
async function test(name, run) {
  removed = []; calls = []; allow = true; workerStatus = 200; headers = undefined; hold = undefined;
  await run(); assert.equal(state.__codecRequests ?? 0, 0); passed++; console.log(`PASS ${name}`);
}
async function main() {
  await test("all three codecs use one protected worker request and preserve measured headers", async () => {
    for (const codec of ["aac256", "mp3320", "mp3128"]) {
      const response = await moduleRef.exports.POST(request({ codec }));
      assert.equal(response.status, 200); assert.equal(response.headers.get("X-Codec-Format"), codec);
      assert.equal(response.headers.get("X-Encoded-True-Peak"), "-1.42");
      assert.equal(response.headers.get("X-Encoded-LUFS"), "-15.30");
      assert.equal(response.headers.get("Cache-Control"), "no-store, private");
      assert.equal((await response.arrayBuffer()).byteLength, 64);
    }
    assert.deepEqual(calls.map(item => item.codec), ["aac256", "mp3320", "mp3128"]);
    assert.equal(removed.length, 3);
  });
  await test("foreign origin rejected before files and DSP", async () => {
    assert.equal((await moduleRef.exports.POST(request({ origin: "https://foreign.example" }))).status, 403);
    assert.equal(calls.length, 0); assert.equal(removed.length, 0);
  });
  await test("unsupported and prototype codecs never reach DSP", async () => {
    for (const codec of ["unknown", "__proto__", "constructor", ""]) assert.equal((await moduleRef.exports.POST(request({ codec }))).status, 400);
    assert.equal(calls.length, 0);
  });
  await test("invalid audio signature rejected", async () => {
    assert.equal((await moduleRef.exports.POST(request({ magic: false }))).status, 415); assert.equal(calls.length, 0);
  });
  await test("actual upload bytes bounded even without Content-Length", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(42 * 1024 * 1024)); controller.close(); } });
    const req = new Request("https://beatzucker.de/api/codec-preview", { method: "POST", duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body });
    assert.equal((await moduleRef.exports.POST(req)).status, 413); assert.equal(calls.length, 0);
  });
  await test("malformed multipart is a client error", async () => {
    const req = new Request("https://beatzucker.de/api/codec-preview", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body: "broken" });
    assert.equal((await moduleRef.exports.POST(req)).status, 400); assert.equal(calls.length, 0);
  });
  await test("missing, blank and non-finite measurements are omitted, never faked as zero", async () => {
    for (const values of [{}, { "X-Encoded-True-Peak": "", "X-Encoded-LUFS": "NaN" }, { "X-Encoded-True-Peak": "Infinity" }]) {
      headers = { "Content-Type": "audio/mp4", "X-Codec-Format": "aac256", ...values };
      const response = await moduleRef.exports.POST(request()); assert.equal(response.status, 200);
      assert.equal(response.headers.get("X-Encoded-True-Peak"), null); assert.equal(response.headers.get("X-Encoded-LUFS"), null);
    }
  });
  await test("worker overload has Retry-After and cleans original upload", async () => {
    workerStatus = 503;
    const response = await moduleRef.exports.POST(request()); assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "15"); assert.equal(removed.length, 1);
  });
  await test("worker validation and internal errors are not successful audio", async () => {
    workerStatus = 422; assert.equal((await moduleRef.exports.POST(request())).status, 422);
    workerStatus = 500; assert.equal((await moduleRef.exports.POST(request())).status, 502); assert.equal(removed.length, 2);
  });
  await test("mismatched codec or MIME rejects worker output", async () => {
    for (const value of [{ "Content-Type": "audio/mp4", "X-Codec-Format": "mp3320" }, { "Content-Type": "text/html", "X-Codec-Format": "aac256" }]) {
      headers = value; assert.equal((await moduleRef.exports.POST(request())).status, 503);
    }
    assert.equal(removed.length, 2);
  });
  await test("global rate limit rejects before audio parsing", async () => {
    allow = false; assert.equal((await moduleRef.exports.POST(request())).status, 429); assert.equal(calls.length, 0);
  });
  await test("at most two uploads per Node process; gate recovers after completion", async () => {
    let resolve; hold = { promise: new Promise(done => { resolve = done; }) };
    const first = moduleRef.exports.POST(request()), second = moduleRef.exports.POST(request());
    while (calls.length < 2) await new Promise(done => setImmediate(done));
    assert.equal((await moduleRef.exports.POST(request())).status, 503);
    resolve(); assert.equal((await first).status, 200); assert.equal((await second).status, 200);
    hold = undefined; assert.equal((await moduleRef.exports.POST(request())).status, 200); assert.equal(calls.length, 3);
  });
  console.log(`${passed} codec-preview API tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
