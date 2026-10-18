/* Optional local-browser QA: uses the supplied Playwright runtime, never production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome',args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 await page.route('**/*',route=>{const url=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(url.hostname)||url.protocol==='data:'?route.continue():route.abort();});
 await page.goto('http://127.0.0.1:3013/hoervergleich#before-after');
 await page.getByRole('button',{name:'Verstanden',exact:true}).click();
 const gallery=page.locator('.showcase-gallery');await page.waitForSelector('.showcase-gallery[data-covers-ready="true"]');
 const initial=await page.locator('.gallery-feature img').getAttribute('src');
 await page.reload();await page.waitForSelector('.showcase-gallery[data-covers-ready="true"]');assert.notEqual(await page.locator('.gallery-feature img').getAttribute('src'),initial);
 await page.locator('.gallery-feature img').evaluate(img=>img.decode());
 const output=path.resolve('validation-output/showcase-1.1');fs.mkdirSync(output,{recursive:true});
 await gallery.screenshot({path:path.join(output,'desktop-paused.png')});
 const measurements=[];
 for(let index=0;index<Math.min(3,await page.locator('.gallery-track-picker button').count());index++){
  await page.locator('.gallery-track-picker button').nth(index).click();
  await page.locator('.gallery-play').click();await page.waitForSelector('.showcase-gallery.is-playing');
  const samples=await page.evaluate(async()=>{const result=[];for(let i=0;i<140;i++){const rings=document.querySelector('.gallery-contours');result.push(Number(rings.style.getPropertyValue('--pulse')));await new Promise(resolve=>setTimeout(resolve,40));}return result;});
  const max=Math.max(...samples),range=max-Math.min(...samples);assert.ok(max>.35&&range>.3,'Real audio should produce visible, varying pulses');
  measurements.push({index,max,range,peaks:samples.filter(x=>x>.65).length});
  if(index===1) await gallery.screenshot({path:path.join(output,'desktop-playing.png')});
  await page.locator('.gallery-play').click();await page.waitForFunction(()=>Number(document.querySelector('.gallery-contours').style.getPropertyValue('--pulse'))===0);
 }
 await page.locator('.gallery-play').click();await page.waitForSelector('.showcase-gallery.is-playing');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>Number(document.querySelector('.gallery-contours').style.getPropertyValue('--pulse'))===0);
 await page.locator('.gallery-play').click();
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile must not overflow horizontally');
 await gallery.screenshot({path:path.join(output,'mobile-paused.png')});
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify({measurements,randomReload:true,reducedMotion:true,mobileNoOverflow:true},null,2));
 console.log('PASS actual Chromium audio pulse variation, random reload, pause/reduced-motion and mobile layout',JSON.stringify(measurements));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
