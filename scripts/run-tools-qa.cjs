/* Local, isolated production-build tool QA. No production DB, upload or mail. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output','tools-audit-20261011','runtime');
fs.mkdirSync(path.join(folder,'uploads','masters'),{recursive:true});
if(!fs.existsSync(path.join(folder,'qa.sqlite')))fs.closeSync(fs.openSync(path.join(folder,'qa.sqlite'),'wx'));
const env={...process.env,NODE_ENV:'production',BEATZUCKER_ISOLATED_QA:'1',NEXTAUTH_SECRET:crypto.randomBytes(32).toString('hex'),PYTHON_SERVICE_SECRET:crypto.randomBytes(32).toString('hex'),NEXTAUTH_URL:'http://127.0.0.1:3013',PYTHON_SERVICE_URL:'http://127.0.0.1:8013',DATABASE_URL:'file:../validation-output/tools-audit-20261011/runtime/qa.sqlite',TEMP_UPLOAD_DIR:path.join(folder,'uploads'),RESEND_API_KEY:'',ADMIN_EMAIL:'',NUMBA_CACHE_DIR:path.join(folder,'numba'),OMP_NUM_THREADS:'1',FFMPEG_BINARY:path.join(root,'validation-output','codec-test-runtime','portable','ffmpeg-9.0.2-essentials_build','bin','ffmpeg.exe')};
const db=spawnSync(process.execPath,[path.join(root,'node_modules','prisma','build','index.js'),'db','push','--skip-generate'],{cwd:root,env,stdio:'inherit',windowsHide:true});
if(db.status!==0)process.exit(db.status||1);
const children=[spawn(path.join(root,'python','venv','Scripts','python.exe'),['-m','uvicorn','main:app','--host','127.0.0.1','--port','8013'],{cwd:path.join(root,'python'),env,stdio:'inherit',windowsHide:true}),spawn(process.execPath,[path.join(root,'node_modules','next','dist','bin','next'),'start','--hostname','127.0.0.1','--port','3013'],{cwd:root,env,stdio:'inherit',windowsHide:true})];
function stop(){for(const child of children)if(!child.killed)child.kill();}
for(const child of children){child.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});child.on('exit',code=>{if(code)process.exitCode=code;stop();});}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
process.on('exit',stop);
console.log('Isolated tool QA: http://127.0.0.1:3013 — only synthetic test audio; no mail.');
