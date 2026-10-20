/* Read-only, dependency-mocked regression tests; no network, DB or real emails. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name),
    console, process, Buffer, URL, Blob, DataView, ArrayBuffer, Uint8Array, TextDecoder,
    AbortSignal, Date, setInterval, clearInterval,
  }, { filename: file });
  return module.exports;
}

let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
const jsonResponse = { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {} }) };

async function main() {
  const releases = load("lib/releases.ts");
  await test("version, package metadata and bilingual release history stay consistent", () => {
    const packageInfo = require("../package.json"), lock = require("../package-lock.json");
    assert.equal(releases.APP_VERSION, packageInfo.version);
    assert.equal(releases.APP_VERSION, lock.version);
    assert.equal(releases.APP_VERSION, lock.packages[""].version);
    assert.equal(new Set(releases.RELEASES.map(release => release.version)).size, releases.RELEASES.length);
    for (const release of releases.RELEASES) {
      assert.ok(release.title.de && release.title.en && release.summary.de && release.summary.en);
      assert.equal(release.improvements.de.length, release.improvements.en.length);
      assert.ok(Number.isFinite(new Date(release.date).getTime()));
    }
  });
  const audio = load("lib/clientAudio.ts");
  const buffer = {
    numberOfChannels: 1, length: 3, sampleRate: 96000,
    getChannelData: () => new Float32Array([1.5, -1.25, 0.5]),
  };
  await test("float WAV preserves samples above 0 dBFS", async () => {
    const bytes = await audio.encodeWav(buffer, "32f", false).arrayBuffer();
    const view = new DataView(bytes);
    assert.equal(view.getUint16(20, true), 3);
    assert.equal(view.getFloat32(44, true), 1.5);
    assert.equal(view.getFloat32(48, true), -1.25);
    const metadata = audio.inspectAudioMetadata(bytes);
    assert.equal(metadata.sampleRate, 96000);
    assert.equal(metadata.channels, 1);
    assert.equal(metadata.frames, 3);
  });
  await test("PCM WAV refuses overload instead of silently clipping", async () => {
    assert.throws(() => audio.encodeWav(buffer, "16", false), /OVERLOAD/);
    const safe = {...buffer,getChannelData:()=>new Float32Array([.5,-.5,0])};
    const view = new DataView(await audio.encodeWav(safe, "16", false).arrayBuffer());
    assert.equal(view.getInt16(44, true), 16384);
    assert.equal(view.getInt16(46, true), -16383);
  });
  await test("multichannel export is rejected instead of silently dropping channels", () => {
    assert.throws(() => audio.encodeWav({ ...buffer, numberOfChannels: 6 }), /mono and stereo/);
  });
  await test("FLAC native rate and frame count are decoded from STREAMINFO", () => {
    const bytes = new ArrayBuffer(42), data = new Uint8Array(bytes), view = new DataView(bytes);
    data.set(Buffer.from("fLaC")); data[4] = 128; data[7] = 34;
    data[18] = 48000 >> 12; data[19] = (48000 >> 4) & 255;
    data[20] = ((48000 & 15) << 4) | (1 << 1) | 1; data[21] = 0x70;
    view.setUint32(22, 144000, false);
    const metadata = audio.inspectAudioMetadata(bytes);
    assert.equal(metadata.sampleRate, 48000); assert.equal(metadata.channels, 2); assert.equal(metadata.frames, 144000);
  });

  const auth = load("lib/authRequest.ts", {
    "next/server": { NextResponse: jsonResponse }, "@/lib/rateLimit": { rateLimit: () => true },
  });
  const request = text => new Request("https://beatzucker.de/api/auth", { method: "POST", body: text });
  await test("auth parses bounded JSON without Content-Length", async () => {
    assert.equal((await auth.readAuthRequest(request('{"action":"register"}'))).action, "register");
  });
  await test("auth rejects actual oversized bodies and invalid JSON", async () => {
    await assert.rejects(auth.readAuthRequest(request("x".repeat(8193))), error => error.status === 413);
    await assert.rejects(auth.readAuthRequest(request("[]")), error => error.status === 400);
    await assert.rejects(auth.readAuthRequest(request("{")), error => error.status === 400);
  });
  await test("auth rejects foreign Origin", async () => {
    await assert.rejects(auth.readAuthRequest(new Request("https://beatzucker.de/api/auth", {
      method: "POST", body: "{}", headers: { origin: "https://example.invalid" },
    })), error => error.status === 403);
  });

  let emailResult = { data: { id: "test-id" }, error: null }, lastMail;
  const email = load("lib/email.ts", {
    resend: { Resend: class { emails = { send: async input => { lastMail = input; return emailResult; } }; } },
    "@/lib/constants": { DOWNLOAD_WINDOW_MS: 86400000, DONATE_URL: "https://example.invalid/support" },
  });
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only-not-a-real-key";
  try {
    await test("confirmation sender uses noreplay@beatzucker.de", async () => {
      await email.sendWelcomeEmail("test@example.invalid"); assert.equal(lastMail.from, "noreplay@beatzucker.de");
      assert.ok(lastMail.html.includes("Hilf mit, Beatzucker kostenlos zu halten"));
      assert.ok(lastMail.html.includes("/in-eigener-sache"));
    });
    await test("Resend error object fails instead of reporting success", async () => {
      emailResult = { data: null, error: { message: "Rejected test message" } };
      await assert.rejects(email.sendLoginOtpEmail("test@example.invalid", "123456"), /Rejected test message/);
    });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
  }

  const now = Date.now(), hour = 3600000;
  const withdrawalStore = new Map();
  let createCount = 0;
  const withdrawalRoute = load("app/api/withdrawal/route.ts", {
    "next/server": { NextResponse: jsonResponse },
    "@/lib/authRequest": { readAuthRequest: req => req.json(), AuthRequestError: class extends Error {} },
    "@/lib/rateLimit": { rateLimit: () => true },
    "@/lib/withdrawalQueue": { deliverWithdrawal: async () => { throw new Error("offline test"); } },
    "@/lib/withdrawalProtection": { checkWithdrawalChallenge:()=>"ok",withdrawalClientKey:()=>null },
    "@/lib/db": { db: { $transaction: async fn=>fn({withdrawalReceipt:{count:async()=>0,create:async ({data})=>{createCount++;withdrawalStore.set(data.submissionKey,data);return data}}}), withdrawalReceipt: {
      findUnique: async ({ where }) => withdrawalStore.get(where.submissionKey),
      create: async ({ data }) => { createCount++; withdrawalStore.set(data.submissionKey, data); return data; },
    } } },
  });
  const formDetails = { name: "Test Musician", email: "test@example.invalid", contractReference: "test-only", lang: "en", idempotencyKey: "00000000-0000-4000-8000-000000000001" };
  const submitWithdrawal = data => withdrawalRoute.POST(new Request("https://beatzucker.de/api/withdrawal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
  await test("withdrawal stays received during mail outage and retry is idempotent", async () => {
    const first = await submitWithdrawal(formDetails), retry = await submitWithdrawal(formDetails);
    assert.equal(first.status, 202); assert.equal(first.body.mailStatus, "pending");
    assert.equal(first.body.receiptId, retry.body.receiptId); assert.equal(createCount, 1);
    assert.equal((await submitWithdrawal({ ...formDetails, name: "Different Name" })).status, 409);
    assert.equal((await submitWithdrawal({ ...formDetails, email: "not an email" })).status, 400);
  });
  const queued = { id: "test-receipt", name: "Test", email: "test@example.invalid", contractReference: "", lang: "en", receivedAt: new Date(), userEmailSentAt: null, adminEmailSentAt: null, attempts: 0 };
  const sendAttempts = { user: 0, admin: 0 };
  const queue = load("lib/withdrawalQueue.ts", {
    "@/lib/db": { db: { withdrawalReceipt: {
      updateMany: async () => { queued.attempts++; return { count: 1 }; },
      findUniqueOrThrow: async () => ({ ...queued }),
      update: async ({ data }) => { Object.assign(queued, data); },
    } } },
    "@/lib/email": { sendWithdrawalEmails: async (_, delivery) => {
      if (!delivery.userSent) { sendAttempts.user++; await delivery.onSent("user"); }
      if (!delivery.adminSent) { sendAttempts.admin++; if (sendAttempts.admin === 1) throw new Error("test outage"); await delivery.onSent("admin"); }
    } },
  });
  await test("mail queue retries only the recipient that failed", async () => {
    await queue.deliverWithdrawal(queued.id); assert.ok(queued.userEmailSentAt); assert.equal(queued.adminEmailSentAt, null);
    assert.equal(queued.lockedUntil, null); assert.ok(queued.nextAttemptAt > new Date());
    await queue.deliverWithdrawal(queued.id); assert.ok(queued.adminEmailSentAt);
    assert.deepEqual(sendAttempts, { user: 1, admin: 2 });
  });
  const records = [
    { id: "valid", fileId: "original-valid", status: "done", completedAt: new Date(now - 23 * hour), createdAt: new Date(now - 26 * hour) },
    { id: "expired", fileId: "original-expired", status: "done", completedAt: new Date(now - 25 * hour), createdAt: new Date(now - 26 * hour) },
    { id: "processing", fileId: "original-processing", status: "processing", createdAt: new Date(now - hour) },
    { id: "worker", fileId: "original-worker", status: "error", createdAt: new Date(now - hour) },
  ];
  const deleted = [];
  const storage = load("lib/storage.ts", {
    fs: { existsSync: () => true },
    "fs/promises": {
      readdir: async directory => (directory.endsWith("masters")
        ? ["valid_wav24.wav", "expired_wav24.wav", "processing_wav24.wav", "worker_wav24.wav", "orphan_wav24.wav"]
        : ["original-processing.wav", "original-worker.wav", "abandoned.wav"]
      ).map(name => ({ name, isFile: () => true })),
      stat: async () => ({ mtimeMs: now - 26 * hour }), unlink: async file => deleted.push(path.basename(file)),
    },
    "@/lib/db": { db: { master: { findMany: async () => records } } },
    "@/lib/constants": { DOWNLOAD_WINDOW_MS: 24 * hour },
    "@/lib/dspJobs": { activeDspMasterIds: async () => new Set(["worker"]) },
  });
  await test("cleanup uses completedAt and protects DB/worker-active audio", async () => {
    await storage.cleanupOldFiles();
    assert.deepEqual(deleted.sort(), ["abandoned.wav", "expired_wav24.wav", "orphan_wav24.wav"]);
  });
  let removed = [];
  const recovery = load("lib/masterRecovery.ts", {
    "@/lib/db": { db: { master: {
      findMany: async () => [{ id: "active" }, { id: "interrupted" }, { id: "finished-concurrently" }],
      updateMany: async ({ where }) => ({ count: where.id === "interrupted" ? 1 : 0 }),
    } } },
    "@/lib/storage": { removeMasterFiles: async id => removed.push(id) },
    "@/lib/dspJobs": { activeDspMasterIds: async () => new Set(["active"]) },
  });
  await test("recovery skips active worker and concurrently completed record", async () => {
    assert.equal(await recovery.recoverInterruptedMasters(), 1); assert.deepEqual(removed, ["interrupted"]);
  });
  console.log(`${passed} audit regression tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
