/* Isolated decorative preview: no DSP, production database or email access. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'validation-output','sonic-preview','uploads'),{recursive:true});
const database=path.join(root,'validation-output','sonic-preview','qa.sqlite');
if(!fs.existsSync(database))fs.closeSync(fs.openSync(database,'wx'));
const env={...process.env,NODE_ENV:'development',BEATZUCKER_ISOLATED_QA:'1',NEXTAUTH_SECRET:crypto.randomBytes(32).toString('hex'),PYTHON_SERVICE_SECRET:crypto.randomBytes(32).toString('hex'),NEXTAUTH_URL:'http://127.0.0.1:3014',PYTHON_SERVICE_URL:'http://127.0.0.1:8014',DATABASE_URL:'file:../validation-output/sonic-preview/qa.sqlite',TEMP_UPLOAD_DIR:path.join(root,'validation-output','sonic-preview','uploads'),RESEND_API_KEY:'',ADMIN_EMAIL:''};
const db=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'db','push','--skip-generate'],{cwd:root,env,stdio:'inherit',windowsHide:true});
if(db.status!==0)process.exit(db.status||1);
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3014'],{cwd:root,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill());
process.on('exit',()=>child.kill());
console.log('Design only: http://127.0.0.1:3014/design-preview/mastering');
