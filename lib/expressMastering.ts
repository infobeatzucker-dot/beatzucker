import type {AppState, Platform, Preset, ReferenceInput} from "./types/mastering";

export const EXPRESS_STEPS = [
  {de:"Dein Song",en:"Your song"}, {de:"Dein Ziel",en:"Your goal"},
  {de:"Dein Klang",en:"Your sound"}, {de:"Referenz",en:"Reference"},
  {de:"Los geht’s",en:"Ready to go"}, {de:"Fertig",en:"Finished"},
] as const;

export const EXPRESS_TARGETS: {id:Platform;name:string;de:string;en:string}[] = [
  {id:"spotify",name:"Spotify",de:"Ein guter Ausgangspunkt für Streaming.",en:"A good starting point for streaming."},
  {id:"apple",name:"Apple Music",de:"Für dein Release auf Apple Music.",en:"For your release on Apple Music."},
  {id:"youtube",name:"YouTube",de:"Für Videos und Veröffentlichungen auf YouTube.",en:"For videos and releases on YouTube."},
  {id:"club",name:"Club / DJ",de:"Ein dichteres Lautheitsziel für Club-Tracks.",en:"A denser loudness target for club tracks."},
];
export const EXPRESS_GENRES: {id:Preset;name:string}[] = [
  {id:"auto",name:"Auto"},{id:"pop",name:"Pop"},{id:"electronic",name:"Electronic"},
  {id:"hiphop",name:"Hip-Hop"},{id:"rock",name:"Rock"},{id:"jazz",name:"Jazz"},
  {id:"classical",name:"Classical"},{id:"podcast",name:"Podcast"},{id:"metal",name:"Metal"},
  {id:"rnb",name:"R&B / Soul"},{id:"ambient",name:"Ambient"},{id:"lofi",name:"Lo-Fi"},
  {id:"country",name:"Country"},{id:"trap",name:"Trap"},{id:"latin",name:"Latin"},
  {id:"dance",name:"Dance"},{id:"techno",name:"Techno"},{id:"edm",name:"EDM"},
];
export function expressReferenceCount(value:ReferenceInput|null):number {
  return value ? ("references" in value ? value.references.length : 1) : 0;
}
export function canStartExpress({state,hasFile,hasAnalysis,authenticated,used,limit}:{state:AppState;hasFile:boolean;hasAnalysis:boolean;authenticated:boolean;used:number|null;limit:number}) {
  return authenticated && hasFile && hasAnalysis && (state==="analyzed"||state==="done") && (used===null||used<limit);
}
