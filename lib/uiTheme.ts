export const UI_THEME_KEY = "beatzucker_ui_theme";
export const UI_THEME_EVENT = "beatzucker-theme-change";
export const UI_THEMES = [
  {id:"original",name:"Original",light:false,bg:"#050816",panel:"#11162c",card:"#1b223d",inset:"#0b1124",text:"#f3f5ff",muted:"#b4bfd6",line:"#424a6b",accent:"#ac8aff",second:"#70d6ff",third:"#e5a3e6",face1:"#defbff",face2:"#a4badd",face3:"#aa8ac8",metal:"#9dafc8",description:{de:"Dunkelblau, Violett und Cyan",en:"Midnight blue, violet and cyan"}},
  {id:"light",name:"Studio Light",light:true,bg:"#edf1f7",panel:"#fcfdff",card:"#e5eaf3",inset:"#dbe3ef",text:"#17213a",muted:"#4d5c75",line:"#b8c5d9",accent:"#6847ba",second:"#126587",third:"#914e85",face1:"#ffffff",face2:"#d7e1ed",face3:"#a6b7d0",metal:"#6a7f9c",description:{de:"Porzellan, Silber und Lavendel",en:"Porcelain, silver and lavender"}},
  {id:"analog",name:"Analog",light:false,bg:"#191510",panel:"#26211b",card:"#393128",inset:"#191813",text:"#f5ead4",muted:"#c4b7a0",line:"#77644c",accent:"#e8ac65",second:"#b9d4bc",third:"#e2be91",face1:"#fff0cc",face2:"#d1bc94",face3:"#968163",metal:"#ad9877",description:{de:"Graphit, Champagner und Kupfer",en:"Graphite, champagne and copper"}},
  {id:"aurora",name:"Aurora",light:false,bg:"#051b22",panel:"#0a2931",card:"#123d45",inset:"#062027",text:"#effffb",muted:"#afcfd1",line:"#46717a",accent:"#72e7c7",second:"#83d8fa",third:"#91cfde",face1:"#edfffa",face2:"#b3ddd8",face3:"#7caab6",metal:"#7ca8ae",description:{de:"Petrol, Eisblau und Mint",en:"Petrol, ice blue and mint"}},
  {id:"sandstone",name:"Sandstone",light:true,bg:"#f2ece2",panel:"#fffaf2",card:"#e8dece",inset:"#e2d7c5",text:"#352b23",muted:"#675344",line:"#bca98e",accent:"#944b33",second:"#336b68",third:"#865c39",face1:"#fff9e8",face2:"#dfcdb1",face3:"#b79c7b",metal:"#a08c72",description:{de:"Elfenbein, Champagner und Terrakotta",en:"Ivory, champagne and terracotta"}},
] as const;
export type UiThemeId = typeof UI_THEMES[number]["id"];
export function isUiTheme(value:unknown):value is UiThemeId{return typeof value==="string"&&UI_THEMES.some(theme=>theme.id===value);}
export function normalizeUiTheme(value:unknown):UiThemeId{return isUiTheme(value)?value:"original";}
export function getUiTheme(value:unknown){return UI_THEMES.find(theme=>theme.id===value)??UI_THEMES[0];}

const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export function colorRgb(hex:string):number[]{const value=hex.replace('#','');return [0,2,4].map(index=>parseInt(value.slice(index,index+2),16));}
const mix=(a:number[],b:number[],amount:number)=>a.map((value,index)=>Math.round(value+(b[index]-value)*clamp(amount)));
/** Maps presentation colors only. Meter warning hues and platform-brand colors retain their identity. */
export function themeRgb(rgb:number[],id:UiThemeId,role="paint"):number[]{
  if(id==="original")return rgb;
  const theme=getUiTheme(id),[r,g,b]=rgb.map(value=>value/255),max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,delta=max-min;
  const saturation=delta===0?0:delta/(1-Math.abs(2*l-1));
  let hue=delta===0?0:max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue=(hue*60+360)%360;
  if(role==="shadow"&&(delta<.12||l<.2))return colorRgb(theme.light?"#544839":"#020509");
  if(l<.24)return mix(colorRgb(theme.panel),colorRgb(theme.card),l/.24);
  if(saturation>.36){
    // Red/yellow/green communicate clipping, warnings and success, not decoration.
    if(hue<165||hue>345)return theme.light?mix(rgb,[0,0,0],.35):rgb;
    const accent=colorRgb(hue<245?theme.second:hue>300?theme.third:theme.accent);
    return mix(accent,colorRgb(theme.light?theme.text:theme.text),theme.light?0:Math.max(0,l-.65)*1.4);
  }
  if(role==="border")return colorRgb(theme.line);
  return mix(colorRgb(theme.muted),colorRgb(theme.text),clamp((l-.4)/.5));
}
export const UI_COLOR_PATTERN=/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)/gi;
export function parseUiColor(value:string):{rgb:number[];alpha:number}|null{
  if(value[0]==="#"){let hex=value.slice(1);if(hex.length===3||hex.length===4)hex=hex.split('').map(letter=>letter+letter).join('');if(hex.length!==6&&hex.length!==8)return null;return {rgb:colorRgb('#'+hex.slice(0,6)),alpha:hex.length===8?parseInt(hex.slice(6),16)/255:1};}
  const values=value.match(/[\d.]+/g)?.map(Number);return values&&values.length>=3?{rgb:values.slice(0,3),alpha:values[3]??1}:null;
}
export function uiColorToken(rgb:number[],role="paint"){return `--bz-${role}-${rgb.map(value=>Math.round(value).toString(16).padStart(2,'0')).join('')}`;}
const colorCache=new Map<string,string>();
/** Canvas APIs cannot resolve CSS variables. Resolve against the same palette without DOM style reads per frame. */
export function uiColor(value:string,requestedTheme?:UiThemeId):string{
  const id=requestedTheme??(typeof document==='undefined'?'original':normalizeUiTheme(document.documentElement.dataset.uiTheme));
  if(id==='original')return value;
  const key=id+':'+value,cached=colorCache.get(key);if(cached)return cached;
  const result=value.replace(UI_COLOR_PATTERN,match=>{const parsed=parseUiColor(match);if(!parsed)return match;const rgb=themeRgb(parsed.rgb,id);return parsed.alpha===1?'#'+rgb.map(number=>number.toString(16).padStart(2,'0')).join(''):`rgba(${rgb.join(',')},${parsed.alpha})`;});
  if(colorCache.size>4096)colorCache.clear();colorCache.set(key,result);return result;
}
export const uiThemeBootstrap = `(()=>{let t="original";try{const v=localStorage.getItem(${JSON.stringify(UI_THEME_KEY)});if(${JSON.stringify(UI_THEMES.map(theme=>theme.id))}.includes(v))t=v}catch{}document.documentElement.dataset.uiTheme=t;document.documentElement.style.colorScheme=["light","sandstone"].includes(t)?"light":"dark"})()`;
