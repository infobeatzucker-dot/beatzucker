const assert=require('node:assert/strict');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Local isolated QA only');
(async()=>{
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({channel:'chrome',headless:true});
 try{const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.addInitScript(()=>localStorage.setItem('beatzucker_cookie_consent','accepted'));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const lang of ['de','en']){
   const base=lang==='en'?'/en/knowledge/':'/ressourcen/';
   for(const slug of ['referenz-mastering-character','ki-mastering-wie-funktioniert-es','song-klingt-leise-spotify','re-beatz-online-mastering-mit-kontrolle']){
     const r=await page.goto('http://127.0.0.1:3013'+base+slug);assert.equal(r.status(),200);assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://beatzucker.de'+base+slug);
   }
   await page.goto('http://127.0.0.1:3013'+(lang==='en'?'/en/features':'/features'));assert.ok(await page.locator('a[href="'+base+'referenz-mastering-character"]').count());
   await page.goto('http://127.0.0.1:3013'+(lang==='en'?'/en/help':'/help'));await page.getByPlaceholder(lang==='en'?'Search the FAQ…':'Suche in den FAQ…').fill('Character');
   const button=page.getByRole('button',{name:lang==='en'?/What does the 3D character dial change/:/Was verändert der 3D-Character-Regler/});await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');
   const id=await button.getAttribute('aria-controls'),answer=page.locator('[id='+JSON.stringify(id)+']');assert.ok(await answer.isVisible());assert.ok(await answer.evaluate(el=>el.scrollHeight<=el.clientHeight+1));await button.click();assert.equal(await answer.isVisible(),false);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 assert.deepEqual(errors,[]);console.log('PASS actual DE/EN knowledge routes, single H1/canonical, workflow links, mobile FAQ search/ARIA and unclipped expandable answers');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
