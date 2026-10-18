const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PrismaClient}=require('@prisma/client'),{hashSync}=require('bcryptjs');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),database=path.join(root,'validation-output/stem-http/runtime/qa.sqlite'),out=path.join(root,'validation-output/stem-http/browser');
if(!fs.existsSync(database))throw Error('Requires isolated stem database');fs.mkdirSync(out,{recursive:true});
(async()=>{const db=new PrismaClient({datasources:{db:{url:'file:'+database.replaceAll('\\','/')}}});const email='stem-browser@example.invalid',password='Local-Stem-QA-Only!';
try{await db.user.upsert({where:{email},create:{email,password:hashSync(password,10)},update:{vocalRemoverEnabled:false,stemSeparationEnabled:false}});}finally{await db.$disconnect();}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{const context=await browser.newContext({viewport:{width:1440,height:1100}});const base='http://127.0.0.1:3013';
const csrf=await(await context.request.get(base+'/api/auth/csrf')).json();const response=await context.request.post(base+'/api/auth/callback/credentials',{form:{csrfToken:csrf.csrfToken,email,password,json:'true',callbackUrl:base+'/tools/vocal-remover'}});assert.ok(!(await response.json()).url.includes('error'));
const page=await context.newPage();await page.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||u.protocol==='data:'?route.continue():route.abort()});
await page.goto(base+'/tools/vocal-remover');const consent=page.getByRole('button',{name:'Verstanden',exact:true});await consent.waitFor();await consent.click();
await page.getByRole('button',{name:'20 Sekunden testen',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Ganzen Track trennen',exact:true}).isDisabled());
await page.locator('input[type=file]').setInputFiles({name:'local-visual-fixture.wav',mimeType:'audio/wav',buffer:Buffer.from('RIFF-local-visual-only')});assert.ok(await page.getByRole('button',{name:'20 Sekunden testen',exact:true}).isEnabled());assert.ok(await page.getByRole('button',{name:'Ganzen Track trennen',exact:true}).isDisabled());
await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
await page.getByRole('main').getByRole('link',{name:'English',exact:true}).click();await page.getByRole('button',{name:'Try 20 seconds',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Separate full track',exact:true}).isDisabled());
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
console.log('PASS actual authenticated browser: DE/EN controls, independent full-access lock, mobile layout without horizontal overflow');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
