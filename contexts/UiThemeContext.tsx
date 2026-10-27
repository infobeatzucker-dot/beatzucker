"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useSession} from 'next-auth/react';
import {getUiTheme,isUiTheme,normalizeUiTheme,UI_THEME_EVENT,UI_THEME_KEY,type UiThemeId} from '@/lib/uiTheme';

type ThemeContext={theme:UiThemeId;chooseTheme:(theme:UiThemeId)=>void;saveTheme:()=>Promise<void>;savedTheme:UiThemeId|null;saving:boolean;error:boolean;loaded:boolean};
const Context=createContext<ThemeContext|null>(null);
export function UiThemeProvider({children}:{children:ReactNode}){
 const {data:session,status}=useSession(),[theme,setTheme]=useState<UiThemeId>('original'),[savedTheme,setSavedTheme]=useState<UiThemeId|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(false),[loaded,setLoaded]=useState(false),revision=useRef(0),identity=useRef<string|null>(null);
 const userId=session?.user?.id??null;identity.current=userId;
 function apply(value:UiThemeId){document.documentElement.dataset.uiTheme=value;document.documentElement.style.colorScheme=getUiTheme(value).light?'light':'dark';try{localStorage.setItem(UI_THEME_KEY,value);}catch{}setTheme(value);window.dispatchEvent(new Event(UI_THEME_EVENT));}
 useEffect(()=>{setTheme(normalizeUiTheme(document.documentElement.dataset.uiTheme));const sync=(event:StorageEvent)=>{if(event.key===UI_THEME_KEY){revision.current++;apply(normalizeUiTheme(event.newValue));}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{setSavedTheme(null);setError(false);setLoaded(status!=='loading');if(status!=='authenticated'||!userId)return;setLoaded(false);const controller=new AbortController(),at=revision.current;
  fetch('/api/account/theme',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(controller.signal.aborted)return;if(isUiTheme(data.theme)){setSavedTheme(data.theme);if(revision.current===at)apply(data.theme);}setLoaded(true);}).catch(()=>{if(!controller.signal.aborted){setLoaded(true);setError(true);}});return()=>controller.abort();
 },[status,userId]);
 function chooseTheme(value:UiThemeId){if(!isUiTheme(value))return;revision.current++;setError(false);apply(value);}
 async function saveTheme(){if(saving||status!=='authenticated'||!userId)return;const selected=theme,owner=userId;setSaving(true);setError(false);try{const response=await fetch('/api/account/theme',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme:selected})});if(!response.ok)throw Error();if(identity.current===owner)setSavedTheme(selected);}catch{if(identity.current===owner)setError(true);}finally{setSaving(false);}}
 return <Context.Provider value={{theme,chooseTheme,saveTheme,savedTheme,saving,error,loaded}}>{children}</Context.Provider>;
}
export function useUiTheme(){const context=useContext(Context);if(!context)throw Error('UiThemeProvider required');return context;}
