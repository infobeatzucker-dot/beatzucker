/* Isolated public API tests. Mock files/worker; no real uploads or network. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { PassThrough } = require("node:stream");
function load(file, mocks, extras = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!(name in mocks)) throw Error(`Unmocked dependency: ${name}`);
    return mocks[name];
  }, console: { error() {} }, process: { env: { NEXTAUTH_URL: "https://beatzucker.de", TEMP_UPLOAD_DIR: "/mock/uploads" } },
  globalThis: {}, Number, URL, Blob, File, Response, Buffer, Uint8Array, AbortSignal, Error, setTimeout, clearTimeout, ...extras }, { filename: file });
  return module.exports;
}
const result = { before: { integrated_lufs: -22, true_peak: -9 }, after: { integrated_lufs: -14, true_peak: -1.01 },
  gain_db: 8, target_lufs: -14, peak_limited: false, start: 0, end: 2, duration: 2, sample_rate: 48000, channels: 2 };
const parser = load("lib/types/normalization.ts", {});
const bounded = load("lib/boundedMultipart.ts", { "next/server": { NextResponse: require("next/server").NextResponse } });
let fetchCount, removed, status = 200, allow = true;
const route = load("app/api/silence-normalize/route.ts", {
  crypto: { randomUUID: () => "test-only-id" },
  "fs/promises": { mkdir: async () => {}, unlink: async candidate => removed.push(candidate) },
  fs: { createWriteStream: () => { const stream = new PassThrough(); stream.resume(); return stream; } },
  path: require("node:path"), stream: require("node:stream"), "stream/promises": require("node:stream/promises"),
  "next/server": { NextResponse: require("next/server").NextResponse },
  "@/lib/rateLimit": { rateLimit: () => allow }, "@/lib/pythonService": { pythonServiceHeaders: () => ({}) },
  "@/lib/types/normalization": parser,
  "@/lib/boundedMultipart": bounded,
}, { fetch: async (_, options) => {
  fetchCount++; const request = JSON.parse(options.body);
  assert.equal(request.start, 0); assert.equal(request.end, 2); assert.equal(request.target, -14);
  if (status !== 200) return Response.json({ detail: "Select at least 0.4 seconds for integrated loudness measurement." }, { status });
  return new Response(new Uint8Array(64), { headers: { "Content-Type": "audio/wav", "X-Normalization-Stats": JSON.stringify(result) } });
} });
function request({ target = "-14", origin = "https://beatzucker.de", magic = true, lang = "en" } = {}) {
  const bytes = new Uint8Array(44);
  if (magic) { bytes.set(Buffer.from("RIFF")); bytes.set(Buffer.from("WAVE"), 8); }
  const form = new FormData(); form.append("file", new File([bytes], "track.wav", { type: "audio/wav" }));
  form.append("start", "0"); form.append("end", "2"); form.append("target", target);
  form.append("lang", lang);
  return new Request("https://beatzucker.de/api/silence-normalize", { method: "POST", headers: { Origin: origin }, body: form });
}
let passed = 0;
async function test(name, run) { fetchCount = 0; removed = []; status = 200; allow = true; await run(); passed++; console.log(`PASS ${name}`); }
async function main() {
  await test("only valid finite measured WAV stats are accepted", () => {
    assert.equal(parser.parseNormalizationResult(JSON.stringify(result)).after.integrated_lufs, -14);
    for (const value of [null, JSON.stringify({ ...result, gain_db: null }), JSON.stringify({ ...result, after: { integrated_lufs: -14, true_peak: 0 } })])
      assert.throws(() => parser.parseNormalizationResult(value));
  });
  await test("valid render forwards cuts and returns measured stats with private WAV", async () => {
    const response = await route.POST(request());
    assert.equal(response.status, 200); assert.equal(response.headers.get("Content-Type"), "audio/wav");
    assert.equal(JSON.parse(response.headers.get("X-Normalization-Stats")).gain_db, 8);
    assert.equal(fetchCount, 1); assert.equal(removed.length, 1);
  });
  await test("foreign origin rejected without worker or files", async () => {
    assert.equal((await route.POST(request({ origin: "https://foreign.example" }))).status, 403);
    assert.equal(fetchCount, 0); assert.equal(removed.length, 0);
  });
  await test("malformed numeric target and unsupported audio rejected", async () => {
    assert.equal((await route.POST(request({ target: "NaN" }))).status, 400);
    assert.equal((await route.POST(request({ magic: false }))).status, 415);
    assert.equal(fetchCount, 0);
  });
  await test("actual multipart body is bounded without Content-Length", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(42 * 1024 * 1024)); controller.close(); } });
    const req = new Request("https://beatzucker.de/api/silence-normalize", { method: "POST", duplex: "half", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body });
    assert.equal((await route.POST(req)).status, 413); assert.equal(fetchCount, 0);
  });
  await test("worker validation failure cleans upload and allows subsequent request", async () => {
    status = 422;
    assert.equal((await route.POST(request())).status, 422); assert.equal(removed.length, 1);
    status = 200;
    assert.equal((await route.POST(request())).status, 200);
  });
  await test("worker overload is not reported as successful normalization", async () => {
    status = 503;
    assert.equal((await route.POST(request())).status, 503);
  });
  await test("public ceiling rejects before reading audio", async () => {
    allow = false;
    assert.equal((await route.POST(request())).status, 429); assert.equal(fetchCount, 0);
  });
  await test("invalid multipart is a client error, not a service outage", async () => {
    const req = new Request("https://beatzucker.de/api/silence-normalize", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body: "broken body" });
    assert.equal((await route.POST(req)).status, 400); assert.equal(fetchCount, 0);
  });
  await test("German section validation is localized", async () => {
    status = 422;
    const response = await route.POST(request({ lang: "de" }));
    assert.match((await response.json()).error, /0,4 Sekunden/);
  });
  console.log(`${passed} silence-normalizer API tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
