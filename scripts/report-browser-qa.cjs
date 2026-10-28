/* Local-only native new-tab POST and printable PDF; synthetic report, no account or mail. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Isolated QA only');
const base='http://127.0.0.1:3013',out=path.resolve('validation-output/report-1.7.1');fs.mkdirSync(out,{recursive:true});
(async()=>{const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({channel:'chrome',headless:true});try{const context=await browser.newContext();await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());const page=await context.newPage();await page.goto(base);const errors=[];page.on('pageerror',e=>errors.push(e.message));const source=ts.transpileModule(fs.readFileSync('lib/openMasteringReport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;await page.addScriptTag({content:'(()=>{const exports={};'+source+';window.openReportQA=exports.openMasteringReport;})();'});
 for(const lang of ['de','en']){
  await page.evaluate(()=>{localStorage.setItem('beatzucker_cookie_consent','accepted');});
  await page.evaluate(lang=>{
   const button=document.createElement('button');button.id='qa-report-button';button.textContent='Report QA';button.style.cssText='position:fixed;top:10px;left:10px;z-index:2147483647';
   button.onclick=()=>window.openReportQA({filename:'Über Nacht.wav',lang,pre:{integrated_lufs:-20,duration_seconds:180,channels:2,sample_rate:48000,bit_depth:24},post:{integrated_lufs:-9,true_peak:-1},notes:'Umfangreicher synthetischer Bericht. '.repeat(1000),params:{target_lufs:-9,presence_gain:1.5},manualOverrides:{presence_gain:1.5},availableFormats:['wav24','mp3320']});
   document.body.appendChild(button);
  },lang);
  // The initial request belongs to the new tab, not to the opener page.
  const [request,popup]=await Promise.all([
   context.waitForEvent('request',r=>r.url()===base+'/api/report'),
   context.waitForEvent('page'),
   page.locator('#qa-report-button').click(),
  ]);
  await popup.waitForLoadState('load');assert.equal(request.method(),'POST');assert.equal(popup.url(),base+'/api/report');assert.equal((await request.response()).status(),200);assert.equal(await popup.evaluate(()=>opener===null),true);
  assert.ok((await popup.locator('h1').innerText()).includes(lang==='de'?'Master für':'Master for'));
  assert.ok((await popup.locator('body').innerText()).includes('MP3 320 kbps'));assert.equal(await popup.locator('.manual-badge').innerText(),lang==='de'?'MANUELL':'MANUAL');
  await popup.pdf({path:path.join(out,'report-'+lang+'.pdf'),format:'A4',printBackground:true});assert.equal(fs.readFileSync(path.join(out,'report-'+lang+'.pdf')).subarray(0,4).toString(),'%PDF');
  await popup.screenshot({path:path.join(out,'report-'+lang+'.png'),fullPage:true});await popup.close();await page.locator('#qa-report-button').evaluate(el=>el.remove());
 }
 assert.deepEqual(errors,[]);console.log('PASS Chrome native POST opens short same-origin report URL without opener; large Unicode DE/EN reports, manual values and actual printable PDF files');
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
