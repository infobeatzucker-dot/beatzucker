/* Local-only production-build test with an isolated SQLite admin account. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { hashSync } = require("bcryptjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

if (process.env.BEATZUCKER_ISOLATED_QA !== "1") throw Error("Isolated test only");
const base = "http://127.0.0.1:3013";
const database = path.resolve("validation-output/tools-audit-20261011/runtime/qa.sqlite").replaceAll("\\", "/");
const db = new PrismaClient({ datasources:{ db:{ url:"file:" + database } } });
const id = "donation-welcome", key = "beatzucker-donation-welcome-dismissed";
const email = "qa-admin-activity@example.invalid", password = "Isolated-DNotForProduction-2026!";

async function localContext(browser, options = {}) {
  const context = await browser.newContext({ baseURL:base, ...options });
  await context.route("**/*", route => route.request().url().startsWith(base + "/") ? route.continue() : route.abort());
  return context;
}

async function verifyLoop(page, url, lang) {
  await page.goto(url);
  const demo = page.locator("#demo");
  const play = demo.getByRole("button", { name:lang==="en" ? "Play all tracks" : "Alle Spuren abspielen" });
  const loop = demo.getByRole("button", { name:lang==="en" ? "Repeat all tracks" : "Alle Spuren wiederholen" });
  assert.equal(await loop.getAttribute("aria-pressed"),"true");
  await play.click();
  const timeline = demo.getByRole("slider", { name:lang==="en" ? "Shared playback position" : "Gemeinsame Wiedergabeposition" });
  await page.waitForFunction(() => {
    const players = [...document.querySelectorAll("#demo audio")];
    return players.length && players.every(audio => audio.duration && !audio.paused);
  });
  const actual = await timeline.getAttribute("max");
  const nearEnd = (Number(actual) - .65).toFixed(2);
  async function seekNearEnd() {
    await timeline.fill(nearEnd);
    await page.waitForFunction(() => {
      const player = document.querySelector("#demo audio");
      return player && !player.paused && player.currentTime >= player.duration - .8;
    });
  }
  await seekNearEnd();
  await page.waitForFunction(() => {
    const players = [...document.querySelectorAll("#demo audio")];
    return players.every(audio => !audio.paused && audio.currentTime < 2)
      && Math.max(...players.map(audio=>audio.currentTime)) - Math.min(...players.map(audio=>audio.currentTime)) < .18;
  });
  await loop.click();
  assert.equal(await loop.getAttribute("aria-pressed"),"false");
  await seekNearEnd();
  await play.waitFor();
  assert.ok(await demo.locator("audio").evaluateAll(tracks=>tracks.every(track=>track.paused)));
  assert.equal(await page.locator(".bz-support-dialog[open]").count(),0,"Popup is homepage-only");
  console.log("PASS coordinated loop and normal ending " + url);
}

