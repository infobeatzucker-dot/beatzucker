export type VocalParams={hpf:number;deess:number;comp:number;presence:number;air:number;output:number};
export const VOCAL_DEFAULT:VocalParams={hpf:80,deess:55,comp:45,presence:1.5,air:1,output:0};
export const VOCAL_PRESETS:Record<string,VocalParams>={Clean:VOCAL_DEFAULT,Warm:{hpf:70,deess:45,comp:55,presence:.5,air:-1,output:-.5},Airy:{hpf:95,deess:60,comp:38,presence:2,air:3,output:-1},Aggressive:{hpf:100,deess:70,comp:78,presence:3,air:1.5,output:-2},Podcast:{hpf:90,deess:65,comp:68,presence:2.5,air:.5,output:-1}};
export type VocalGraph={apply:(p:VocalParams,immediate?:boolean)=>void;dispose:()=>void;meter:AnalyserNode};
export async function buildVocalGraph(context:BaseAudioContext,source:AudioNode,p:VocalParams,channels:number):Promise<VocalGraph> {
  if(!context.audioWorklet)throw Error("WORKLET");
  await context.audioWorklet.addModule("/audio/vocal-dynamics.js?v=0.11.0");
  const hpf=context.createBiquadFilter(),dynamics=new AudioWorkletNode(context,"beatzucker-vocal-dynamics",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[channels]}),presence=context.createBiquadFilter(),air=context.createBiquadFilter(),output=context.createGain(),meter=context.createAnalyser();
  hpf.type="highpass";hpf.Q.value=.7;presence.type="peaking";presence.frequency.value=3200;presence.Q.value=.75;air.type="highshelf";air.frequency.value=11000;meter.fftSize=2048;
  source.connect(hpf).connect(dynamics).connect(presence).connect(air).connect(output).connect(meter).connect(context.destination);
  function apply(params:VocalParams,immediate=false) {
    const changes:[[AudioParam|undefined,number],...Array<[AudioParam|undefined,number]>]=[[hpf.frequency,params.hpf],[dynamics.parameters.get("deess"),params.deess],[dynamics.parameters.get("comp"),params.comp],[presence.gain,params.presence],[air.gain,params.air],[output.gain,Math.pow(10,params.output/20)]];
    for(const [parameter,value] of changes)if(parameter){parameter.cancelScheduledValues(context.currentTime);if(immediate)parameter.setValueAtTime(value,context.currentTime);else parameter.setTargetAtTime(value,context.currentTime,.015);}
  }
  apply(p,true);
  return {apply,meter,dispose(){source.disconnect();for(const node of [hpf,dynamics,presence,air,output,meter])node.disconnect();dynamics.port.close();}};
}
