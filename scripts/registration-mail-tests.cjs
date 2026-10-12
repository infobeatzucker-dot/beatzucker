const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks,env={}){
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {module,exports:module.exports,require:key=>{if(!(key in mocks))throw Error(key);return mocks[key];},Date,Error,Math,console:{warn:()=>{},error:()=>{}},process:{env},setInterval,clearInterval});
  return module.exports;
}
let passed=0,calls=[],rejectMail=false;
const env={ADMIN_EMAIL:'admin@example.invalid',RESEND_API_KEY:'synthetic-no-network',NEXTAUTH_URL:'https://example.invalid'};
class MockResend {
 emails={send:async(input,options)=>{
  calls.push({input,options});
  return rejectMail?{error:{message:'provider rejected'}}:{data:{id:'test-id'}};
 }};
}
const email=load('lib/email.ts',{'resend':{Resend:MockResend},'@/lib/constants':{DONATE_URL:'https://example.invalid/support',DOWNLOAD_WINDOW_MS:86400000}},env);
let row,sendCalls=0,fail=false;
const store={
  async updateMany({where,data}){
    if(!row||row.userId!==where.userId||row.sentAt)return{count:0};
    if(where.nextAttemptAt&&(row.nextAttemptAt>Date.now()||row.lockedUntil>Date.now()))return{count:0};
    for(const[key,value]of Object.entries(data))row[key]=key==='attempts'?row.attempts+value.increment:value;
    return{count:1};
  },
  async findUnique(){return row?{...row}:null;},async deleteMany(){return{count:0};},
  async findMany(){return row&&!row.sentAt&&row.nextAttemptAt<=Date.now()? [{userId:row.userId}]:[];},
};
const queue=load('lib/registrationQueue.ts',{'@/lib/db':{db:{registrationNotification:store}},'@/lib/email':{sendNewRegistrationAdminEmail:async()=>{sendCalls++;if(fail)throw Error('private provider payload');}}},env);
function reset(){row={userId:'new-user',provider:'google',attempts:0,nextAttemptAt:new Date(0),lockedUntil:null,sentAt:null,user:{email:'new@example.invalid',name:'New User',createdAt:new Date('2026-10-12T08:00:00Z')}};sendCalls=0;fail=false;calls=[];rejectMail=false;}
async function test(name,fn){reset();await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('admin mail uses configured recipient, stable sender, Berlin date and escaped name',async()=>{
  await email.sendNewRegistrationAdminEmail({userId:'test',...row.user,name:'<img onerror="bad">',provider:'google'});
  assert.equal(calls[0].input.to,'admin@example.invalid');assert.equal(calls[0].input.from,'noreplay@beatzucker.de');
  assert.match(calls[0].input.html,/&lt;img/);assert.doesNotMatch(calls[0].input.html,/<img/);
  assert.match(calls[0].input.text,/Google/);assert.match(calls[0].input.text,/10:00/);
  assert.equal(calls[0].options.idempotencyKey,'registration-test-admin');
 });
 await test('password registration description contains no credentials or tokens',async()=>{
  await email.sendNewRegistrationAdminEmail({userId:'test',...row.user,provider:'credentials'});
  assert.match(calls[0].input.text,/E-Mail und Passwort/);assert.doesNotMatch(calls[0].input.text,/hash|token|synthetic-no-network/);
 });
 await test('missing admin address never falls back to an unintended recipient',async()=>{
  delete env.ADMIN_EMAIL;try{await assert.rejects(email.sendNewRegistrationAdminEmail({userId:'test',...row.user,provider:'google'}));assert.equal(calls.length,0);}finally{env.ADMIN_EMAIL='admin@example.invalid';}
 });
 await test('provider error is a delivery failure',async()=>{rejectMail=true;await assert.rejects(email.sendNewRegistrationAdminEmail({userId:'test',...row.user,provider:'google'}));});
 await test('successful delivery is recorded and is not sent again',async()=>{await queue.deliverRegistration(row.userId);await queue.deliverRegistration(row.userId);assert.equal(sendCalls,1);assert.ok(row.sentAt);});
 await test('concurrent queue workers claim a notification only once',async()=>{await Promise.all([queue.deliverRegistration(row.userId),queue.deliverRegistration(row.userId)]);assert.equal(sendCalls,1);});
 await test('mail outage keeps work queued with backoff instead of rejecting registration',async()=>{
  fail=true;await queue.deliverRegistration(row.userId);assert.equal(row.sentAt,null);assert.equal(row.attempts,1);assert.equal(row.lockedUntil,null);assert.ok(row.nextAttemptAt>Date.now());
  row.nextAttemptAt=new Date(0);fail=false;await queue.deliverRegistration(row.userId);assert.ok(row.sentAt);assert.equal(sendCalls,2);
 });
 await test('expired lease recovers after restart',async()=>{row.lockedUntil=new Date(0);await queue.deliverRegistration(row.userId);assert.equal(sendCalls,1);});
 await test('erased account produces no notification',async()=>{row=null;await queue.deliverRegistration('deleted');assert.equal(sendCalls,0);});
 await test('isolated QA and builds never sweep real mail',async()=>{env.BEATZUCKER_ISOLATED_QA='1';await queue.sweepRegistrationQueue();delete env.BEATZUCKER_ISOLATED_QA;env.NEXT_PHASE='phase-production-build';await queue.sweepRegistrationQueue();delete env.NEXT_PHASE;assert.equal(sendCalls,0);});
 console.log(`${passed} registration mail checks passed; no real mail sent.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
