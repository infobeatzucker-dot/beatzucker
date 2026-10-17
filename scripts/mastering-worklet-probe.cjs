// Offline numerical probe of the very same module loaded by AudioWorklet.
const fs=require('node:fs');
(async()=>{
 const {MasteringDynamics}=await import('data:text/javascript;base64,'+fs.readFileSync(require('node:path').resolve(__dirname,'../public/audio/mastering-dynamics.js')).toString('base64'));
 const request=JSON.parse(fs.readFileSync(0,'utf8'));
 const dsp=new MasteringDynamics(request.rate,request.mode||'bands');dsp.configure(request.params,true);
 const channels=request.channels.map(channel=>Float32Array.from(channel));
 const output=channels.map(channel=>new Float32Array(channel.length));
 for(let offset=0;offset<output[0].length;offset+=128)dsp.process(channels.map(channel=>channel.subarray(offset,offset+128)),output.map(channel=>channel.subarray(offset,offset+128)));
 process.stdout.write(JSON.stringify(output.map(channel=>Array.from(channel))));
})().catch(error=>{console.error(error);process.exitCode=1;});
