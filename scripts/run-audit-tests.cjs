const { spawnSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) throw Error(`${command} failed: ${result.error?.message || result.status}`);
}
try {
  // Refuse a misleading green result with skipped codec tests.
  run(process.env.FFMPEG_BINARY || 'ffmpeg', ['-version']);
  for (const suite of ['audit-regression', 'account-security', 'codec-preview', 'silence-normalizer', 'terms-consent', 'registration-mail', 'guidance-history', 'upload-budget', 'browser-audio', 'tools-quality', 'json-body', 'rollback', 'isolated-qa', 'manual-loop', 'prebuilt-deploy'])
    run(process.execPath, [`scripts/${suite}-tests.cjs`]);
  run(process.execPath, ['scripts/withdrawal-db-test.cjs']);
  run(process.execPath, ['scripts/registration-db-tests.cjs']);
  run(process.execPath, ['scripts/tool-usage-tests.cjs']);
  run(process.execPath, ['scripts/mastering-quality-tests.cjs']);
  run(process.execPath, ['scripts/reference-dial-tests.cjs']);
  run(process.execPath, ['scripts/express-assistant-tests.cjs']);
  run(process.execPath, ['scripts/mastering-stability-tests.cjs']);
  run(process.execPath, ['scripts/mastering-audio-lifecycle-tests.cjs']);
  run(process.execPath, ['scripts/sonic-progress-tests.cjs']);
  run(process.execPath, ['scripts/mastering-stage-tests.cjs']);
  run(process.execPath, ['scripts/studio-transitions-tests.cjs']);
  run(process.execPath, ['scripts/upload-motion-tests.cjs']);
  run(process.execPath, ['scripts/seo-metadata-tests.cjs']);
  run(process.execPath, ['scripts/seo-frontend-tests.cjs']);
  run(process.execPath, ['scripts/showcase-tests.cjs']);
  run(process.execPath, ['scripts/admin-quota-tests.cjs']);
  run(process.execPath, ['scripts/showcase-admin-tests.cjs']);
  run(process.execPath, ['scripts/release-audience-tests.cjs']);
  run(process.execPath, ['scripts/mastering-examples-tests.cjs']);
  run(process.execPath, ['scripts/full-release-guidance-tests.cjs']);
  run(process.execPath, ['scripts/showcase-gallery-tests.cjs']);
  run(process.execPath, ['scripts/showcase-contour-tests.cjs']);
  run(process.execPath, ['scripts/showcase-cover-pool-tests.cjs']);
  run(process.execPath, ['scripts/platform-comparison-tests.cjs']);
  run(process.execPath, ['scripts/stem-access-tests.cjs']);
  run(process.execPath, ['scripts/seo-results-tests.cjs']);
  run(process.execPath, ['scripts/audio-utilities-tests.cjs']);
  run(process.execPath, ['scripts/mp3-converter-tests.cjs']);
  run(process.execPath, ['scripts/speech-cleaner-tests.cjs']);
  run(process.execPath, ['scripts/withdrawal-spam-tests.cjs']);
  run(process.execPath, ['scripts/reference-matching-tests.cjs']);
  run(process.execPath, ['scripts/sections-character-tests.cjs']);
  run(process.execPath, ['scripts/current-learning-tests.cjs']);
  const venv = path.join(root, 'python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const python = fs.existsSync(venv) ? venv : process.platform === 'win32' ? 'python' : 'python3';
  run(python, ['-m', 'unittest', 'discover', '-s', 'python/tests']);
  run(python, ['python/self_test.py']);
  console.log('Audit regression tests and offline DSP self-test passed. Local HTTP integration tests are a separate, isolated QA step.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
