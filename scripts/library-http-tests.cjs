/* Real authenticated deletion against the named, isolated local Tools QA only. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
if (process.env.BEATZUCKER_ISOLATED_QA !== '1') throw Error('Requires isolated QA flag');
const database = path.resolve(__dirname, '../validation-output/tools-audit-20261011/runtime/qa.sqlite');
if (!fs.existsSync(database) || fs.realpathSync(database) !== database) throw Error('Expected the existing, non-symlink isolated QA database');
const db = new PrismaClient({ datasources: { db: { url: 'file:' + database.replaceAll('\\', '/') } } });
const base = 'http://127.0.0.1:3013', jar = new Map();
async function request(url, options = {}) {
  const response = await fetch(base + url, { ...options, headers: { Origin: base, Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers }, signal: AbortSignal.timeout(20000) });
  for (const cookie of response.headers.getSetCookie()) { const [k, ...parts] = cookie.split(';')[0].split('='); jar.set(k, parts.join('=')); }
  return response;
}
(async () => {
  const email = 'library-qa@example.invalid';
  const user = await db.user.upsert({ where: { email }, update: {}, create: { email, name: 'Isolated library QA', password: '$2b$10$ezIvHh.CDhleKWoh2BKAFu58HKI9dUW27R3Pz2NZ.KQwNv7fRdFhm' } });
  const other = await db.user.create({ data: { email: `other-${crypto.randomUUID()}@example.invalid`, name: 'Ownership fixture' } });
  async function master(owner, name, status = 'done') { return db.master.create({ data: { userId: owner.id, fileId: crypto.randomUUID(), originalName: name, platform: 'spotify', preset: 'auto', status, completedAt: status === 'done' ? new Date() : null } }); }
  const one = await master(user, 'Delete fixture one.wav'), two = await master(user, 'Delete fixture two.wav'), foreign = await master(other, 'Foreign fixture.wav');
  assert.equal((await request(`/api/master/${one.id}`, { method: 'DELETE' })).status, 401);
  const csrf = await (await request('/api/auth/csrf')).json();
  const login = await request('/api/auth/callback/credentials', { method: 'POST', body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: 'Local-Audit-Only-2026!', json: 'true', callbackUrl: base + '/dashboard/library' }) });
  assert.ok(!(await login.json()).url.includes('error'));
  assert.equal((await request(`/api/master/${foreign.id}`, { method: 'DELETE' })).status, 404);
  for (const item of [one, two]) { const response = await request(`/api/master/${item.id}`, { method: 'DELETE' }); assert.equal(response.status, 200); assert.equal((await response.json()).ok, true); assert.equal(await db.master.findUnique({ where: { id: item.id } }), null); }
  assert.ok(await db.master.findUnique({ where: { id: foreign.id } }));
  await master(user, 'Library QA — first mix.wav'); await master(user, 'Library QA — second mix.wav'); await master(user, 'Library QA — still processing.wav', 'processing');
  const account = await (await request('/api/account')).json(); assert.equal(account.user.email, email);
  assert.ok(account.masters.some(m => m.status === 'processing'));
  assert.ok(!account.masters.some(m => m.id === foreign.id));
  console.log('PASS real unauthenticated deletion denied; foreign ownership denied; two own rows deleted and foreign row preserved.');
  console.log('Library browser fixtures ready in isolated QA only; no audio or mail sent.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
