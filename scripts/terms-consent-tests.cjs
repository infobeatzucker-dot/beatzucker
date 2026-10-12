const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
function load(file, mocks) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, require: key => { if (!(key in mocks)) throw Error(key); return mocks[key]; },
    Buffer, Date, Number, Error, console, process: { env: { NEXTAUTH_SECRET: "test-only-long-signing-secret-not-production" } } });
  return module.exports;
}
const terms = load("lib/terms.ts", {});
let cookie, account, stored, hashed = 0;
const proof = load("lib/termsConsent.ts", { crypto: require("node:crypto"), "@/lib/terms": terms,
  "next/headers": { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) } });
const db = { user: { findUnique: async () => null, create: async ({ data }) => { stored = data; return { id: "test", ...data }; } },
  account: { findUnique: async () => account } };
const options = load("lib/authOptions.ts", {
  "next-auth/providers/google": { default: value => value }, "next-auth/providers/credentials": { default: value => value },
  "@auth/prisma-adapter": { PrismaAdapter: () => ({}) }, "@/lib/db": { db }, "@/lib/auth": {},
  "@/lib/email": {}, "@/lib/rateLimit": {}, "@/lib/termsConsent": proof,
}).authOptions;
const route = load("app/api/auth/route.ts", {
  "next/server": { NextResponse: { json: (body, options = {}) => ({ status: options.status ?? 200, body }) } },
  crypto: require("node:crypto"), "@/lib/db": { db }, "@/lib/auth": { hashPassword: async () => { hashed++; return "hash"; } },
  "@/lib/email": { sendWelcomeEmail: async () => {} }, "@/lib/authRequest": { readAuthRequest: async req => req.body, authRequestFailure: () => null },
  "@/lib/rateLimit": { rateLimit: () => true }, "@/lib/terms": terms,
});
let passed = 0;
async function test(name, run) { cookie = undefined; account = null; stored = undefined; hashed = 0; await run(); passed++; console.log(`PASS ${name}`); }
async function main() {
  await test("signed consent preserves version, server timestamp and language", () => {
    const now = Date.now();
    for (const lang of ["de", "en"]) {
      const result = proof.verifyTermsConsent(proof.signTermsConsent(lang, now), now);
      assert.equal(result.lang, lang); assert.equal(result.acceptedAt, now); assert.equal(result.version, terms.TERMS_VERSION);
    }
  });
  await test("missing, tampered, oversized, expired and future proof denied", () => {
    const now = Date.now(), token = proof.signTermsConsent("en", now);
    for (const value of [undefined, "bad", "x".repeat(1025), `${token}x`, `${token}.extra`]) assert.equal(proof.verifyTermsConsent(value, now), null);
    assert.equal(proof.verifyTermsConsent(token, now + 1800001), null);
    assert.equal(proof.verifyTermsConsent(token, now - 1), null);
  });
  await test("new Google account requires signed consent, existing login remains possible", async () => {
    const google = { provider: "google", providerAccountId: "test-google" };
    assert.equal(await options.callbacks.signIn({ account: google }), false);
    cookie = proof.signTermsConsent("en"); assert.equal(await options.callbacks.signIn({ account: google }), true);
    cookie = undefined; account = { userId: "existing" }; assert.equal(await options.callbacks.signIn({ account: google }), true);
    assert.equal(await options.callbacks.signIn({ account: { provider: "credentials" } }), true);
  });
  await test("adapter rejects direct account creation without consent", async () => {
    await assert.rejects(options.adapter.createUser({ email: "test@example.invalid" })); assert.equal(stored, undefined);
  });
  await test("Google user and consent saved in same creation, no fabricated historic proof", async () => {
    cookie = proof.signTermsConsent("en"); await options.adapter.createUser({ email: "test@example.invalid" });
    assert.equal(stored.termsVersion, terms.TERMS_VERSION); assert.equal(stored.termsLanguage, "en"); assert.ok(stored.termsAcceptedAt instanceof Date);
    assert.equal(stored.registrationNotification.create.provider, "google");
  });
  await test("password registration rejects absent, false, stale and string acceptance before hashing", async () => {
    for (const accepted of [undefined, false, "true", true]) {
      const response = await route.POST({ headers: new Headers(), body: { action: "register", email: "test@example.invalid", password: "Valid1234", termsAccepted: accepted, termsVersion: "old", lang: "en" } });
      assert.equal(response.status, 400); assert.match(response.body.error, /Terms/);
    }
    assert.equal(hashed, 0); assert.equal(stored, undefined);
  });
  await test("password registration stores explicit current acceptance and language", async () => {
    const response = await route.POST({ headers: new Headers(), body: { action: "register", email: "test@example.invalid", password: "Valid1234", termsAccepted: true, termsVersion: terms.TERMS_VERSION, lang: "en" } });
    assert.equal(response.status, 200); assert.equal(stored.termsVersion, terms.TERMS_VERSION); assert.equal(stored.termsLanguage, "en"); assert.equal(hashed, 1);
    assert.equal(stored.registrationNotification.create.provider, "credentials");
  });
  console.log(`${passed} consent tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
