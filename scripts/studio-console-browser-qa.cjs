/* Isolated browser playback and theme checks. Album analysis uses two fixed measurements. */
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base="http://127.0.0.1:3013";
const themes=["original","light","analog","aurora","sandstone","obsidian-gold","midnight-cobalt","velvet-plum","arctic-ice","pistachio-studio","rose-quartz"];

function wave(name, frequency) {
  const sr=24000, length=sr*9, buffer=Buffer.alloc(44+length*2);
  buffer.write("RIFF");buffer.writeUInt32LE(buffer.length-8,4);buffer.write("WAVEfmt ",8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(sr,24);buffer.writeUInt32LE(sr*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);
  buffer.write("data",36);buffer.writeUInt32LE(length*2,40);
  for(let i=0;i<length;i++) buffer.writeInt16LE(Math.round(13500*Math.sin(i/sr*2*Math.PI*frequency)+10000*Math.sin(i/sr*2*Math.PI*6800)),44+2*i);
  return {name,mimeType:"audio/wav",buffer};
}

async function themeCheck(page, selector) {
  const colors=new Set();
  for(const theme of themes){
    const color=await page.locator(selector).evaluate((node,name)=>{
      document.documentElement.dataset.uiTheme=name;
      const style=getComputedStyle(node);
      return `${style.color}|${style.backgroundImage}|${style.borderColor}`;
    },theme);
    colors.add(color);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),theme);
  }
  assert.equal(colors.size,themes.length);
  await page.evaluate(()=>{document.documentElement.dataset.uiTheme="original";});
}

