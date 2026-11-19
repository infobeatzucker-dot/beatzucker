/* Isolated local browser regression tests. The stem worker response uses generated WAV fixtures. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "http://127.0.0.1:3013";

function tone(hz) {
  const rate = 24000, length = 8 * rate;
  const wave = Buffer.alloc(44 + length * 2);
  wave.write("RIFF");
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(rate, 24);
  wave.writeUInt32LE(rate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) wave.writeInt16LE(Math.round(Math.sin(i / rate * 2 * Math.PI * hz) * 12000), 44 + 2 * i);
  return wave;
}

async function cutter(page) {
  await page.goto("/tools/audio-cutter");
  await page.locator("input[type=file]").setInputFiles({ name:"fixture.wav", mimeType:"audio/wav", buffer:tone(87) });
  const start = page.getByRole("slider", { name:"Auswahlbeginn" });
  await start.waitFor();
  const fade = page.getByLabel("Fade-in (s)", { exact:true });
  await fade.fill("0.3");
  await start.scrollIntoViewIfNeeded();
  const box = await start.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 25, { steps: 8 });
  await page.locator(".bz-cut-loupe path").waitFor();
  assert.match(await page.locator(".bz-cut-loupe path").getAttribute("d"), /M.*V/);
  await page.mouse.up();
  const startSeconds = Number(await start.getAttribute("aria-valuenow"));
  assert.ok(startSeconds > .4);
  await start.press("ArrowRight");
  assert.ok(Number(await start.getAttribute("aria-valuenow")) > startSeconds);
  assert.equal(await page.locator(".bz-cut-fade").count(), 2);
  assert.ok(Number(await page.locator(".bz-cut-shade").first().getAttribute("width")) > 0);
  await page.getByRole("button", { name:"Auswahl vorhören", exact:true }).click();
  await page.getByRole("button", { name:"Stoppen", exact:true }).click();
  await page.getByRole("button", { name:"Schneiden und WAV exportieren", exact:true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name:"Geschnittene WAV herunterladen", exact:true }).click();
  assert.equal(await (await download).failure(), null);
  console.log("PASS cutter: drag, PCM loupe, keyboard, fades, preview and WAV download");
}

async function conflict(page) {
  await page.goto("/en/tools/kick-bass-conflict");
  const inputs = page.locator("input[type=file]");
  await inputs.nth(0).setInputFiles({ name:"kick.wav", mimeType:"audio/wav", buffer:tone(57) });
  await inputs.nth(1).setInputFiles({ name:"bass.wav", mimeType:"audio/wav", buffer:tone(58) });
  await page.getByRole("button", { name:"Analyze conflict" }).click();
  const firstBand = page.getByRole("button", { name:"35–60 Hz" });
  await firstBand.waitFor();
  assert.equal(await firstBand.getAttribute("aria-pressed"), "true");
  assert.ok(await page.locator(".bz-conflict-peak").count());
  const firstX = await page.locator(".bz-conflict-region").getAttribute("x");
  await page.getByRole("button", { name:"100–180 Hz" }).press("Enter");
  assert.notEqual(await page.locator(".bz-conflict-region").getAttribute("x"), firstX);
  assert.match(await page.locator(".bz-conflict-tip").textContent(), /too much body/);
  console.log("PASS kick and bass: measured overlap, selected frequency band and keyboard tips");
}

async function stems(page) {
  const id = "a".repeat(32);
  const files = { vocals:tone(220), drums:tone(60), bass:tone(90), other:tone(440) };
  let rangeRequests = 0;
  await page.route("**/api/stems**", async route => {
    const url = new URL(route.request().url());
    const audio = files[url.searchParams.get("asset")];
    if (!audio) return route.fulfill({ json:{ available:true, permissions:{}, jobs:[{ id, tool:"stem-separation", mode:"preview", status:"done", stems:Object.keys(files) }] } });
    const headers = { "content-type":"audio/wav", "accept-ranges":"bytes" };
    const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
    if (!range) return route.fulfill({ body:audio, headers });
    const first = +range[1], last = Math.min(audio.length - 1, range[2] ? +range[2] : audio.length - 1);
    assert.ok(last >= first);
    rangeRequests++;
    return route.fulfill({ status:206, body:audio.subarray(first, last + 1), headers:{ ...headers, "content-range":`bytes ${first}-${last}/${audio.length}` } });
  });
  await page.goto("/en/tools/stem-separation");
  await page.getByRole("heading", { name:"Stem mixer" }).waitFor();
  await page.getByRole("button", { name:"Play all tracks" }).click();
  await page.waitForFunction(() => [...document.querySelectorAll(".bz-stem-strip audio")].every(audio => !audio.paused && audio.currentTime > .25));
  await page.locator(".bz-stem-meter i[style]").first().waitFor();
  assert.notEqual(await page.locator(".bz-stem-strip path").first().getAttribute("d"), "M0 24H508");
  const fader = page.getByRole("slider", { name:"Vocals level", exact:true });
  const vocals = page.locator('[data-channel="vocals"]');
  const meter = vocals.locator(".bz-stem-meter i");
  assert.equal(await fader.getAttribute("aria-valuetext"), "0 dB");
  await fader.press("Home");
  assert.equal(await fader.getAttribute("aria-valuetext"), "−∞ dB");
  await page.waitForFunction(() => document.querySelector('[data-channel="vocals"] .bz-stem-meter i')?.style.getPropertyValue("--level") === "0");
  await fader.press("End");
  assert.equal(await fader.getAttribute("aria-valuetext"), "+6 dB");
  await page.waitForFunction(() => Number(document.querySelector('[data-channel="vocals"] .bz-stem-meter i')?.style.getPropertyValue("--level")) > 0);
  await vocals.getByRole("button", { name:"Reset Vocals level" }).click();
  assert.equal(await fader.getAttribute("aria-valuetext"), "0 dB");
  const initialLevel = Number(await meter.evaluate(element => element.style.getPropertyValue("--level")));
  const bounds = await fader.boundingBox();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height * .7);
  await page.waitForFunction(level => Number(document.querySelector('[data-channel="vocals"] .bz-stem-meter i')?.style.getPropertyValue("--level")) < level, initialLevel);
  assert.equal(await page.getByRole("slider", { name:"Bass level", exact:true }).getAttribute("aria-valuetext"), "0 dB");
  await page.getByRole("button", { name:"Solo · Bass", exact:true }).click();
  assert.equal(await page.locator('.bz-stem-strip[data-audible="true"]').count(), 1);
  await page.getByRole("button", { name:"Mute Bass", exact:true }).click();
  assert.equal(await page.locator('.bz-stem-strip[data-audible="true"]').count(), 0);
  const timeline = page.getByRole("slider", { name:"Shared playback position" });
  await timeline.fill("4");
  await page.waitForFunction(() => [...document.querySelectorAll(".bz-stem-strip audio")].every(audio => !audio.paused && audio.currentTime >= 4));
  const times = await page.locator(".bz-stem-strip audio").evaluateAll(nodes => nodes.map(node => node.currentTime));
  assert.ok(Math.max(...times) - Math.min(...times) < .18);
  await page.getByRole("button", { name:"Pause all tracks" }).click();
  assert.ok(await page.locator(".bz-stem-strip audio").evaluateAll(nodes => nodes.every(node => node.paused)));
  assert.equal(await page.locator(".stem-downloads a").count(), 0);
  assert.ok(rangeRequests >= 4);
  const paletteCount = await page.locator(".bz-stem-mixer").evaluate(deck => {
    const root = document.documentElement, previous = root.dataset.uiTheme;
    const colors = ["original","light","analog","aurora","sandstone","obsidian-gold","midnight-cobalt","velvet-plum","arctic-ice","pistachio-studio","rose-quartz"].map(theme => {
      root.dataset.uiTheme = theme;
      return getComputedStyle(deck).backgroundImage;
    });
    if (previous) root.dataset.uiTheme = previous; else delete root.dataset.uiTheme;
    return new Set(colors).size;
  });
  assert.equal(paletteCount, 11);
  if (process.env.QA_STEM_SCREENSHOT) {
    await page.setViewportSize({ width:1440, height:1050 });
    await page.getByRole("button", { name:"Mute Bass", exact:true }).click();
    await page.getByRole("button", { name:"Solo · Bass", exact:true }).click();
    await timeline.fill("1");
    await page.getByRole("button", { name:"Play all tracks" }).click();
    await page.waitForFunction(() => [...document.querySelectorAll(".bz-stem-meter i")].every(el => Number(el.style.getPropertyValue("--level")) > 0));
    await page.locator(".bz-stem-mixer").screenshot({ path:process.env.QA_STEM_SCREENSHOT, style:"header.fixed { visibility: hidden; }" });
    await page.getByRole("button", { name:"Pause all tracks" }).click();
    await page.setViewportSize({ width:390, height:844 });
  }
  console.log("PASS stem mixer: four WAV streams, real fader gain, keyboard/pointer/reset, solo/mute, common seek/pause and trial restriction");
}

(async () => {
  const browser = await chromium.launch({ channel:"chrome", headless:true, args:["--mute-audio"] });
  try {
    const context = await browser.newContext({ baseURL:base, viewport:{ width:390, height:844 }, acceptDownloads:true });
    await context.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem("beatzucker_cookie_consent", "accepted"));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const check of [cutter, conflict, stems]) {
      await check(page);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
