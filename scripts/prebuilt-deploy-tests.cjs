const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const bash = process.env.BASH_BINARY || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const folder = fs.mkdtempSync(path.join(root, 'validation-output', 'deploy-mock-'));
const unix = p => p.replaceAll('\\', '/');
fs.mkdirSync(path.join(folder, 'deploy', 'rollback-tools'), { recursive: true });
for (const file of ['check-schema.cjs', 'start.sh']) fs.writeFileSync(path.join(folder, 'deploy', 'rollback-tools', file), '# mock only\n');
fs.copyFileSync(path.join(root, 'deploy/prebuilt-image.sh'), path.join(folder, 'deploy/prebuilt-image.sh'));
fs.writeFileSync(path.join(folder, 'deploy.sh'), fs.readFileSync(path.join(root, 'deploy/deploy.sh'), 'utf8').replace('APP_DIR="/opt/beatzucker"', `APP_DIR="${unix(folder)}"`));
const imageID = 'sha256:' + 'a'.repeat(64);
const mocks = `
git() {
  case "$1" in
    status|fetch|merge) return 0 ;;
    branch) echo main ;;
    rev-parse) if [ "$2" = --short ]; then echo 420abeb; else [ "\${BAD_REVISION:-0}" != 1 ]; fi ;;
    merge-base) [ "\${BAD_ANCESTOR:-0}" != 1 ] ;;
    diff) printf '%s' "\${CHANGED:-}" ;;
    *) return 1 ;;
  esac
}
sudo() {
  printf '%s\\n' "$*" >> "$MOCK_LOG"
  if [ "$*" = "docker image inspect --format {{.Id}} beatzucker:release-420abeb" ]; then echo '${imageID}'; return 0; fi
  case "$*" in
    *self_test.py*) [ "\${FAIL_DSP:-0}" != 1 ] ;;
    "docker images "*) return 0 ;;
    *) return 0 ;;
  esac
}
timeout() { shift; "$@"; }
curl() { return 0; }
sleep() { return 0; }
SMOKE_CALLS=0
bash() { SMOKE_CALLS=$((SMOKE_CALLS + 1)); [ "\${FAIL_SMOKE:-0}" != 1 ] || [ "$SMOKE_CALLS" -gt 1 ]; }
export -f git sudo timeout curl sleep bash
source "${unix(path.join(folder, 'deploy.sh'))}" --prebuilt-image "$TEST_IMAGE"
`;
function test(name, env, expected, verify) {
  const log = path.join(folder, `calls-${name.replaceAll(/[^a-z0-9]/gi, '-')}.txt`);
  fs.writeFileSync(log, '');
  const result = spawnSync(bash, ['--noprofile', '--norc'], { input: mocks, encoding: 'utf8', cwd: root,
    env: { ...process.env, TEST_IMAGE: 'beatzucker:release-420abeb', MOCK_LOG: unix(log), ...env } });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, result.stdout + result.stderr);
  const calls = fs.readFileSync(log, 'utf8');
  assert.ok(!calls.includes('upmado'));
  assert.ok(!calls.includes('docker build '));
  verify(calls, result.stdout);
  console.log('PASS ' + name);
}
test('prebuilt uses immutable image after DSP without rebuilding', { CHANGED: 'deploy/deploy.sh\nscripts/prebuilt-deploy-tests.cjs\n' }, 0, calls => {
  assert.ok(calls.indexOf('self_test.py') < calls.indexOf('docker stop beatzucker'));
  assert.ok(calls.includes('docker tag ' + imageID + ' beatzucker:latest'));
  assert.ok(calls.indexOf('beatzucker:pre-deploy-') < calls.indexOf('docker tag ' + imageID));
});
for (const [name, env] of [
  ['rejects foreign image', { TEST_IMAGE: 'upmado:latest' }],
  ['rejects changed application source', { CHANGED: 'lib/manualLoop.ts\n' }],
  ['rejects changed runtime config', { CHANGED: 'start.sh\n' }],
  ['rejects missing image revision', { BAD_REVISION: '1' }],
  ['rejects unrelated revision', { BAD_ANCESTOR: '1' }],
]) test(name, env, 1, calls => assert.equal(calls, ''));
test('failed DSP leaves live container and latest tag untouched', { FAIL_DSP: '1' }, 1, calls => {
  assert.ok(!calls.includes('docker stop beatzucker'));
  assert.ok(!calls.includes('docker tag ' + imageID));
});
test('failed smoke uses schema-safe rollback entrypoint', { FAIL_SMOKE: '1' }, 1, (calls, output) => {
  assert.ok(calls.includes('--entrypoint /bin/sh'));
  assert.ok(calls.includes('/app/rollback-tools/start.sh'));
  assert.ok(output.includes('Rollback to previous image succeeded.'));
});
for (const file of ['deploy/deploy.sh', 'deploy/prebuilt-image.sh']) {
  const result = spawnSync(bash, ['-n', file], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
console.log('8 mocked prebuilt deployment checks and Bash syntax passed; no Docker or live files used.');
