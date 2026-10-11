// Creates only an isolated temporary SQLite DB, never the project's real DB.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const root = path.resolve(__dirname, "../validation-output");
  fs.mkdirSync(root, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, "withdrawal-db-test-"));
  assert.equal(path.dirname(directory), root);
  // Prisma's Windows SQLite schema engine handles schema-relative URLs reliably.
  const url = `file:../validation-output/${path.basename(directory)}/test.db`;
  fs.closeSync(fs.openSync(path.join(directory, "test.db"), "wx"));
  let db;
  try {
    execFileSync(process.execPath, [path.resolve(__dirname, "../node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"], {
      cwd: path.resolve(__dirname, ".."), env: { ...process.env, DATABASE_URL: url }, stdio: "pipe",
    });
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.withdrawalReceipt.create({ data: {
      id: "BZ-TEST", submissionKey: "test-key", requestHash: "test-hash", name: "Test only",
      email: "test@example.invalid", contractReference: "", lang: "en", retainUntil: new Date("2029-10-11T12:00:00Z"),
    } });
    await assert.rejects(db.withdrawalReceipt.create({ data: {
      id: "BZ-SECOND", submissionKey: "test-key", requestHash: "test-hash", name: "Test only",
      email: "test@example.invalid", contractReference: "", lang: "en", retainUntil: new Date("2029-10-11T12:00:00Z"),
    } }), error => error.code === "P2002");
    console.log("PASS SQLite unique submission key prevents duplicate receipts");
    const now = new Date(), lock = new Date(now.getTime() + 300000);
    const claims = await Promise.all([1, 2, 3].map(() => db.withdrawalReceipt.updateMany({
      where: { id: "BZ-TEST", OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      data: { lockedUntil: lock, attempts: { increment: 1 } },
    })));
    assert.equal(claims.reduce((total, claim) => total + claim.count, 0), 1);
    console.log("PASS Concurrent SQLite queue claims reserve exactly one sender");
    await db.$disconnect();
    db = new PrismaClient({ datasources: { db: { url } } });
    const receipt = await db.withdrawalReceipt.findUniqueOrThrow({ where: { id: "BZ-TEST" } });
    assert.equal(receipt.attempts, 1); assert.equal(receipt.requestHash, "test-hash");
    console.log("PASS Receipt survives database client restart");
    await db.withdrawalReceipt.update({ where: { id: "BZ-TEST" }, data: { retainUntil: new Date(0), legalHold: true } });
    assert.equal((await db.withdrawalReceipt.deleteMany({ where: { legalHold: false, retainUntil: { lt: new Date() } } })).count, 0);
    console.log("PASS Retention cleanup preserves evidence under legal hold");
  } finally {
    if (db) await db.$disconnect();
    // Only this test-created folder, validated against the intended workspace.
    if (path.dirname(directory) === root && path.basename(directory).startsWith("withdrawal-db-test-")) fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
