const assert = require('node:assert/strict');
const fs = require('node:fs');
const { checkSchema } = require('../deploy/rollback-tools/check-schema.cjs');
const models = [{ name: 'User', fields: [{ name: 'id', kind: 'scalar' }, { name: 'email', kind: 'scalar' }] }];
function client(columns, fail = false) {
  const calls = [];
  return { calls, user: { async findFirst() { calls.push('read'); if (fail) throw Error('missing old column'); } },
    async $queryRawUnsafe(query) { calls.push(query); return columns; } };
}
async function main() {
  const additive = client([{ name: 'termsVersion', notnull: 0, dflt_value: null }]);
  await checkSchema(additive, models, () => {});
  assert.equal(additive.calls.length, 2);
  console.log('PASS rollback accepts nullable additions without writing data');
  await checkSchema(client([{ name: 'newQuota', notnull: 1, dflt_value: '0' }]), models, () => {});
  console.log('PASS rollback accepts extra mandatory columns with SQL defaults');
  await assert.rejects(checkSchema(client([{ name: 'requiredConsent', notnull: 1, dflt_value: null }]), models, () => {}), /Incompatible required column/);
  console.log('PASS rollback rejects extra mandatory columns without defaults');
  await assert.rejects(checkSchema(client([], true), models, () => {}), /missing old column/);
  console.log('PASS rollback rejects unreadable old schema');
  const mapped = [{ name: 'User', dbName: 'app"User', fields: [{ name: 'email', dbName: 'mail', kind: 'scalar' }] }];
  const mapping = client([{ name: 'mail', notnull: 1, dflt_value: null }]);
  await checkSchema(mapping, mapped, () => {});
  assert.equal(mapping.calls[1], 'PRAGMA table_info("app""User")');
  console.log('PASS mapped table and column names are handled safely');
  const shell = fs.readFileSync('deploy/rollback-tools/start.sh', 'utf8');
  const deploy = fs.readFileSync('deploy/deploy.sh', 'utf8');
  assert.ok(shell.indexOf('node /app/rollback-tools/check-schema.cjs') < shell.indexOf('exec /usr/bin/supervisord'));
  assert.ok(!shell.includes('accept-data-loss'));
  assert.match(deploy, /target=\/app\/rollback-tools,readonly/);
  assert.match(deploy, /"\$ROLLBACK_TAG" \/app\/rollback-tools\/start.sh/);
  console.log('PASS deploy rollback uses checked entrypoint instead of schema downgrade');
  console.log('6 rollback regression tests passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
