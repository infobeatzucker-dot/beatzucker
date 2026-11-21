import { neutral, type Settings } from "@/components/mastering-lab/settings";

const limits = {
  highpass:[0,200], trim:[-18,12], deessFrequency:[2500,11000], deessThreshold:[-45,-8], deessAmount:[0,100],
  duckDepth:[0,8],duckFrequency:[45,150],duckThreshold:[-50,-12],duckRelease:[50,380],
  width:[0,175],monoBass:[0,100],saturation:[0,100],finalAir:[-6,6],finalFrequency:[5000,16000],
  busThreshold:[-48,0],busRatio:[1,4],drive:[0,12],ceiling:[-6,0],release:[25,350],
} as const;
const within=(x:unknown,a:number,b:number): x is number=>typeof x==="number"&&Number.isFinite(x)&&x>=a&&x<=b;
const record=(x:unknown): x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x);
export function normalizeLabPreset(value: unknown) {
  if (!record(value)||!record(value.settings)) return null;
  const input=value.settings, active=input.active;
  if (!record(active)) return null;
  const modules=Object.keys(neutral.active) as (keyof Settings["active"])[];
  if (modules.some(key=>typeof active[key]!=="boolean")) return null;
  const settings={...neutral,active:Object.fromEntries(modules.map(key=>[key,active[key]])) as Settings["active"]};
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const [min,max]=limits[key], v=input[key];
    if (!within(v,min,max)) return null;
    settings[key]=v;
  }
  for (const [key,min,max] of [["eq",-9,9],["eqFrequency",30,16000],["eqQ",.25,5]] as const) {
    const values=input[key];
    if(!Array.isArray(values)||values.length!==4||!values.every(v=>within(v,min,max)))return null;
    settings[key]=values as number[];
  }
  const bands=input.bands;
  if(!Array.isArray(bands)||bands.length!==4)return null;
  const dynamic=[];
  for(const band of bands){
    if(!record(band)||!within(band.threshold,-48,0)||!within(band.ratio,1,8))return null;
    dynamic.push({threshold:band.threshold,ratio:band.ratio});
  }
  settings.bands=dynamic;
  if(value.target!==null&&!within(value.target,-23,-6))return null;
  return {settings,target:value.target as number|null};
}

export type AccountLabPreset = {id:string;name:string;updatedAt:string;settings:Settings;target:number|null};