(async()=>{
  const initial = await db.promotion.findUnique({ where:{ id } });
  const browser = await chromium.launch({ channel:"chrome", headless:true, args:["--mute-audio"] });
  try {
    const guest = await localContext(browser,{ viewport:{ width:390, height:844 }, reducedMotion:"reduce" });
    assert.equal((await guest.request.patch("/api/donation-popup",{ data:{enabled:true}, headers:{Origin:base} })).status(),403);

    const hashed = hashSync(password,10);
    await db.user.upsert({ where:{email}, update:{password:hashed}, create:{email,password:hashed} });
    const admin=await localContext(browser);
    await admin.addInitScript(()=>localStorage.setItem("beatzucker_cookie_consent","accepted"));
    const csrf=(await (await admin.request.get("/api/auth/csrf")).json()).csrfToken;
    const loginResponse = await admin.request.post("/api/auth/callback/credentials",{ form:{csrfToken:csrf,email,password,json:"true",callbackUrl:base+"/admin"},headers:{Origin:base} });
    const login = await loginResponse.json();
    assert.equal(login.url, base+"/admin", `Isolated sign-in failed (${loginResponse.status()}), cookie names: ${(await admin.cookies()).map(cookie=>cookie.name).join(", ")}`);
    const adminPage=await admin.newPage();
    await adminPage.goto("/admin?lang=de");
    const setting=adminPage.getByRole("switch",{ name:"Spenden-Popup anzeigen" });
    await setting.waitFor();
    assert.equal((await admin.request.patch("/api/donation-popup",{ data:{enabled:true},headers:{Origin:"https://other.invalid"} })).status(),403);
    const fetchFromAdmin = enabled => adminPage.evaluate(value=>fetch("/api/donation-popup",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:value})}).then(r=>r.status),enabled);
    assert.equal(await fetchFromAdmin("yes"),400);
    assert.equal(await fetchFromAdmin(false),200);
    await adminPage.reload();
    await setting.click();
    await adminPage.getByText("Gespeichert.",{exact:true}).waitFor();
    assert.deepEqual(await (await guest.request.get("/api/donation-popup")).json(),{enabled:true});

    const de=await guest.newPage();
    await de.goto("/");
    const cookie=de.getByRole("button",{name:"Verstanden",exact:true});
    await cookie.waitFor();
    assert.equal(await de.locator(".bz-support-dialog[open]").count(),0);
    await cookie.click();
    const dialog=de.getByRole("dialog",{name:"Hilf mit, Beatzucker kostenlos zu halten"});
    await dialog.waitFor();
    assert.equal(await dialog.getByRole("link",{name:"Über PayPal spenden"}).getAttribute("href"),"https://paypal.me/MichaelClas1405");
    assert.equal(await dialog.locator(".bz-support-channel").count(),4);
    assert.equal(await dialog.locator(".bz-support-slot i").first().evaluate(el=>getComputedStyle(el).animationName),"none");
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await dialog.getByRole("button",{name:"Weiter zu Beatzucker"}).click();
    await dialog.waitFor({state:"hidden"});
    assert.equal(await de.evaluate(storageKey=>localStorage.getItem(storageKey),key),"1");
    await Promise.all([de.waitForResponse(response=>response.url().endsWith("/api/promo")), de.goto("/en")]);
    assert.equal(await de.locator(".bz-support-dialog[open]").count(),0);

    const fresh=await localContext(browser,{ viewport:{ width:1280,height:900 } });
    await fresh.addInitScript(()=>localStorage.setItem("beatzucker_cookie_consent","accepted"));
    const en=await fresh.newPage();
    await en.goto("/en");
    const english=en.getByRole("dialog",{name:"Help keep Beatzucker free"});
    await english.waitFor();
    assert.notEqual(await english.locator(".bz-support-slot i").first().evaluate(el=>getComputedStyle(el).animationName),"none");
    if (process.env.QA_DONATION_SCREENSHOT) await english.screenshot({path:process.env.QA_DONATION_SCREENSHOT,animations:"disabled"});
    await en.keyboard.press("Escape");
    assert.equal(await en.evaluate(storageKey=>localStorage.getItem(storageKey),key),"1");
    await verifyLoop(de,"/tools/vocal-remover","de");
    await verifyLoop(en,"/en/tools/stem-separation","en");
    await setting.click();
    await adminPage.getByText("Gespeichert.",{exact:true}).waitFor();
    assert.deepEqual(await (await guest.request.get("/api/donation-popup")).json(),{enabled:false});
    const disabled = await localContext(browser);
    await disabled.addInitScript(()=>localStorage.setItem("beatzucker_cookie_consent","accepted"));
    const disabledPage = await disabled.newPage();
    await Promise.all([disabledPage.waitForResponse(response=>response.url().endsWith("/api/promo")),disabledPage.goto("/")]);
    assert.equal(await disabledPage.locator(".bz-support-dialog[open]").count(),0);
    await disabled.close();
    console.log("PASS donation popup: admin access and switch, cookie ordering, DE/EN, PayPal, reduced motion and persistent dismissal");
  } finally {
    await browser.close();
    if (initial) await db.promotion.updateMany({ where:{id}, data:{active:initial.active} });
    else await db.promotion.deleteMany({where:{id}});
    await db.$disconnect();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
