// Runs against the explicitly isolated localhost QA instance, never a public site.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { isContainerQa } = require('./isolated-qa-guard.cjs');
const containerQa = isContainerQa();
const base = containerQa ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:3022';
const origin = containerQa ? 'http://localhost:3012' : 'http://localhost:3022', jar = new Map();
async function request(url, options = {}) {
  const response = await fetch(base + url, { ...options, headers: { Origin: origin, Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...options.headers }, signal: AbortSignal.timeout(120000) });
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], index = pair.indexOf('='); jar.set(pair.slice(0, index), pair.slice(index + 1)); }
  return response;
}
async function main() {
  const directory = process.argv[2];
  if (!/^audit-qa-[\w-]+$/.test(directory || '')) throw Error('An isolated audit-qa directory name is required');
  const file = new File([fs.readFileSync(path.resolve(__dirname, '../validation-output', directory, 'fixture.wav'))], 'fixture.wav', { type: 'audio/wav' });
  const health = await request('/api/health'); assert.equal(health.status, 200);
  const csrf = await (await request('/api/auth/csrf')).json();
  const login = await request('/api/auth/callback/credentials', { method: 'POST', body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: 'audit@example.invalid', password: 'Local-Audit-Only-2026!', json: 'true', callbackUrl: origin + '/en' }) });
  assert.ok(!(await login.json()).url.includes('error'));
  const account = await (await request('/api/account')).json(); assert.equal(account.user.email, 'audit@example.invalid');
  console.log('PASS isolated credentials, session and account API');
  for (const codec of ['aac256', 'mp3320', 'mp3128']) {
    const form = new FormData(); form.append('file', file); form.append('codec', codec);
    const response = await request('/api/codec-preview', { method: 'POST', body: form });
    assert.equal(response.status, 200, await response.clone().text());
    assert.ok(response.headers.has('X-Encoded-True-Peak'));
    assert.ok(Number.isFinite(Number(response.headers.get('X-Encoded-True-Peak'))));
    assert.ok((await response.arrayBuffer()).byteLength > 100); console.log('PASS actual codec API ' + codec);
  }
  const trim = new FormData(); trim.append('file', file); for (const [key, value] of Object.entries({ start: '1', end: '5', target: '-14', lang: 'en' })) trim.append(key, value);
  const trimmed = await request('/api/silence-normalize', { method: 'POST', body: trim });
  assert.equal(trimmed.status, 200, await trimmed.clone().text()); assert.ok(trimmed.headers.get('X-Normalization-Stats'));
  assert.ok((await trimmed.arrayBuffer()).byteLength > 44); console.log('PASS actual section-normalization API');
  const uploadForm = new FormData(); uploadForm.append('file', file);
  const uploaded = await request('/api/upload', { method: 'POST', body: uploadForm }); assert.equal(uploaded.status, 200, await uploaded.clone().text());
  const upload = await uploaded.json();
  const analyzed = await request('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upload) }); assert.equal(analyzed.status, 200, await analyzed.clone().text());
  const analysis = await analyzed.json(); assert.ok(analysis.analysis_token); console.log('PASS upload ownership and signed actual analysis');
  const ids = [];
  for (const overrides of [undefined, { low_shelf_gain: -3, air_gain: 2, stereo_width: .8 }]) {
    const response = await request('/api/master', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...upload, original_name: file.name, analysis, platform: 'spotify', preset: 'auto', intensity: 45, format: 'wav24', ...(overrides ? { overrides } : {}) }) });
    assert.equal(response.status, 200, await response.clone().text());
    const events = (await response.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
    assert.ok(!events.some(event => event.step === 'error'), JSON.stringify(events));
    const result = events.find(event => event.step === 'complete'); assert.ok(result?.master_id && result.formats.wav24, JSON.stringify(events)); ids.push(result.master_id);
    const download = await request(result.formats.wav24); assert.equal(download.status, 200); assert.ok((await download.arrayBuffer()).byteLength > 44);
    console.log('PASS actual ' + (overrides ? 'manual re-master' : 'auto-master') + ' and authenticated WAV download');
  }
  assert.notEqual(ids[0], ids[1]); console.log('8 local audio integration checks passed; no production files or mail used.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
