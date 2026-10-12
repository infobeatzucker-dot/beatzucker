const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const cache = new Map();
function load(file, overrides = {}, context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module, exports: module.exports, Date, Set, URL, fetch, console, encodeURIComponent, require: name => {
      if (name in overrides) return overrides[name];
      if (name === 'next/link') return { default: props => React.createElement('a', props, props.children) };
      if (name.startsWith('@/') || name.startsWith('./')) {
        const path = name.startsWith('@/') ? name.slice(2) : require('node:path').join(require('node:path').dirname(file), name);
        const target = fs.existsSync(path + '.ts') ? path + '.ts' : path + '.tsx';
        if (!cache.has(target)) cache.set(target, load(target));
        return cache.get(target);
      }
      return require(name);
    }, ...context });
  return module.exports;
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async () => {
  const guides = load('lib/toolGuidance.ts'), articles = load('app/data/ressourcen.ts').ARTICLES;
  await test('all ten tools have bilingual examples and real, reciprocal learning links', () => {
    assert.equal(Object.keys(guides.TOOL_GUIDES).length, 10);
    for (const [slug, guide] of Object.entries(guides.TOOL_GUIDES)) {
      for (const lang of ['de', 'en']) {
        for (const key of ['title', 'situation', 'action', 'interpretation']) assert.ok(guide[key][lang].length > 5);
        assert.ok(fs.existsSync('app' + guides.toolHref(slug, lang) + '/page.tsx'));
      }
      for (const article of guide.articles) assert.ok(articles.some(a => a.slug === article), article);
      for (const next of guide.next) assert.ok(guides.TOOL_GUIDES[next] && next !== slug);
    }
  });
  await test('clipping takes priority over mono and headroom, without premature mastering recommendation', () => {
    const result = guides.nextStepGuidance('mix-check', 'en', { clipping_detected: true, mono_compatibility: 0, true_peak: 1 });
    assert.match(result.text, /cannot repair/); assert.equal(result.article, 'mix-fuer-mastering-vorbereiten');
    assert.equal(result.tools.length, 0);
  });
  await test('mono risk and limited peaks choose matching tools without self links', () => {
    assert.equal(guides.nextStepGuidance('reference-comparison', 'de', { mono_compatibility: .2 }).tools[0], 'stereo-phase');
    assert.equal(guides.nextStepGuidance('mix-check', 'en', { mono_compatibility: 1, true_peak: 0 }).tools[0], 'streaming-preview');
    assert.equal(guides.nextStepGuidance('streaming-preview', 'en', { mono_compatibility: 1, true_peak: 0 }).tools.length, 0);
  });
  await test('sitemap URLs are unique, public, existing and reciprocally bilingual', () => {
    const sitemap = load('app/sitemap.ts').default(), urls = new Set(sitemap.map(item => item.url));
    assert.equal(urls.size, sitemap.length);
    for (const item of sitemap) {
      assert.ok(item.lastModified instanceof Date && Number.isFinite(+item.lastModified));
      assert.ok(+item.lastModified <= +new Date('2026-10-12T23:59:59Z'));
      assert.doesNotMatch(item.url, /dashboard|admin|api\/|login|register/);
      for (const link of Object.values(item.alternates.languages)) assert.ok(urls.has(link), link);
      for (const link of [item.alternates.languages.en, item.alternates.languages['de-DE']])
        assert.deepEqual(sitemap.find(page => page.url === link).alternates.languages, item.alternates.languages);
      const pathname = new URL(item.url).pathname;
      assert.ok(fs.existsSync('app' + (pathname === '/' ? '' : pathname) + '/page.tsx') || articles.some(a => pathname.endsWith('/' + a.slug)), pathname);
    }
    assert.equal(sitemap.find(item => item.url.endsWith('/legal-notice')).lastModified.toISOString().slice(0, 10), '2026-08-23');
    assert.equal(sitemap.find(item => item.url.endsWith('/tools/key-bpm')).lastModified.toISOString().slice(0, 10), '2026-10-12');
    for (const article of articles) assert.equal(sitemap.find(item => item.url.endsWith('/ressourcen/' + article.slug)).lastModified.toISOString().slice(0, 10), guides.articleContentDate(article));
  });
  const Journey = load('components/ToolJourney.tsx').default;
  function journey(props) { return renderToStaticMarkup(React.createElement(Journey, { tool: 'mix-check', lang: 'en', busy: false, complete: false, ...props })); }
  await test('working, errors and partial results never show misleading completion or next steps', () => {
    assert.match(journey({ busy: true, complete: true }), /aria-busy="true"/);
    for (const props of [{ busy: true, complete: true }, { error: 'Unavailable', complete: true }, { incomplete: true, complete: true }]) {
      const html = journey(props); assert.doesNotMatch(html, /YOUR NEXT STEP|>Completed</);
    }
    assert.match(journey({ error: 'Unavailable' }), /role="alert"/);
    assert.doesNotMatch(journey({ busy: true }), /\d+%/);
  });
  await test('completed recommendations are localized and explain that files are not carried over', () => {
    assert.match(journey({ complete: true }), /Files and settings are not carried over/);
    const de = journey({ complete: true, lang: 'de' }); assert.match(de, /Dateien und Einstellungen werden nicht übertragen/); assert.doesNotMatch(de, /href="\/en/);
    const en = journey({ complete: true }); assert.match(en, /href="\/en\/tools/); assert.match(en, /href="\/en\/knowledge/);
  });
  const { deleteHistoryEntries } = load('lib/historySelection.ts');
  await test('multi-delete checks every server response and retains failures; requests are sequential and deduplicated', async () => {
    const calls = [], result = await deleteHistoryEntries(['one', 'two', 'one', 'three', 'four'], async (url, options) => {
      calls.push(url); assert.equal(options.method, 'DELETE');
      if (url.endsWith('/two')) return { ok: false };
      if (url.endsWith('/three')) throw Error('network error');
      return { ok: true, json: async () => ({ ok: !url.endsWith('/four') }) };
    });
    assert.equal(calls.length, 4); assert.equal(result.deleted.join(','), 'one'); assert.equal(result.failed.join(','), 'two,three,four');
    const maliciousId = await deleteHistoryEntries(['a/b ?'], async url => { assert.equal(url, '/api/master/a%2Fb%20%3F'); return { ok: true, json: async () => ({ ok: true }) }; });
    assert.equal(maliciousId.deleted.length, 1);
  });
  await test('library has confirmation, in-flight guard, select-all and progress exclusion', () => {
    const ui = fs.readFileSync('components/dashboard/MasteringHistoryTable.tsx', 'utf8');
    assert.match(ui, /if \(!confirm\(/); assert.match(ui, /deletingRef\.current/);
    assert.match(ui, /selectAllRef\.current\.indeterminate/); assert.match(ui, /m\.status !== "processing"/);
    assert.match(ui, /previous\.filter\(m => !removed\.has\(m\.id\)\)/);
    assert.match(ui, /selectedIds/); assert.match(ui, /aria-label/);
  });
  await test('actual library handlers select rows, cancel safely and retain failed deletions', async () => {
    const slots = [], effects = []; let index = 0, approve = false, deletions = 0;
    const hooks = {
      useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
      useRef(initial) { const slot = index++; return slots[slot] ||= { current: initial }; },
      useEffect(callback, deps) { const slot = index++, previous = slots[slot]; if (!previous || deps.some((value, i) => value !== previous[i])) { slots[slot] = deps; effects.push(callback); } },
    };
    const masters = ['first', 'second', 'busy'].map(id => ({ id, originalName: id + '.wav', status: id === 'busy' ? 'processing' : 'done', formats: [], notes: '', createdAt: '2026-10-12', completedAt: null }));
    const component = load('components/dashboard/MasteringHistoryTable.tsx', {
      react: hooks, '@/lib/useUiLanguage': { useUiLanguage: () => 'de' }, '@/lib/historySelection': { deleteHistoryEntries: async ids => { deletions++; assert.equal(ids.join(','), 'first,second'); return { deleted: ['first'], failed: ['second'] }; } },
      '@/lib/globalAudio': { getGlobalAudioState: () => ({ playing: false }) },
    }, { confirm: () => approve, fetch: async () => ({ ok: true, json: async () => ({ masters }) }) }).default;
    function render() { index = 0; const tree = component(); while (effects.length) effects.shift()(); return tree; }
    function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
    render(); await new Promise(resolve => setImmediate(resolve));
    let tree = render(), inputs = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox');
    assert.equal(inputs.length, 4); assert.equal(inputs[3].props.disabled, true);
    inputs[1].props.onChange(); tree = render(); inputs = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox');
    assert.equal(inputs[1].props.checked, true); assert.equal(inputs[2].props.checked, false);
    inputs[0].props.onChange(); tree = render(); inputs = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox');
    assert.equal(inputs[0].props.checked, true); assert.equal(inputs[2].props.checked, true); assert.equal(inputs[3].props.checked, false);
    const button = nodes(tree).find(node => node.type === 'button' && node.props['data-danger'] === true);
    await button.props.onClick(); await new Promise(resolve => setImmediate(resolve)); assert.equal(deletions, 0);
    approve = true; await button.props.onClick(); await new Promise(resolve => setImmediate(resolve));
    tree = render(); inputs = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox');
    assert.equal(deletions, 1); assert.equal(inputs.length, 3); assert.equal(inputs[1].props['aria-label'], 'second.wav auswählen'); assert.equal(inputs[1].props.checked, true);
    const feedback = nodes(tree).find(node => node.props?.detail?.includes('1 gelöscht, 1 nicht gelöscht'));
    assert.ok(feedback); assert.equal(feedback.props.state, 'error');
  });
  console.log(`${passed} guidance, sitemap, feedback and history checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
