/* Isolated account-security regressions: no real accounts, network or emails. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!(name in mocks)) throw Error(`Unmocked dependency ${name}`);
    return mocks[name];
  }, Date, console, Set, process: { env: {} } }, { filename: file });
  return module.exports;
}
class RequestError extends Error { constructor(message, status) { super(message); this.status = status; } }
let allowed = true, user, session, active, events, failUpdate, failWorkers;
const tx = { user: {
  findUnique: async () => user,
  updateMany: async ({ where, data }) => {
    if (user.loginOtp !== where.loginOtp || !user.loginOtpExpires || user.loginOtpExpires <= where.loginOtpExpires.gt) return { count: 0 };
    Object.assign(user, data); return { count: 1 };
  },
  update: async ({ data }) => { if (failUpdate) throw new RequestError("simulated DB failure", 409); Object.assign(user, data); },
  delete: async () => { events.push("delete-user"); },
}, master: { deleteMany: async () => { events.push("delete-masters"); } } };
const security = load("lib/accountSecurity.ts", {
  "@/lib/auth": { verifyPassword: async (password, hash) => password === "Correct123" && hash === "hash" },
  "@/lib/authRequest": { AuthRequestError: RequestError },
  "@/lib/rateLimit": { rateLimit: () => allowed },
});
const route = load("app/api/account/route.ts", {
  "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
  "next-auth": { getServerSession: async () => session },
  "@/lib/authOptions": { authOptions: {} },
  "@/lib/accountSecurity": security,
  "@/lib/authRequest": {
    AuthRequestError: RequestError, readAuthRequest: async req => req.body,
    authRequestFailure: error => error instanceof RequestError ? { status: error.status, body: { error: error.message } } : null,
  },
  "@/lib/auth": { hashPassword: async () => "newHash" },
  "@/lib/constants": {},
  "@/lib/masterQuota": { dailyMasterLimit: value => value ?? 10, startOfMasteringDay: () => new Date(), usedDailyMasters: async () => 0 },
  "@/lib/dspJobs": { activeDspMasterIds: async () => { if (failWorkers) throw Error("unavailable"); return active; } },
  "@/lib/storage": { removeMasterFiles: async () => events.push("remove-master-file"), removeUploadFiles: async () => events.push("remove-upload") },
  "@/lib/db": { db: { $transaction: async callback => {
    const previous = { ...user };
    try { const result = await callback(tx); events.push("commit"); return result; }
    catch (error) { user = previous; events.push("rollback"); throw error; }
  } } },
});
function reset() {
  allowed = true; failUpdate = false; failWorkers = false; active = new Set(); events = [];
  user = { id: "u1", password: "hash", passwordChangedAt: null, twoFactorEnabled: false,
    loginOtp: "123456", loginOtpExpires: new Date(Date.now() + 60_000), masters: [{ id: "m1", fileId: "f1", status: "done" }] };
  session = { user: { id: "u1" }, passwordVersion: 0, authProvider: "credentials", authenticatedAt: Date.now() };
}
let passed = 0;
async function test(name, run) { reset(); await run(); passed++; console.log(`PASS ${name}`); }
async function main() {
  let fileError = "EACCES";
  const storage = load("lib/storage.ts", {
    fs: { existsSync: () => true },
    "fs/promises": { unlink: async () => { throw Object.assign(new Error("simulated"), { code: fileError }); } },
    path: { default: require("node:path") },
    "@/lib/constants": {}, "@/lib/db": {}, "@/lib/dspJobs": {},
  });
  await test("strict erasure reports filesystem errors; ordinary cleanup unchanged", async () => {
    await assert.rejects(() => storage.cleanupFile("mock.wav", true));
    await storage.cleanupFile("mock.wav");
  });
  await test("already erased files are not counted as cleanup failure", async () => {
    fileError = "ENOENT";
    await storage.cleanupFile("mock.wav", true);
  });
  const authOptions = load("lib/authOptions.ts", {
    "@/lib/termsConsent": { registrationTermsProof: async () => null },
    "next-auth/providers/google": { default: config => config },
    "next-auth/providers/credentials": { default: config => config },
    "@auth/prisma-adapter": { PrismaAdapter: () => ({}) },
    "@/lib/db": { db: { user: { findUnique: async () => user } } },
    "@/lib/auth": {}, "@/lib/email": {}, "@/lib/rateLimit": {},
  }).authOptions;
  await test("password reset during login cannot grant a fresh session", async () => {
    user.passwordChangedAt = new Date(Date.now() - 1000);
    const token = await authOptions.callbacks.jwt({ token: {}, user: { id: "u1", passwordVersion: 0 }, account: { provider: "credentials" } });
    assert.equal(token.id, undefined);
  });
  await test("provider authentication time cannot be refreshed by session update", async () => {
    const token = { id: "u1", pwChangedAt: 0, authenticatedAt: 123, authProvider: "google", lastPwCheck: Date.now() };
    const result = await authOptions.callbacks.jwt({ token, trigger: "update", session: { authenticatedAt: Date.now() } });
    assert.equal(result.authenticatedAt, 123);
  });
  await test("unauthenticated mutations are rejected before processing", async () => {
    session = null;
    assert.equal((await route.PATCH({ body: { twoFactor: true } })).status, 401);
    assert.equal((await route.DELETE({ body: {} })).status, 401);
    assert.equal(events.length, 0);
  });
  await test("foreign identity and immediately revoked session rejected", () => {
    assert.throws(() => security.assertCurrentSession({ ...session, user: { id: "other" } }, user));
    user.passwordChangedAt = new Date();
    assert.throws(() => security.assertCurrentSession(session, user));
  });
  await test("2FA activation requires current password", async () => {
    assert.equal((await route.PATCH({ body: { twoFactor: true } })).status, 400);
    assert.equal(user.twoFactorEnabled, false);
    assert.equal((await route.PATCH({ body: { twoFactor: true, currentPassword: "Correct123" } })).status, 200);
  });
  await test("2FA cannot be disabled without valid second factor", async () => {
    user.twoFactorEnabled = true;
    for (const otp of [undefined, "xxxxxx", "000000"]) {
      assert.equal((await route.PATCH({ body: { twoFactor: false, currentPassword: "Correct123", otp } })).status, 400);
      assert.equal(user.twoFactorEnabled, true);
    }
  });
  await test("expired email code rejected", async () => {
    user.twoFactorEnabled = true; user.loginOtpExpires = new Date(0);
    assert.equal((await route.DELETE({ body: { currentPassword: "Correct123", otp: "123456" } })).status, 400);
    assert.equal(events.includes("remove-master-file"), false);
  });
  await test("email code can only be consumed once", async () => {
    user.twoFactorEnabled = true;
    await security.confirmAccountAction(tx, session, user, { currentPassword: "Correct123", otp: "123456" });
    await assert.rejects(() => security.confirmAccountAction(tx, session, user, { currentPassword: "Correct123", otp: "123456" }));
  });
  await test("failed mutation rolls back consumed code", async () => {
    user.twoFactorEnabled = true; failUpdate = true;
    assert.equal((await route.PATCH({ body: { twoFactor: false, currentPassword: "Correct123", otp: "123456" } })).status, 409);
    assert.equal(user.loginOtp, "123456"); assert.equal(user.twoFactorEnabled, true);
  });
  await test("password change needs second factor and clears outstanding reset link", async () => {
    user.twoFactorEnabled = true;
    assert.equal((await route.PATCH({ body: { newPassword: "NewPass123", currentPassword: "Correct123" } })).status, 400);
    const result = await route.PATCH({ body: { newPassword: "NewPass123", currentPassword: "Correct123", otp: "123456" } });
    assert.equal(result.status, 200); assert.equal(result.body.signInAgain, true);
    assert.equal(user.passwordResetToken, null); assert.equal(user.loginOtp, null);
  });
  await test("incorrectly typed password or 2FA settings rejected", async () => {
    assert.equal((await route.PATCH({ body: { newPassword: { length: 10 } } })).status, 400);
    assert.equal((await route.PATCH({ body: { twoFactor: "false" } })).status, 400);
  });
  await test("Google-only deletion requires recent provider authentication", async () => {
    user.password = null;
    assert.equal((await route.DELETE({ body: {} })).status, 401);
    session.authProvider = "google"; session.authenticatedAt = Date.now() - 6 * 60_000;
    assert.equal((await route.DELETE({ body: {} })).status, 401);
    session.authenticatedAt = Date.now();
    assert.equal((await route.DELETE({ body: {} })).status, 200);
  });
  await test("active database or DSP jobs block erasure without consuming code", async () => {
    user.twoFactorEnabled = true;
    for (const dbStatus of ["processing", "pending", "done"]) {
      user.masters[0].status = dbStatus;
      active = new Set(dbStatus === "done" ? ["m1"] : []);
      assert.equal((await route.DELETE({ body: { currentPassword: "Correct123", otp: "123456" } })).status, 409);
      assert.equal(user.loginOtp, "123456");
      assert.equal(events.includes("remove-master-file"), false);
    }
  });
  await test("unknown worker state fails closed", async () => {
    failWorkers = true;
    assert.equal((await route.DELETE({ body: { currentPassword: "Correct123" } })).status, 503);
    assert.equal(events.length, 0);
  });
  await test("audio deletion starts only after database commit", async () => {
    assert.equal((await route.DELETE({ body: { currentPassword: "Correct123" } })).status, 200);
    assert.ok(events.indexOf("commit") < events.indexOf("remove-master-file"));
  });
  await test("confirmation attempts are throttled", async () => {
    allowed = false;
    assert.equal((await route.PATCH({ body: { twoFactor: true, currentPassword: "Correct123" } })).status, 429);
  });
  console.log(`${passed} account-security tests passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
