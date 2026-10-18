// Disposable local QA only; no real accounts, mail, or production storage.
const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process'),crypto=require('node:crypto');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated QA flag');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'validation-output/stem-http/runtime');
fs.mkdirSync(folder,{recursive:true});
if(!fs.existsSync(path.join(folder,'qa.sqlite')))fs.closeSync(fs.openSync(path.join(folder,'qa.sqlite'),'wx'));
const env={...process.env,NODE_ENV:'production',PYTHON_SERVICE_SECRET:crypto.randomBytes(32).toString('hex'),PYTHON_SERVICE_URL:'http://127.0.0.1:8013',NEXTAUTH_URL:'http://127.0.0.1:3013',NEXTAUTH_SECRET:crypto.randomBytes(32).toString('hex'),DATABASE_URL:'file:../validation-output/stem-http/runtime/qa.sqlite',TEMP_UPLOAD_DIR:path.join(folder,'uploads'),RESEND_API_KEY:'',ADMIN_EMAIL:'stem-admin@example.invalid',STEM_TOOLS_ENABLED:'true',STEM_WORKER_URL:'http://127.0.0.1:8023',STEM_WORKER_SECRET:crypto.randomBytes(32).toString('hex'),STEM_DATA_DIR:path.join(folder,'worker'),HF_HOME:path.join(root,'validation-output/stem-benchmark-20261018/model-cache'),HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1',PATH:path.join(root,'validation-output/codec-test-runtime/portable/ffmpeg-9.0.2-essentials_build/bin')+path.delimiter+process.env.PATH};
const schema=spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--skip-generate'],{cwd:root,env,stdio:'inherit',windowsHide:true});if(schema.status!==0)process.exit(1);
const children=[spawn(path.join(root,'validation-output/stem-benchmark-20261018/venv/Scripts/python.exe'),['-m','uvicorn','service:app','--host','127.0.0.1','--port','8023'],{cwd:path.join(root,'stem-worker'),env,stdio:'inherit',windowsHide:true}),spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3013'],{cwd:root,env,stdio:'inherit',windowsHide:true})];
function stop(){for(const child of children)if(!child.killed){if(process.platform==='win32'&&child.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill();}}
for(const child of children){child.on('error',error=>{console.error(error.message);stop();process.exitCode=1});child.on('exit',()=>stop());}
process.on('exit',stop);process.on('SIGINT',stop);process.on('SIGTERM',stop);
console.log('Isolated stem QA at http://127.0.0.1:3013; private worker on 8023; no mail.');
