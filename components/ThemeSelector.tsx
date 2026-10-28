"use client";
import {Palette,Check} from 'lucide-react';
import {useId} from 'react';
import {useUiTheme} from '@/contexts/UiThemeContext';
import {getUiTheme,UI_THEMES,type UiThemeId} from '@/lib/uiTheme';
import type {Lang} from '@/lib/types/mastering';

export default function ThemeSelector({lang='de',save=false}:{lang?:Lang;save?:boolean}){
 const {theme,chooseTheme,saveTheme,savedTheme,saving,error,loaded}=useUiTheme(),id=useId(),en=lang==='en';
 return <div className={`theme-choice ${save?'with-save':''}`}>
  <label className="theme-picker" htmlFor={id}><Palette size={16} aria-hidden="true"/><span className="sr-only">{en?'Color theme':'Farbschema'}</span><select id={id} value={theme} onChange={event=>chooseTheme(event.target.value as UiThemeId)}>{[false,true].map(light=><optgroup key={String(light)} label={light?(en?'Light':'Hell'):(en?'Dark':'Dunkel')}>{UI_THEMES.filter(item=>item.light===light).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</select></label>
  {save&&<><button type="button" className="theme-save" disabled={saving||!loaded||theme===savedTheme} onClick={()=>void saveTheme()}>{saving?(en?'Saving …':'Speichert …'):theme===savedTheme?<><Check size={13}/>{en?'Saved':'Gespeichert'}</>:en?'Save':'Speichern'}</button>{error&&<span className="theme-feedback" role="alert">{en?'Could not save or load. Please try again.':'Laden oder Speichern fehlgeschlagen. Bitte erneut versuchen.'}</span>}</>}
 </div>;
}
export function ThemeSettings({lang}:{lang:Lang}){
 const {theme,chooseTheme,saveTheme,savedTheme,saving,error,loaded}=useUiTheme(),en=lang==='en';
 return <section className="theme-settings" aria-labelledby="theme-settings-title"><h2 id="theme-settings-title">{en?'Your studio appearance':'Deine Studio-Optik'}</h2><p>{en?'Try a look, then save it to your account for your next login—even on another device. Audio processing stays the same.':'Probiere einen Look aus und speichere ihn für deinen nächsten Login – auch auf anderen Geräten. Die Audiobearbeitung bleibt unverändert.'}</p><div className="theme-options" role="group" aria-label={en?'Color theme':'Farbschema'}>{UI_THEMES.map(item=><button type="button" key={item.id} aria-pressed={theme===item.id} onClick={()=>chooseTheme(item.id)}><span className="theme-sample" style={{background:item.bg,borderColor:item.line}} aria-hidden="true"><i style={{background:item.accent}}/><i style={{background:item.second}}/><i style={{background:item.face2}}/></span><strong>{item.name}</strong><small>{item.description[lang]}</small></button>)}</div><div className="theme-settings-footer"><button type="button" className="theme-save" disabled={saving||!loaded||theme===savedTheme} onClick={()=>void saveTheme()}>{saving?(en?'Saving …':'Speichert …'):theme===savedTheme?(en?'Saved to your account':'Im Konto gespeichert'):(en?'Save color theme':'Farbschema speichern')}</button><span role="status">{error?(en?'Saving/loading failed. Your local preview is still available.':'Laden oder Speichern fehlgeschlagen. Deine lokale Vorschau bleibt verfügbar.'):theme!==savedTheme?(en?'Preview active · not saved to account yet':'Vorschau aktiv · noch nicht im Konto gespeichert'):getUiTheme(theme).description[lang]}</span></div></section>;
}
