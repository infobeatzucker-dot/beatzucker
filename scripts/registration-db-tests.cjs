/* Real, isolated SQLite checks. Never uses the configured production database. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','registration-mail-db');
fs.mkdirSync(folder,{recursive:true});
const filename=path.join(folder,`test-${process.pid}-${Date.now()}.sqlite`);
fs.closeSync(fs.openSync(filename,'wx'));
const url='file:'+filename.replaceAll('\\','/');
const legacySchema=path.join(folder,`legacy-${process.pid}-${Date.now()}.prisma`);
fs.writeFileSync(legacySchema,fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8').replace(/^.*registrationNotification RegistrationNotification\?.*\r?\n/m,'').replace(/model RegistrationNotification \{[\s\S]*?\n\}/,''));
const result=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'db','push','--skip-generate','--schema',legacySchema],{cwd:root,env:{...process.env,DATABASE_URL:url},encoding:'utf8',windowsHide:true});
if(result.status!==0){console.error(result.stderr);process.exit(1);}
const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({datasources:{db:{url}}});
(async()=>{
 const old=await db.user.create({data:{email:'existing@example.invalid'}});
 const migration=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'db','push','--skip-generate'],{cwd:root,env:{...process.env,DATABASE_URL:url},encoding:'utf8',windowsHide:true});
 assert.equal(migration.status,0,migration.stderr);assert.equal(await db.registrationNotification.count(),0);assert.ok(await db.user.findUnique({where:{id:old.id}}));console.log('PASS additive migration preserves existing users without notification backfill');
 const user=await db.user.create({data:{email:'new@example.invalid',registrationNotification:{create:{provider:'google'}}}});
 assert.equal((await db.registrationNotification.findUnique({where:{userId:user.id}})).provider,'google');console.log('PASS new account and notification are committed atomically');
 await assert.rejects(db.user.create({data:{email:'invalid@example.invalid',registrationNotification:{create:{}}}}));
 assert.equal(await db.user.findUnique({where:{email:'invalid@example.invalid'}}),null);console.log('PASS failed nested enqueue leaves no partial account');
 await db.user.delete({where:{id:user.id}});assert.equal(await db.registrationNotification.count(),0);assert.ok(await db.user.findUnique({where:{id:old.id}}));console.log('PASS erasure cascades notification without affecting other accounts');
 console.log('4 real SQLite registration checks passed; no mail or production data used.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