(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true,args:["--mute-audio"]});
  try {
    const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844}});
    await context.route("**/*",r=>{const address=new URL(r.request().url());return address.origin===base||address.protocol==="blob:"?r.continue():r.abort();});
    await context.addInitScript(()=>{
      localStorage.setItem("beatzucker_cookie_consent","accepted");
      window.__gainTargets=[];
      const set=AudioParam.prototype.setTargetAtTime;
      AudioParam.prototype.setTargetAtTime=function(value,...args){
        window.__gainTargets.push(value);
        return set.call(this,value,...args);
      };
    });
    const page=await context.newPage(), errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto("/en/tools/vocal-chain");
    await page.locator("input[type=file]").setInputFiles(wave("vocals.wav",180));
    const play=page.getByRole("button",{name:"Play vocals",exact:true});
    await play.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.bz-hardware-meter[data-reduction="true"] .bz-hardware-leds')].every(el=>el.querySelector('[data-lit="true"]')));
    const dry=page.getByRole("button",{name:"Original",exact:true});
    await dry.click();
    assert.equal(await dry.getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator('.bz-hardware-meter[data-reduction="true"] [data-lit="true"]').count(),0);
    await page.getByRole("button",{name:"Processed",exact:true}).click();
    const blend=page.getByRole("slider",{name:"Processing mix"});
    await blend.press("Home");
    assert.equal(await blend.getAttribute("aria-valuetext"),"0 %");
    await blend.press("End");
    assert.equal(await blend.getAttribute("aria-valuetext"),"100 %");
    await themeCheck(page,".vocal-console");
    if(process.env.QA_STUDIO_SCREENSHOTS) {
      await page.setViewportSize({width:1280,height:1100});
      await page.locator(".vocal-console").evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
      await page.locator(".vocal-console").screenshot({path:`${process.env.QA_STUDIO_SCREENSHOTS}/vocal-chain.png`});
      await page.setViewportSize({width:390,height:844});
    }
    await page.getByRole("button",{name:"Render 24-bit WAV",exact:true}).click();
    await page.getByRole("link",{name:"Download processed WAV"}).waitFor();
    console.log("PASS Vocal Chain: real separate gain reduction, A/B, blend, WAV render and eleven themes");

    let measured=0;
    await page.route("**/api/mix-check",r=>r.fulfill({json:{analysis:{integrated_lufs:measured++===0?-23:-13,true_peak:-2,dr_value:8,spectral_centroid:2000}}}));
    await page.goto("/en/tools/album-consistency");
    await page.locator("input[type=file]").setInputFiles([wave("quiet.wav",150),wave("loud.wav",270)]);
    await page.getByRole("button",{name:"Analyze pending tracks"}).click();
    const solo=page.getByRole("button",{name:"Solo · quiet.wav",exact:true});
    await solo.click();
    await page.waitForFunction(()=>!document.querySelector(".bz-album-desk audio")?.paused);
    await page.getByRole("button",{name:"Match preview"}).click();
    assert.equal(await page.getByRole("button",{name:"Match preview"}).getAttribute("aria-pressed"),"true");
    await page.waitForFunction(()=>window.__gainTargets.some(gain=>Math.abs(gain-10**(1/20))<.0001));
    const target=page.getByRole("slider",{name:"Comparison target",exact:true});
    await target.press("Home");
    assert.equal(await target.getAttribute("aria-valuetext"),"-32.0 LUFS");
    await page.getByRole("button",{name:"Reset to album median"}).click();
    assert.equal(await target.getAttribute("aria-valuetext"),"-18.0 LUFS");
    const firstUrl=await page.locator(".bz-album-desk audio").getAttribute("src");
    await page.getByRole("button",{name:"Solo · loud.wav",exact:true}).click();
    await page.getByRole("button",{name:"Pause · loud.wav",exact:true}).waitFor();
    assert.notEqual(await page.locator(".bz-album-desk audio").getAttribute("src"),firstUrl);
    await page.getByRole("slider",{name:"Playback position",exact:true}).fill("4");
    await page.waitForFunction(()=>document.querySelector(".bz-album-desk audio")?.currentTime>=3.95);
    await themeCheck(page,".bz-album-desk");
    if(process.env.QA_STUDIO_SCREENSHOTS) {
      await page.setViewportSize({width:1280,height:1100});
      await page.evaluate(()=>{document.documentElement.dataset.uiTheme="arctic-ice";});
      await page.locator(".bz-album-desk").evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
      await page.locator(".bz-album-desk").screenshot({path:`${process.env.QA_STUDIO_SCREENSHOTS}/album-desk-arctic-ice.png`});
    }
    for(const [path,heading] of [["/#features","Im Studio hören und nachjustieren"],["/en#features","Listening and adjusting in the studio"]]){
      await page.goto(path);
      await page.locator("#features #studio-guide").getByRole("heading",{name:heading,exact:true}).waitFor();
    }
    assert.deepEqual(errors,[]);
    console.log("PASS album desk: independent audition, target, capped gain, source switch and eleven themes");

    for(const [path,label,first,send] of [
      ["/ressourcen","Problem melden","Was ist passiert?","E-Mail-Entwurf öffnen"],
      ["/en/knowledge","Report a problem","What happened?","Open email draft"],
    ]){
      await page.goto(path+"?qa-private=excluded#studio-guide");
      const launcher=page.getByRole("button",{name:label,exact:true});
      await launcher.click();
      const dialog=page.getByRole("dialog",{name:label,exact:true});
      const field=dialog.getByRole("textbox",{name:first,exact:true});
      assert.ok(await field.evaluate(el=>document.activeElement===el));
      assert.ok(await dialog.getByRole("button",{name:send}).isDisabled());
      await field.fill("Beim Export bleibt die Anzeige stehen.");
      const mail=new URL(await dialog.getByRole("link",{name:send}).getAttribute("href"));
      assert.equal(mail.pathname,"info@re-beatz.com");
      const draft=mail.searchParams.get("body");
      assert.ok(draft.includes(path)&&draft.includes("v2.0.0")&&draft.includes("Beim Export"));
      assert.ok(!draft.includes("qa-private")&&!draft.includes("#studio-guide"));
      await page.keyboard.press("Escape");
      await dialog.waitFor({state:"hidden"});
      await page.waitForFunction(()=>document.activeElement?.classList.contains("bz-report-launch"));
      assert.ok(await page.locator("#studio-guide").getByRole("link",{name:/Vocal Chain/}).count());
    }
    assert.deepEqual(errors,[]);
    console.log("PASS problem report: German and English, versioned draft, private query excluded, keyboard and related guides");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
